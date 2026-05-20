# ---- Stage 1: Build ----
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# ---- Stage 2: Production ----
FROM node:20-alpine
WORKDIR /usr/src/app

# Copy chỉ production node_modules và source code
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app .

# Download RDS CA bundle cho DocumentDB TLS
RUN mkdir -p /usr/src/app/certs && \
    wget -q https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
    -O /usr/src/app/certs/global-bundle.pem

EXPOSE 80
CMD [ "npm", "start" ]
