# KingCoin API — build & chạy production (Render, Fly, Railway, VPS)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run db:generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main.js"]
