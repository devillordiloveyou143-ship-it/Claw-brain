FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 pandav
COPY --from=builder --chown=pandav:nodejs /app ./
USER pandav
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/api/src/server.js"]
