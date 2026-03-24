FROM node:20-alpine AS builder
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install
COPY server/tsconfig.json ./server/
COPY server/src ./server/src
RUN cd server && npx tsc

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY server/package*.json ./server/
EXPOSE 4100
CMD ["node", "server/dist/server.js"]
