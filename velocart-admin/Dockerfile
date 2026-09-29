FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm config set strict-ssl false
RUN npm config set registry https://registry.yarnpkg.com/
RUN npm install -g typescript vite
RUN npm ci
COPY . .
RUN npx vite build

# Use Nginx to serve the static React build
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
RUN sed -i 's/index  index.html index.htm;/index  index.html index.htm;\n        try_files $uri $uri\/ \/index.html;/g' /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
