# KnowledgeHub Frontend

Next.js / React frontend for KnowledgeHub — curated learning platform.

## Tech Stack

- **Next.js 14+** (App Router)
- **React 18**
- **TypeScript**

## Project Structure

```
frontend/
├── public/                     Static assets served at root
│   ├── images/
│   ├── icons/
│   └── fonts/
├── src/
│   ├── app/                    Next.js App Router pages
│   │   ├── layout.tsx          Root layout (header, footer)
│   │   ├── page.tsx            Home page
│   │   ├── globals.css         Global styles
│   │   ├── not-found.tsx       404 page
│   │   ├── (auth)/             Auth route group (no URL segment)
│   │   │   └── login/
│   │   │       └── page.tsx    Login page
│   │   └── courses/
│   │       ├── page.tsx        Courses listing
│   │       └── [id]/
│   │           └── page.tsx    Course detail (dynamic route)
│   ├── components/             Reusable React components
│   │   ├── ui/                 Buttons, inputs, cards, etc.
│   │   └── layout/             Header, footer, sidebar, etc.
│   ├── lib/                    Utilities and API client
│   │   └── api.ts              Centralized API client
│   ├── hooks/                  Custom React hooks
│   ├── types/                  TypeScript type definitions
│   └── styles/                 Shared CSS modules / tokens
├── package.json
├── tsconfig.json
├── next.config.ts
└── .env.local.example
```

## Getting Started

```bash
cd frontend
npm install
cp .env.local.example .env.local   # edit API URL
npm run dev                        # http://localhost:3000
```

## API Integration

All API calls go through `src/lib/api.ts`. Endpoints defined in `docs/API.md`.
Frontend depends on API contract only — mock-first until backend is ready.
