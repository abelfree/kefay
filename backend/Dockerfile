FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build


FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Keeping devDependencies here (rather than --omit=dev) is deliberate:
# the `prisma` CLI and `ts-node` are devDependencies, and this image
# runs both `prisma migrate deploy` and the `npm run seed` script at
# container start/exec time, not just the compiled server.
COPY package.json package-lock.json ./
RUN npm ci

COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
