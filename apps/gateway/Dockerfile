# syntax=docker/dockerfile:1
# Build context ต้องเป็น root ของ repo (มี pnpm-lock.yaml):
#   docker build -f apps/gateway/Dockerfile -t totan-gateway .
# บน Railway: ตั้ง Root Directory = / และ Dockerfile Path = apps/gateway/Dockerfile

FROM node:22-alpine AS build
WORKDIR /repo
RUN npm install -g pnpm@11.5.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/gateway/package.json apps/gateway/
RUN pnpm install --frozen-lockfile --filter @totan/gateway
COPY apps/gateway apps/gateway
RUN pnpm --filter @totan/gateway run build
# แยกแอป + prod deps ออกเป็นโฟลเดอร์เดียว ไม่ลาก workspace ทั้งก้อนลง image
RUN pnpm --filter @totan/gateway deploy --legacy --prod /out

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out ./
EXPOSE 3000
CMD ["node", "dist/main"]
