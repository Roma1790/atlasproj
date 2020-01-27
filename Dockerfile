FROM node:latest AS builder


WORKDIR /atlas

COPY . .
RUN yarn install
RUN yarn build

FROM nginx:1.17-alpine
COPY --from=builder /atlas/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

