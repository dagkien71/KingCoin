# KingCoin API — build & chạy production (Render, Fly, Railway, VPS)
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
ENV HUSKY=0
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run db:generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HUSKY=0
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev --legacy-peer-deps
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts
RUN chmod +x scripts/render-start.sh
EXPOSE 3001
CMD ["sh", "scripts/render-start.sh"]
