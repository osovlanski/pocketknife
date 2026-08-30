# Decisions

- Split frontend and backend deployments (Vercel/Railway). Supported by manifests and deployment configuration.
- Use Prisma/PostgreSQL as cloud persistence and Redis/cache for acceleration. Supported by package/config/migrations.
- Model assistant capabilities as multiple domain agents rather than one universal prompt. Supported by agent registry and domain folders.
- Keep external vendors behind service modules and configurable environment keys. Supported by services and env example.
- Automate quality/review checks in GitHub Actions. Supported by workflows and quality-report history.
- Historical SQLite/hardcoded-data evolution is documented in existing migration/audit documents; do not infer more than those records state.
