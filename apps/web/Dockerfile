# Stage 1: build the Vue app. Bun installs packages; Node runs the build,
# because vue-tsc patches TypeScript in a way that only works on Node.
FROM node:24-alpine AS build
COPY --from=oven/bun:1-alpine /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN npm run build

# Stage 2: only the static files and nginx ship. No Node, Bun or node_modules.
FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
