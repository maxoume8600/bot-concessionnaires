# 🚗 Bot Concessionnaire FiveM

Un bot Discord complet pour gérer un concessionnaire sur votre serveur RP FiveM. Il permet de gérer les véhicules, les ventes, le stock et de générer des statistiques détaillées.

## 📋 Fonctionnalités

### � **Synchronisation FiveM (NOUVEAU !)**
- **Synchronisation automatique** avec ton serveur FiveM
- **Prix et stock en temps réel** depuis le serveur
- **Support multi-formats** d'API (ESX, QBCore, custom)
- **Notifications automatiques** des changements
- **Commandes de gestion** de la synchronisation

### �👥 Pour tous les utilisateurs
- **Catalogue interactif** : Parcourir tous les véhicules disponibles
- **Détails des véhicules** : Voir les spécifications complètes

### 💼 Pour les vendeurs
- **Système de vente** : Vendre des véhicules avec calcul automatique des taxes
- **Gestion des remises** : Appliquer des remises jusqu'à 50%
- **Notifications automatiques** : Messages privés aux clients
- **Suivi des ventes** : Historique complet des transactions

### 🔧 Pour les administrateurs
- **Gestion complète du stock** : Ajouter/retirer des véhicules
- **CRUD des véhicules** : Créer, modifier, supprimer des véhicules
- **Statistiques avancées** : Analyses par période et par vendeur
- **Système de logs** : Traçabilité complète
- **Synchronisation FiveM** : Gestion complète de la sync serveur

## 🛠️ Installation

### Prérequis
- Node.js 16.9.0 ou supérieur
- Un bot Discord créé sur le [portail développeur Discord](https://discord.com/developers/applications)

### Étapes d'installation

1. **Cloner ou télécharger le projet**
   ```bash
   cd "C:\Users\maxou\Downloads\bot concessionnaire"
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration du bot Discord**
   - Allez sur https://discord.com/developers/applications
   - Créez une nouvelle application
   - Dans l'onglet "Bot", cliquez sur "Add Bot"
   - Copiez le token du bot
   - Dans l'onglet "OAuth2 > URL Generator", sélectionnez :
     - Scopes: `bot` et `applications.commands`
     - Permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`

4. **Configuration de l'environnement**
   - Copiez `.env.example` vers `.env`
   - Remplissez les variables :
   ```env
   DISCORD_TOKEN=votre_token_bot
   CLIENT_ID=id_de_votre_application
   GUILD_ID=id_de_votre_serveur_discord
   SERVER_NAME=Nom de votre serveur RP
   
   # Synchronisation FiveM (optionnel)
   FIVEM_SERVER_IP=192.168.1.100
   FIVEM_SERVER_PORT=30120
   FIVEM_API_ENDPOINT=/vehicles
   SYNC_INTERVAL=300000
   
   DEVISE=€
   TVA=20
   ```

5. **Déployer les commandes slash**
   ```bash
   node deploy-commands.js
   ```

6. **Démarrer le bot**
   ```bash
   npm start
   ```

## 📊 Commandes disponibles

### Commandes publiques
- `/catalogue` - Afficher le catalogue des véhicules
- `/aide` - Guide d'utilisation du bot

### Commandes vendeurs (rôle requis)
- `/vendre <client> <vehicule> [remise]` - Vendre un véhicule
- `/stock voir` - Consulter l'état du stock
- `/ventes jour/semaine/mois` - Statistiques de ventes
- `/ventes vendeur [utilisateur]` - Stats par vendeur

### Commandes administrateur
- `/vehicule ajouter` - Ajouter un nouveau véhicule
- `/vehicule modifier` - Modifier un véhicule existant
- `/vehicule supprimer` - Supprimer un véhicule
- `/vehicule info` - Détails d'un véhicule
- `/stock ajouter/retirer` - Gérer le stock
- `/sync now/status/start/stop` - Gérer la synchronisation FiveM

## 🔧 Configuration avancée

### Rôles Discord (optionnel)
Configurez ces IDs dans le fichier `.env` :
```env
ROLE_VENDEUR=123456789012345678
ROLE_PATRON=123456789012345678
ROLE_CLIENT=123456789012345678
```

### Canaux Discord (optionnel)
```env
CHANNEL_VENTES=123456789012345678  # Canal pour logs des ventes
CHANNEL_LOGS=123456789012345678    # Canal pour les logs système
CHANNEL_STOCK=123456789012345678   # Canal pour les alertes de stock
```

### Synchronisation FiveM (optionnel)
```env
FIVEM_SERVER_IP=192.168.1.100      # IP de ton serveur FiveM
FIVEM_SERVER_PORT=30120            # Port HTTP du serveur
FIVEM_API_ENDPOINT=/vehicles       # Endpoint API des véhicules
SYNC_INTERVAL=300000               # Intervalle de sync (5 min)
```

Pour configurer la synchronisation, consulte le guide détaillé : **[SYNC_GUIDE.md](SYNC_GUIDE.md)**

## 📁 Structure des fichiers

```
bot concessionnaire/
├── commands/           # Commandes slash
├── events/            # Événements Discord
├── data/              # Fichiers de données JSON
├── utils/             # Utilitaires (embeds, data manager)
├── index.js           # Fichier principal
├── deploy-commands.js # Script de déploiement
├── package.json       # Configuration npm
└── .env              # Variables d'environnement
```

## 🔄 Sauvegarde automatique

Le bot sauvegarde automatiquement :
- Les véhicules dans `data/vehicules.json`
- Les ventes dans `data/ventes.json`
- Les clients dans `data/clients.json`

## 🚀 Utilisation en production

1. **Hébergement** : Utilisez un VPS ou un service cloud (Heroku, Railway, etc.)
2. **Base de données** : Pour une utilisation intensive, remplacez les fichiers JSON par une base de données (MongoDB, PostgreSQL)
3. **Monitoring** : Ajoutez des logs plus détaillés
4. **Backup** : Sauvegardez régulièrement le dossier `data/`

## 🐛 Support

Si vous rencontrez des problèmes :
1. Vérifiez que toutes les dépendances sont installées
2. Vérifiez la configuration du fichier `.env`
3. Consultez les logs dans la console
4. Vérifiez les permissions du bot sur Discord

## 📝 Personnalisation

Vous pouvez facilement :
- Ajouter de nouvelles commandes dans le dossier `commands/`
- Modifier les embeds dans `utils/embeds.js`
- Ajouter de nouveaux véhicules via la commande `/vehicule ajouter`
- Personnaliser les couleurs et messages

## ⚖️ Licence

Ce projet est sous licence MIT - voir le fichier LICENSE pour plus de détails.

---

**Développé avec ❤️ pour la communauté FiveM RP**
