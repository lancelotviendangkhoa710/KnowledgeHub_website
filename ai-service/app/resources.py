"""Bounded retrieval of verifiable pages from official documentation sitemaps."""

import asyncio
import gzip
import io
import logging
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import unquote, urljoin, urlsplit

import httpx

logger = logging.getLogger("knowledgehub.ai")

# These are published sitemap URLs, not model-generated links. Only pages found
# in one of these sitemaps and fetched successfully can enter a roadmap.
TRUSTED_SITEMAPS = {
    "docs.python.org": "https://docs.python.org/sitemap.xml",
    "developer.mozilla.org": "https://developer.mozilla.org/sitemap.xml",
    "www.postgresql.org": "https://www.postgresql.org/sitemap.xml",
    "learn.microsoft.com": "https://learn.microsoft.com/_sitemaps/sitemapindex.xml",
    "docs.aws.amazon.com": "https://docs.aws.amazon.com/sitemap_index.xml",
    "cloud.google.com": "https://cloud.google.com/sitemap.xml",
    "kubernetes.io": "https://kubernetes.io/sitemap.xml",
    "pytorch.org": "https://pytorch.org/sitemap_index.xml",
}

MAX_SITEMAP_BYTES = 5_000_000
MAX_PAGE_BYTES = 160_000
MAX_SITEMAP_CHILDREN = 3
MAX_URLS_PER_SITE = 6_000
MAX_RESOURCE_PAGES = 24
SITEMAP_CACHE_SECONDS = 900
_sitemap_cache: dict[str, tuple[float, list[str]]] = {}


def trusted_url(url: str, host: str) -> bool:
    """Reject non-HTTPS, cross-host, credentials and nonstandard-port targets."""
    try:
        parts = urlsplit(url)
    except ValueError:
        return False
    try:
        return (
            parts.scheme == "https"
            and parts.hostname == host
            and parts.username is None
            and parts.password is None
            and parts.port in (None, 443)
            and not parts.fragment
        )
    except ValueError:
        return False


async def _fetch(client: httpx.AsyncClient, url: str, host: str, limit: int) -> tuple[bytes, str] | None:
    """Fetch a bounded trusted response while validating every redirect target."""
    for _ in range(3):
        if not trusted_url(url, host):
            return None
        try:
            async with client.stream("GET", url, follow_redirects=False) as response:
                if response.status_code in (301, 302, 303, 307, 308):
                    location = response.headers.get("location")
                    if not location:
                        return None
                    url = urljoin(url, location)
                    continue
                if response.status_code != 200:
                    return None
                content_type = response.headers.get("content-type", "").lower()
                chunks = bytearray()
                async for chunk in response.aiter_bytes():
                    chunks.extend(chunk)
                    if len(chunks) > limit:
                        return None
                return bytes(chunks), content_type
        except (httpx.HTTPError, ValueError):
            return None
    return None


def _xml_locations(data: bytes, url: str) -> tuple[bool, list[str]]:
    """Parse sitemap URL sets or indexes with a hard decompressed-size limit."""
    if url.endswith(".gz"):
        try:
            with gzip.GzipFile(fileobj=io.BytesIO(data)) as stream:
                data = stream.read(MAX_SITEMAP_BYTES + 1)
        except OSError:
            return False, []
        if len(data) > MAX_SITEMAP_BYTES:
            return False, []
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        return False, []
    kind = root.tag.rsplit("}", 1)[-1]
    if kind not in ("urlset", "sitemapindex"):
        return False, []
    urls = []
    for node in root:
        for child in node:
            if child.tag.rsplit("}", 1)[-1] == "loc" and child.text:
                urls.append(child.text.strip())
                break
    return kind == "sitemapindex", urls


async def _site_urls(client: httpx.AsyncClient, host: str, sitemap: str) -> list[str]:
    cached = _sitemap_cache.get(host)
    if cached and cached[0] > time.monotonic():
        return cached[1]
    fetched = await _fetch(client, sitemap, host, MAX_SITEMAP_BYTES)
    if fetched is None:
        return []
    is_index, locations = _xml_locations(fetched[0], sitemap)
    if is_index:
        children = [url for url in locations if trusted_url(url, host)]
        # Prefer documentation / English sitemaps when the index is large.
        children.sort(key=lambda url: ("en" not in url.casefold(), "docs" not in url.casefold(), url))
        urls = []
        for child in children[:MAX_SITEMAP_CHILDREN]:
            fetched_child = await _fetch(client, child, host, MAX_SITEMAP_BYTES)
            if fetched_child is None:
                continue
            nested_index, child_urls = _xml_locations(fetched_child[0], child)
            if not nested_index:
                urls.extend(child_urls)
            if len(urls) >= MAX_URLS_PER_SITE:
                break
    else:
        urls = locations
    urls = list(dict.fromkeys(url for url in urls if trusted_url(url, host)))[:MAX_URLS_PER_SITE]
    if urls:
        _sitemap_cache[host] = (time.monotonic() + SITEMAP_CACHE_SECONDS, urls)
    return urls


def _tokens(value: str) -> list[str]:
    return [token for token in re.findall(r"[\w+#]+", value.casefold()) if len(token) > 1]


def _preferred_hosts(skills: list[str]) -> list[str]:
    """Search domain experts first, keeping broad requests within four sites."""
    mapping = (
        ("python", "docs.python.org"),
        ("sql", "www.postgresql.org"),
        ("postgres", "www.postgresql.org"),
        ("html", "developer.mozilla.org"),
        ("css", "developer.mozilla.org"),
        ("javascript", "developer.mozilla.org"),
        ("web", "developer.mozilla.org"),
        ("kubernetes", "kubernetes.io"),
        ("pytorch", "pytorch.org"),
        ("torch", "pytorch.org"),
        ("aws", "docs.aws.amazon.com"),
        ("azure", "learn.microsoft.com"),
        ("microsoft", "learn.microsoft.com"),
        ("gcp", "cloud.google.com"),
        ("google", "cloud.google.com"),
    )
    preferred = []
    for skill in skills:
        tokens = set(_tokens(skill))
        for term, host in mapping:
            if term in tokens and host in TRUSTED_SITEMAPS and host not in preferred:
                preferred.append(host)
    if preferred:
        return preferred[:4]
    return [host for host in (
        "developer.mozilla.org", "learn.microsoft.com", "docs.python.org", "cloud.google.com",
    ) if host in TRUSTED_SITEMAPS]


def _path_score(skill: str, url: str, host: str) -> float:
    tokens = _tokens(skill)
    if not tokens:
        return 0.0
    path = unquote(urlsplit(url).path).casefold()
    path_tokens = set(_tokens(path))
    matches = sum(token in path_tokens for token in tokens)
    score = matches / len(tokens)
    if score == 0 and any(token in host for token in tokens):
        score = 0.25
    if score and any(part in path for part in ("tutorial", "guide", "learn")):
        score += 0.1
    return score


class _PageMetadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_title = False
        self.in_h1 = False
        self.title = ""
        self.heading = ""
        self.description = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]):
        if tag == "title":
            self.in_title = True
        elif tag == "h1":
            self.in_h1 = True
        elif tag == "meta":
            values = dict(attrs)
            if (values.get("name") or "").casefold() == "description":
                self.description = (values.get("content") or "")[:500]

    def handle_endtag(self, tag: str):
        if tag == "title":
            self.in_title = False
        elif tag == "h1":
            self.in_h1 = False

    def handle_data(self, value: str):
        if self.in_title:
            self.title += value
        if self.in_h1:
            self.heading += value


async def search_resources(skills: list[str], client: httpx.AsyncClient) -> dict:
    """Find and verify at most one real documentation page for each skill."""
    selected_hosts = _preferred_hosts(skills)
    site_results = await asyncio.gather(*(
        _site_urls(client, host, TRUSTED_SITEMAPS[host]) for host in selected_hosts
    ))
    sites = list(zip(selected_hosts, site_results))
    ranked_by_skill: list[tuple[str, list[tuple[float, str, str]]]] = []
    for skill in skills:
        ranked = []
        for host, urls in sites:
            ranked.extend(((_path_score(skill, url, host), url, host) for url in urls))
        ranked = [row for row in ranked if row[0] >= 0.25]
        ranked.sort(key=lambda row: (-row[0], len(row[1]), row[1]))
        ranked_by_skill.append((skill, ranked[:3]))
    candidates: list[tuple[str, str, str]] = []
    for rank in range(3):
        for skill, ranked in ranked_by_skill:
            if rank < len(ranked):
                _, url, host = ranked[rank]
                candidates.append((skill, url, host))
                if len(candidates) == MAX_RESOURCE_PAGES:
                    break
        if len(candidates) == MAX_RESOURCE_PAGES:
            break

    semaphore = asyncio.Semaphore(4)

    async def verify(skill: str, url: str, host: str) -> dict[str, str] | None:
        async with semaphore:
            page = await _fetch(client, url, host, MAX_PAGE_BYTES)
        if page is None or "html" not in page[1]:
            return None
        metadata = _PageMetadata()
        try:
            metadata.feed(page[0].decode("utf-8", errors="replace"))
        except ValueError:
            return None
        title = (metadata.heading or metadata.title).strip()[:255]
        searchable = " ".join((title, metadata.description, unquote(urlsplit(url).path)))
        tokens = _tokens(skill)
        searchable_tokens = set(_tokens(searchable))
        if not title or not tokens or not all(token in searchable_tokens for token in tokens):
            return None
        return {
            "skill": skill,
            "title": title,
            "url": url,
            "topic": skill,
            "reason": f"Official documentation directly covering {skill}.",
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }

    verified = await asyncio.gather(*(verify(*candidate) for candidate in candidates))
    result = []
    seen_skills = set()
    for candidate in verified:
        if candidate and candidate["skill"].casefold() not in seen_skills:
            result.append(candidate)
            seen_skills.add(candidate["skill"].casefold())
    available = any(site_results)
    logger.info("external_resource_lookup skills=%s verified=%s available=%s", len(skills), len(result), available)
    return {"resources": result, "retrieval_status": "ok" if available else "unavailable"}
