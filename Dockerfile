FROM nginx:alpine

# Copiar el contenido estático al directorio predeterminado de Nginx
COPY . /usr/share/nginx/html

# Exponer el puerto 80 (interno del contenedor)
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
