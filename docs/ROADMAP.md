# Roadmap

## Now

- Select and instrument the top three real workflows; feature-flag or archive low-use integrations.
- Keep the new orchestration-only root manifest and subproject lockfiles from drifting; PR CI now runs both test suites.
- Add external-integration health, credential readiness, latency and failure dashboards.

## Next

- Strengthen frontend workflow tests and shared loading/error/empty-state patterns.
- Introduce durable, idempotent job execution with per-integration retry/backoff and dead-letter visibility.
- Consolidate notification and provider adapters.

## Later

- Personal workflow automation recipes and cross-domain planning based on proven use.

## Avoid

- Adding more domain agents/providers before measuring adoption and reliability of existing ones.
