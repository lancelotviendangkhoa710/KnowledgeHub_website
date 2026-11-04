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

Never put GEMINI_API_KEY, database credentials, Sanctum secrets, or any other
private value in Vercel NEXT_PUBLIC_* variables. Redeploy after changing a
build-time frontend variable.

### Render backend

Set private runtime variables in the Render service:

    APP_ENV=production
    APP_DEBUG=false
    APP_URL=https://knowledgehub-website.onrender.com
    AI_PROVIDER=gemini
    AI_MODEL=gemini-2.5-flash
    GEMINI_API_KEY=<secret>

Also configure the approved Supabase PostgreSQL connection and Laravel
authentication variables. Do not commit the values. Render must have the
Gemini key; the browser must never receive it.

## AI-05 request flow

    Browser on Vercel
      -> POST https://knowledgehub-website.onrender.com/api/ai/roadmaps/preview
      -> Laravel on Render reads AI_MODEL and GEMINI_API_KEY
      -> Gemini generateContent API
      -> Laravel validates and normalizes JSON
      -> Browser renders the draft roadmap

The endpoint requires a Sanctum bearer token. It generates a draft only and
does not persist a roadmap. article_id remains null until the published course
catalog is connected.

## Choosing and observing the model

AI_MODEL selects the Gemini model. The backend request URL is:

    https://generativelanguage.googleapis.com/v1beta/models/{AI_MODEL}:generateContent

For a test deployment, change AI_MODEL in Render, save, and redeploy. Keep
the model pinned to a specific model ID while testing; do not silently switch
to a moving alias.

To verify which model is active:

1. Check the Render environment variable AI_MODEL.
2. Inspect the deployed AI request logs and response metadata after the
   model-observability field is added.
3. Confirm the Gemini response modelVersion when available; do not infer the
   model from the UI text alone.

Never log the API key, Authorization header, full prompt, or private user data.
Only log a request ID, configured model ID, provider, latency, status, and token
usage if the provider returns it.

## Deployment smoke test

1. Confirm Render has GEMINI_API_KEY and AI_MODEL.
2. Confirm Vercel has NEXT_PUBLIC_API_URL pointing to Render /api.
3. Log in through the deployed frontend so a Sanctum bearer token exists.
4. Open /ai, submit a small goal, and inspect the browser Network panel for
   the internal /api/ai/roadmaps/preview call.
5. A successful response must contain status=success, a roadmap title, and
   ordered items. A missing key should return 503; an upstream/model failure
   should return 502.

If the browser reports a CORS or 401 error, fix the Render/Laravel deployment
configuration before changing the Gemini integration.
