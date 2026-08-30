# Project Memory

Pocketknife is a broad personal productivity/assistant suite spanning jobs, learning, problem solving, groceries/cooking, travel, DIY, email/todos/calendar, news and notifications.

- Frontend: React 18/Vite/TypeScript/Tailwind with route-level panels, hooks and service modules; Excalidraw, Monaco, Mermaid and document parsing.
- Backend: Express/TypeScript with routes/controllers, a multi-agent registry, domain services, schedulers, Socket.IO, validation/security middleware and extensive external integrations.
- Persistence: Prisma 7/PostgreSQL; Redis/Upstash and in-process cache; migrations/seeds under `backend/prisma`.
- Integrations: Anthropic, Google APIs/Gmail/Drive/Search, Notion, Discord/Telegram/email/Twilio, Meilisearch, job/travel/shopping/content providers.
- Entry points: `backend/src/index.ts`, `backend/src/routes/index.ts`, `frontend/src/main.tsx`, `frontend/src/App.tsx`.
- Deploy: Railway backend, Vercel frontend; GitHub workflows for PR checks, deploy and automated quality/review jobs.
- Tests: Vitest/Supertest backend and Testing Library frontend. Audit run passed 1,570 backend and 110 frontend tests.
- State: mature personal prototype with unusually broad scope and good backend coverage; operational complexity and product sprawl are its dominant risks.
- Package contract: the root manifest is orchestration-only and private; runtime dependencies live exclusively in `backend/` and `frontend/`. Use `npm ci` in each subproject, then root scripts to coordinate builds/tests.
- Readiness: `GET /health/integrations` reports configured/missing required integrations using booleans only; it does not probe providers or expose secrets.
- Weaknesses: many third-party credentials/failure modes, thin frontend coverage relative to UI surface, inconsistent abstraction depth, large number of domain agents, uncertain production observability/SLOs.
- Portfolio: end-user application, not part of the agent-development platform core. Some system-design features overlap ScrambleStack.
- Open questions: which three workflows have sustained use; actual auth/multi-user expectations; which external integrations remain operational.
