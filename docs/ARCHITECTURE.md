# Architecture

The backend is a layered Express application: routes map to controllers and domain services; agents coordinate specialized workflows; core services provide database, cache, search, configuration, logging and external-data behavior. Prisma/PostgreSQL is authoritative storage, with Redis/in-memory caches and Socket.IO for live updates. External integrations are numerous and generally hidden behind services.

The React client uses component panels, domain hooks and API service modules. Shared rich tools (whiteboard, code editor, Markdown) support learning/problem-solving workflows. The repository has separate frontend/backend packages plus an obsolete-looking root dependency set that predates the current packages.

The main architectural challenge is bounded-context sprawl. Recommended seams are Personal Planning, Learning/Interview, Jobs, Shopping/Food, Travel, and Integration/Notification infrastructure, with explicit ownership and feature flags. Graphify: 3,954 nodes/8,019 edges; optional SQL parser absence means migrations were not indexed.
