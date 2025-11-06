FROM node:20-bullseye-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

RUN npx prisma generate

RUN npm prune --omit=dev

FROM node:20.19.4-bullseye-slim AS runner

WORKDIR /usr/src/app
USER node
ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package*.json ./

CMD ["npm", "start"]
