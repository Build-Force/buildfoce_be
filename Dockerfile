# ---- Stage 1: Build TypeScript ----
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Cài đặt ALL dependencies (bao gồm devDependencies có typescript compiler)
RUN npm ci

# Copy toàn bộ source code
COPY . .

# Compile TypeScript → JavaScript vào thư mục dist/
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine
WORKDIR /usr/src/app

# Copy package files để cài production deps
COPY package*.json ./

# Chỉ cài production dependencies (không cần typescript, ts-node...)
RUN npm ci --only=production

# Copy thư mục dist đã được build từ Stage 1
COPY --from=builder /usr/src/app/dist ./dist

# Download RDS CA bundle cho DocumentDB TLS
RUN apk add --no-cache wget && \
    mkdir -p /usr/src/app/certs && \
    wget -q https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
    -O /usr/src/app/certs/global-bundle.pem

EXPOSE 80
CMD [ "npm", "start" ]
