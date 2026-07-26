FROM node:24-alpine AS builder

WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run typecheck && npm run generate

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/.output/public /usr/share/nginx/html

EXPOSE 80
