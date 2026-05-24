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
RUN npm ci --omit=dev --legacy-peer-deps && npx prisma generate
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main.js"]
