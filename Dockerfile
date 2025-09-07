FROM node:18-slim

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --production

# Copier le reste des fichiers
COPY . .

# Créer le dossier data s'il n'existe pas
RUN mkdir -p data

# Démarrer le bot
CMD ["node", "index.js"]
