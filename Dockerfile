FROM node:24-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_ARC_ENVIRONMENT=testnet
ARG NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.io
ARG NEXT_PUBLIC_APP_URL=
ARG NEXT_PUBLIC_SERVER_URL=
ENV NEXT_PUBLIC_ARC_ENVIRONMENT=$NEXT_PUBLIC_ARC_ENVIRONMENT
ENV NEXT_PUBLIC_ARC_RPC_URL=$NEXT_PUBLIC_ARC_RPC_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_ARC_ENVIRONMENT=testnet
COPY --from=builder --chown=node:node /app/.next/standalone ./.next/standalone
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/scripts/start.mjs /app/scripts/payment-schedule-worker.mjs ./scripts/
COPY --from=builder --chown=node:node /app/services ./services
COPY --from=builder --chown=node:node /app/types ./types
RUN mkdir -p /app/.data && chown node:node /app/.data
VOLUME ["/app/.data"]
USER node
EXPOSE 3000
CMD ["node", "--env-file-if-exists=.env.local", "scripts/start.mjs"]
