# Deployment and Hosting Context Pack

Use this pack whenever a task involves the deployed KnowledgeHub frontend,
backend, environment variables, CORS, or AI provider testing.

## Current hosted targets

| Component | Provider | URL | Role |
|---|---|---|---|
| Frontend | Vercel | https://knowledge-hub-website-eight.vercel.app/ | Next.js browser application |
| Backend | Render | https://knowledgehub-website.onrender.com | Laravel API/PHP runtime |
| Database | Supabase PostgreSQL | private project URL | Managed PostgreSQL target |

Observed on 2026-11-04: both public URLs returned HTTP 200. The Render root
currently returned the Laravel default page; this does not prove that the API,
database, authentication, or AI route is healthy.

## Environment split

### Vercel frontend

Set this public browser-visible variable:

    NEXT_PUBLIC_API_URL=https://knowledgehub-website.onrender.com/api

Never put DEEPSEEK_API_KEY, database credentials, Sanctum secrets, or any other
private value in Vercel NEXT_PUBLIC_* variables. Redeploy after changing a
build-time frontend variable.

### Render backend

Set private runtime variables in the Render service:

    APP_ENV=production
    APP_DEBUG=false
    APP_URL=https://knowledgehub-website.onrender.com
    AI_SERVICE_URL=<FastAPI service URL>
    AI_SERVICE_TOKEN=<shared private token>

Also configure the approved Supabase PostgreSQL connection and Laravel
authentication variables. Do not commit the values.

### Render FastAPI AI service

Set these private runtime variables on the separate FastAPI service:

    AI_SERVICE_TOKEN=<same shared private token>
    AI_MODEL=deepseek-flash
    DEEPSEEK_API_KEY=<secret>

Only FastAPI receives the DeepSeek key; the browser and Laravel environment
must never receive it.

## AI-05 request flow

    Browser on Vercel
      -> POST https://knowledgehub-website.onrender.com/api/ai/roadmaps/preview
      -> Laravel on Render reads AI_SERVICE_URL and AI_SERVICE_TOKEN
      -> FastAPI reads AI_MODEL and DEEPSEEK_API_KEY
      -> DeepSeek Chat Completions API
      -> Laravel validates and normalizes JSON
      -> Browser renders the draft roadmap

The endpoint requires a Sanctum bearer token. It generates a draft only and
does not persist a roadmap. article_id remains null until the published course
catalog is connected.

## Choosing and observing the model

AI_MODEL selects the DeepSeek model. The AI service uses the Chat Completions
endpoint at:

    https://api.deepseek.com/chat/completions

DeepSeek bills usage by tokens. Confirm the DeepSeek account has available
balance before enabling production traffic.

For a test deployment, change AI_MODEL in the FastAPI Render service, save,
and redeploy. DeepSeek may update the version behind `deepseek-flash`; inspect
the returned model metadata when verifying a deployment.

To verify which model is active:

1. Check the Render environment variable AI_MODEL.
2. Inspect the deployed AI service request logs and response metadata.
3. Confirm the configured model and returned model metadata; do not infer the
   model from the UI text alone.

Never log the API key, Authorization header, full prompt, or private user data.
Only log a request ID, configured model ID, provider, latency, status, and token
usage if the provider returns it.

## Deployment smoke test

1. Confirm the Render backend has AI_SERVICE_URL and AI_SERVICE_TOKEN.
2. Confirm the FastAPI service has the matching AI_SERVICE_TOKEN,
   DEEPSEEK_API_KEY, and AI_MODEL.
3. Confirm Vercel has NEXT_PUBLIC_API_URL pointing to Render /api.
4. Log in through the deployed frontend so a Sanctum bearer token exists.
5. Open /ai, submit a small goal, and inspect the browser Network panel for
   the internal /api/ai/roadmaps/preview call.
6. A successful response must contain status=success, a roadmap title, and
   ordered items. A missing service key should return 503; DeepSeek 5xx or
   rate-limit failures return 503, malformed provider output returns 502, and
   other upstream request failures return a safe 502 response.

If the browser reports a CORS or 401 error, fix the Render/Laravel deployment
configuration before changing the DeepSeek integration.
