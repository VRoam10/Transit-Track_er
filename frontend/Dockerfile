FROM node:20-bullseye-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Empty on purpose: it makes every call site emit a relative /api/... path, so one
# image is valid in every environment. Leaving it unset would inline the literal
# string "undefined" and produce requests to undefined/api/...
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:20-bullseye-slim AS runner

WORKDIR /usr/src/app
USER node
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Without this the standalone server can bind loopback only, and probes fail.
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
