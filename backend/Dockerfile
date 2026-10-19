# syntax=docker/dockerfile:1
# ============================================================
#  Verify Certification — Backend (Express + TypeScript)
#  Node 24.21.0 · multi-stage · chạy bằng user không phải root
#  Build context: backend/
# ============================================================

# ---------- Stage 1: cài dependencies (có cả dev) ----------
FROM node:24.21.0-alpine AS deps
WORKDIR /app

# npm ci cần package-lock.json — phải commit file này
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# ---------- Stage 2: build TypeScript ----------
FROM node:24.21.0-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- Stage 3: runtime tối giản ----------
FROM node:24.21.0-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Render inject PORT (mặc định 10000); đây chỉ là giá trị dự phòng
ENV PORT=10000

# Chỉ cài production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy output đã build
COPY --from=build --chown=node:node /app/dist ./dist

# Nếu backend đọc ABI / file tĩnh khác, copy thêm ở đây, ví dụ:
# COPY --from=build --chown=node:node /app/src/abi ./dist/abi

USER node
EXPOSE 10000

# Dùng npm start để tôn trọng script trong package.json
CMD ["npm", "start"]
