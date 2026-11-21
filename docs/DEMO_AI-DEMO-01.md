# AI-DEMO-01 Seminar Runbook

The seminar UI is available at `http://localhost:3000/seminar-demo` and compares:

- **AI-DEMO-01A**: PDF loader, recursive text splitter, deterministic keyword retrieval, grounded answer.
- **AI-DEMO-01B**: private saved CV, recursive text splitter, multilingual E5 embeddings, owner-scoped exact pgvector retrieval, grounded answer with citations.

## Private local configuration

Set these values in the uncommitted `backend/.env` file. Never paste or commit the real key.

```dotenv
DEEPSEEK_API_KEY=<real-key>
AI_SERVICE_TOKEN=<private-random-token>
AI_CHAT_ENABLED=true
AI_CV_RAG_ENABLED=true
AI_CV_RAG_SIMILARITY_THRESHOLD=0.72
```

Start the stack:

```powershell
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 ai-service app frontend
```

The first CV index request downloads and warms the pinned E5 model. Wait for the CV index badge on `/seminar-demo` to change from `pending` to `ready`. The hourly retry command repairs `failed` indexes; for a local demo it can be invoked safely without resetting data:

```powershell
docker compose exec app php artisan ai:retry-cv-indexes
```

## Seminar preparation

1. Sign in through `/login`.
2. Upload and explicitly save your own CV through `/ai/cv-assessment`.
3. Open `/seminar-demo`, select **Full Mini-RAG**, and refresh the status until the index is `ready`.
4. Do not show personal contact details while screen sharing. Use a redacted copy of your CV if needed.

No sample CV is generated or committed. The following optional fixtures exercise error handling only and should live outside the repository:

```powershell
$fixtureDir = Join-Path $env:TEMP 'knowledgehub-seminar-fixtures'
New-Item -ItemType Directory -Force -Path $fixtureDir | Out-Null

docker compose run --rm --no-deps -v "${fixtureDir}:/out" ai-service python -c "from pypdf import PdfWriter; w=PdfWriter(); w.add_blank_page(100,100); w.write('/out/scan-no-text.pdf')"
docker compose run --rm --no-deps -v "${fixtureDir}:/out" ai-service python -c "from pypdf import PdfWriter; w=PdfWriter(); [w.add_blank_page(100,100) for _ in range(31)]; w.write('/out/31-pages.pdf')"
Copy-Item (Join-Path $fixtureDir 'scan-no-text.pdf') (Join-Path $fixtureDir 'too-large.pdf')
$stream = [System.IO.File]::Open((Join-Path $fixtureDir 'too-large.pdf'), 'Append')
$stream.SetLength(2MB + 1)
$stream.Dispose()
```

Expected baseline errors:

| Fixture | Expected result |
|---|---|
| `scan-no-text.pdf` | HTTP 422, `pdf_no_text` |
| `31-pages.pdf` | HTTP 422, `page_limit_exceeded` |
| `too-large.pdf` | HTTP 413, `pdf_too_large` |

## Suggested live sequence

1. In **Keyword Baseline**, upload the redacted CV and run the keyword prompt.
2. Run the paraphrase prompt to show the limitation of exact keyword overlap.
3. Switch to **Full Mini-RAG** and repeat the paraphrase prompt.
4. Point out the live model revision, one-based page, bounded excerpt, chunk ID and cosine similarity.
5. Run the out-of-document prompt and show the grounded fallback with no fabricated citation.

Latency displayed by the UI is browser-observed round-trip time. Pipeline descriptions are static architecture labels; answers, HTTP status, citations, model metadata and similarity values come from API responses.
