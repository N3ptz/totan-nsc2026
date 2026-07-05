# syntax=docker/dockerfile:1
# Build context ต้องเป็น root ของ repo:
#   docker build -f apps/auth-service/Dockerfile -t totan-auth .
# บน Railway: Root Directory = / และ Dockerfile Path = apps/auth-service/Dockerfile

FROM node:22-alpine AS build
WORKDIR /repo
RUN npm install -g pnpm@11.5.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/auth-service/package.json apps/auth-service/
RUN pnpm install --frozen-lockfile --filter @totan/auth-service
COPY apps/auth-service apps/auth-service
RUN pnpm --filter @totan/auth-service run build
RUN pnpm --filter @totan/auth-service deploy --legacy --prod /out

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out ./
EXPOSE 3001
CMD ["node", "dist/main"]
