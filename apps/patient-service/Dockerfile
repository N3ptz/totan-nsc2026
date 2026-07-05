# syntax=docker/dockerfile:1
# Build context ต้องเป็น root ของ repo:
#   docker build -f apps/patient-service/Dockerfile -t totan-patient .
# บน Railway: Root Directory = / และ Dockerfile Path = apps/patient-service/Dockerfile
# หมายเหตุ: โฟลเดอร์ ./uploads (โหมดยังไม่ตั้ง Supabase) เป็น ephemeral บน Railway —
# production ต้องตั้ง Supabase ให้ครบเพื่อให้ไฟล์ขึ้น storage จริง

FROM node:22-alpine AS build
WORKDIR /repo
RUN npm install -g pnpm@11.5.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/patient-service/package.json apps/patient-service/
RUN pnpm install --frozen-lockfile --filter @totan/patient-service
COPY apps/patient-service apps/patient-service
RUN pnpm --filter @totan/patient-service run build
RUN pnpm --filter @totan/patient-service deploy --legacy --prod /out

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out ./
EXPOSE 3002
CMD ["node", "dist/main"]
