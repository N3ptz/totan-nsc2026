# syntax=docker/dockerfile:1
# Build context ต้องเป็น root ของ repo:
#   docker build -f apps/notify-service/Dockerfile -t totan-notify .
# บน Railway: Root Directory = / และ Dockerfile Path = apps/notify-service/Dockerfile

FROM node:22-alpine AS build
WORKDIR /repo
RUN npm install -g pnpm@11.5.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/notify-service/package.json apps/notify-service/
RUN pnpm install --frozen-lockfile --filter @totan/notify-service
COPY apps/notify-service apps/notify-service
RUN pnpm --filter @totan/notify-service run build
RUN pnpm --filter @totan/notify-service deploy --legacy --prod /out

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out ./
EXPOSE 3004
CMD ["node", "dist/main"]
