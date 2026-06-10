FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL=/api
ARG VITE_ASSET_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_ASSET_BASE_URL=$VITE_ASSET_BASE_URL

COPY storydb.client/package*.json ./
RUN npm ci

COPY storydb.client/ ./
RUN npm run build

FROM nginx:1.27-alpine AS final
COPY storydb.client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 50201
