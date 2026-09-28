# Stages: deps (packages + source), test (Vitest), build (Vue app), production (nginx, last).
# Bun installs packages; Node runs vue-tsc and Vitest, because vue-tsc patches
# TypeScript in a way that only works on Node.
FROM node:24-alpine AS deps
COPY --from=oven/bun:1-alpine /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .

# docker build --target test apps/web   runs the frontend tests; the build fails if one fails.
FROM deps AS test
RUN npm run test

FROM deps AS build
RUN npm run build

# Only the static files and nginx ship. No Node, Bun or node_modules.
FROM nginx:1.29-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Outside conf.d, so the enterprise edge (which replaces conf.d) can include it too.
COPY og-meta.conf /etc/nginx/og-meta.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
