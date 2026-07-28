FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_STAC_API_URL=http://localhost:8080
ARG VITE_TITILER_URL=http://localhost:8000
ENV VITE_STAC_API_URL=$VITE_STAC_API_URL
ENV VITE_TITILER_URL=$VITE_TITILER_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# nginx's stock mime.types doesn't know .mjs, so it serves maplibre-gl's
# worker script as application/octet-stream and the browser refuses to
# start it as a module Worker.
COPY nginx-mjs-types.conf /etc/nginx/conf.d/mjs-types.conf
EXPOSE 80
