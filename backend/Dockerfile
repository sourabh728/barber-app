# NestJS API — works on Render free tier (and similar hosts)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nest && adduser -S nest -G nest
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/generated ./generated
RUN mkdir -p uploads && chown -R nest:nest /app
USER nest
# Render injects PORT (default 10000). EXPOSE is documentation only.
EXPOSE 10000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
