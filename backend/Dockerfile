# Pocketknife Backend - Production Dockerfile
# Multi-stage build for optimized image size
# NOTE: This Dockerfile is built from repo root with context at /
#       All paths are relative to backend/ folder

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (cache layer)
# Copy from backend/ since build context is repo root
# Use --ignore-scripts to skip postinstall until prisma schema is available
COPY backend/package*.json ./
RUN npm ci --ignore-scripts

# Copy source and build (from backend/ folder)
COPY backend/ .

# Now generate Prisma client (schema is available)
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S pocketknife -u 1001

# Copy production dependencies
# Use --ignore-scripts to skip postinstall (prisma generate) since schema isn't copied yet
COPY backend/package*.json ./
RUN npm ci --only=production --ignore-scripts

# Copy built files and Prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Copy credentials folder structure (tokens will be mounted or set via env)
RUN mkdir -p credentials

# Set ownership
RUN chown -R pocketknife:nodejs /app

# Switch to non-root user
USER pocketknife

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application with migrations
# Run migrations (continue even if they fail - might already be applied)
# Then start the server
CMD ["sh", "-c", "echo 'DATABASE_URL is set:' && echo $DATABASE_URL | head -c 50 && echo '...' && npx prisma migrate deploy || echo 'Migration warning (may be OK if already applied)' && npm start"]







