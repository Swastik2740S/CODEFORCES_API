# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: generate Prisma client ───────────────────────────────────────────
FROM node:22-alpine AS prisma
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

# ── Stage 3: production image ─────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# No ENV NODE_ENV here — it comes from docker-compose environment

# Copy production node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy generated Prisma client over prod node_modules
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma /app/node_modules/@prisma ./node_modules/@prisma

# Copy app source
COPY . .

EXPOSE 8080

# ✅ Fixed: API server runs server.js, not syncWorker.js
CMD ["node", "server.js"]
