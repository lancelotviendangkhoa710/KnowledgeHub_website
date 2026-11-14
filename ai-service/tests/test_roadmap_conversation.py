import json
import unittest
from unittest.mock import patch

import httpx
from fastapi import HTTPException

from app import main, resources


def provider_response(content):
    return {"model": "deepseek-flash", "choices": [{"message": {"content": json.dumps(content)}}]}


class FakeProviderClient:
    response = provider_response({})
    last_request = None

    def __init__(self, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass

    async def post(self, url, headers, json):
        type(self).last_request = json
        return httpx.Response(200, json=type(self).response, request=httpx.Request("POST", url))


PROFILE = {
    "goal": "Become a data engineer", "level": "beginner", "weeks": 12,
    "hours_per_week": 8, "constraints": [], "skills": ["SQL", "Python"],
}


class ConversationRoadmapTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.env = patch.dict("os.environ", {"AI_SERVICE_TOKEN": "internal", "DEEPSEEK_API_KEY": "provider"})
        self.env.start()
        self.client = patch.object(main.httpx, "AsyncClient", FakeProviderClient)
        self.client.start()

    def tearDown(self):
        self.client.stop()
        self.env.stop()

    async def test_intent_asks_for_explicit_missing_details(self):
        FakeProviderClient.response = provider_response({
            "status": "needs_input", "missing_fields": ["weeks", "hours_per_week"],
            "question": "How many weeks and hours per week can you study?", "profile": None,
        })
        result = await main.roadmap_intent(main.RoadmapIntentInput(messages=[
            {"role": "user", "content": "I want to become a data engineer."},
        ]), "internal")
        self.assertEqual("needs_input", result["status"])
        self.assertEqual(["weeks", "hours_per_week"], result["missing_fields"])
        self.assertIn("untrusted", FakeProviderClient.last_request["messages"][0]["content"].lower())
        self.assertIn("data engineer", FakeProviderClient.last_request["messages"][1]["content"])

    async def test_intent_rejects_fabricated_or_incomplete_profile_shape(self):
        FakeProviderClient.response = provider_response({
            "status": "ready", "missing_fields": [], "question": None,
            "profile": {**PROFILE, "hours_per_week": 0},
        })
        with self.assertRaises(HTTPException) as error:
            await main.roadmap_intent(main.RoadmapIntentInput(messages=[
                {"role": "user", "content": "Study SQL"},
            ]), "internal")
        self.assertEqual(502, error.exception.status_code)

    async def test_compose_accepts_only_supplied_skills_and_no_urls(self):
        valid = {
            "title": "Data engineer path", "summary": "A practical sequence.",
            "items": [{"title": f"Step {n}", "description": "Practice SQL", "stage_title": "Foundations", "skills": ["SQL"]}
                      for n in range(4)],
        }
        FakeProviderClient.response = provider_response(valid)
        data = main.RoadmapComposeInput(profile=PROFILE, skills=["SQL", "Python"])
        result = await main.roadmap_compose(data, "internal")
        self.assertEqual(4, len(result["items"]))

        FakeProviderClient.response = provider_response({
            **valid, "items": [{**item, "skills": ["Invented"]} for item in valid["items"]],
        })
        with self.assertRaises(HTTPException) as error:
            await main.roadmap_compose(data, "internal")
        self.assertEqual(502, error.exception.status_code)

        FakeProviderClient.response = provider_response({
            **valid, "items": [{**item, "description": "See https://invented.example/"} for item in valid["items"]],
        })
        with self.assertRaises(HTTPException):
            await main.roadmap_compose(data, "internal")

    async def test_private_service_token_applies_to_resource_search(self):
        with self.assertRaises(HTTPException) as error:
            await main.resource_search(main.ResourceSearchInput(skills=["SQL"]), "wrong")
        self.assertEqual(401, error.exception.status_code)


SITEMAP = b'''<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://docs.python.org/3/tutorial/sql.html</loc></url>
<url><loc>https://evil.example/secret</loc></url></urlset>'''


class ExternalResourceTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        resources._sitemap_cache.clear()
        self.sites = patch.dict(resources.TRUSTED_SITEMAPS, {
            "docs.python.org": "https://docs.python.org/sitemap.xml",
        }, clear=True)
        self.sites.start()

    def tearDown(self):
        self.sites.stop()
        resources._sitemap_cache.clear()

    async def test_sitemap_url_must_be_reachable_and_match_page_topic(self):
        requests = []

        def handler(request):
            requests.append(str(request.url))
            if request.url.path == "/sitemap.xml":
                return httpx.Response(200, content=SITEMAP, headers={"content-type": "application/xml"})
            if request.url.path == "/3/tutorial/sql.html":
                return httpx.Response(200, text="<html><title>SQL tutorial</title><h1>SQL tutorial</h1></html>",
                                      headers={"content-type": "text/html"})
            return httpx.Response(404)

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            result = await resources.search_resources(["SQL"], client)
        self.assertEqual("ok", result["retrieval_status"])
        self.assertEqual(1, len(result["resources"]))
        self.assertEqual("https://docs.python.org/3/tutorial/sql.html", result["resources"][0]["url"])
        self.assertNotIn("https://evil.example/secret", requests)

    async def test_redirect_to_untrusted_host_is_rejected(self):
        def handler(request):
            if request.url.path == "/sitemap.xml":
                return httpx.Response(200, content=SITEMAP)
            return httpx.Response(302, headers={"location": "https://evil.example/steal"})

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            result = await resources.search_resources(["SQL"], client)
        self.assertEqual([], result["resources"])

    async def test_unavailable_sitemap_returns_empty_explicit_status(self):
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda request: httpx.Response(503))) as client:
            result = await resources.search_resources(["SQL"], client)
        self.assertEqual({"resources": [], "retrieval_status": "unavailable"}, result)


if __name__ == "__main__":
    unittest.main()
