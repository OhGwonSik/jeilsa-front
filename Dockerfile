# syntax=docker/dockerfile:1

FROM node:18-alpine AS build
WORKDIR /app

ARG BUILD_MODE=production
ENV VITE_BUILD_MODE=${BUILD_MODE}

COPY package*.json ./
RUN npm ci
COPY . .

RUN if [ "${VITE_BUILD_MODE}" = "dev" ]; then \
      npm run build:vite -- --mode dev && npm run build:server; \
    else \
      npm run build:vite -- --mode production && npm run build:server; \
    fi

FROM nginx:alpine
WORKDIR /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /tmp/dist

# dist/public 있으면 그쪽을, 없으면 dist 루트 사용
RUN if [ -d /tmp/dist/public ]; then \
      cp -r /tmp/dist/public/* . ; \
    else \
      cp -r /tmp/dist/* . ; \
    fi && rm -rf /tmp/dist

EXPOSE 80

ENTRYPOINT ["nginx", "-g", "daemon off;"]
