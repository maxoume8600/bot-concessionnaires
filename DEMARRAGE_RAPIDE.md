# 🚀 Guide de Démarrage Rapide - Bot Concessionnaire

## ⚡ Configuration Express (5 minutes)

### 1. 🤖 Créer le Bot Discord

1. Va sur https://discord.com/developers/applications
2. Clique **"New Application"** → Nomme-la **"Bot Concessionnaire"**
3. Dans l'onglet **"Bot"** :
   - Clique **"Add Bot"**
   - **Copie le Token** (gardez-le secret !)
   - Active **"Message Content Intent"**
   - Active **"Server Members Intent"**

4. Dans l'onglet **"OAuth2 → URL Generator"** :
   - **Scopes** : ✅ `bot` ✅ `applications.commands`
   - **Bot Permissions** : ✅ `Administrator` (plus simple pour commencer)
   - **Copie l'URL** générée et invite le bot sur ton serveur

### 2. 📝 Configuration du fichier .env

Ouvre ton fichier `.env` et remplace :

```env
# ⬇️ REMPLACE CES VALEURS ⬇️
DISCORD_TOKEN=TON_VRAI_TOKEN_ICI
CLIENT_ID=TON_CLIENT_ID_ICI  
GUILD_ID=TON_GUILD_ID_ICI

# ✅ Le reste peut rester tel quel pour commencer
SERVER_NAME=NEW LIFE RP
FIVEM_SERVER_IP=51.210.113.170
# ... etc
```

**🔍 Comment obtenir les IDs :**
- **CLIENT_ID** : Dans "General Information" de ton application Discord
- **GUILD_ID** : Clic droit sur ton serveur Discord → "Copier l'ID"
  (Active le mode développeur dans Discord si nécessaire)

### 3. 🚀 Démarrage

```bash
# Déployer les commandes (une seule fois)
node deploy-commands.js

# Démarrer le bot
npm start
```

### 4. ✅ Configuration automatique

**Le bot va AUTOMATIQUEMENT :**
- ✅ Créer tous les canaux nécessaires
- ✅ Créer tous les rôles avec permissions  
- ✅ Organiser le serveur par catégories
- ✅ Envoyer un message de bienvenue
- ✅ Mettre à jour le fichier .env

**Tu n'as RIEN à faire !** 🎉

---

## 🎯 Test Rapide

Une fois le bot démarré :

1. **`/setup status`** - Vérifier la configuration
2. **`/catalogue`** - Voir les véhicules par défaut
3. **`/aide`** - Liste de toutes les commandes
4. **`/sync status`** - Vérifier la sync FiveM

---

## 🏗️ Structure Créée Automatiquement

### 📁 **Catégories & Canaux**
```
🏢 CONCESSIONNAIRE
├── 📋 catalogue-vehicules    (public)
├── 💰 ventes-vehicules       (vendeurs+)  
└── 📦 gestion-stock          (vendeurs+)

💼 GESTION  
├── 📊 statistiques-ventes    (vendeurs+)
├── 🔧 commandes-admin        (admin only)
└── 📝 logs-systeme          (logs auto)

🎯 SUPPORT
├── ❓ aide-concessionnaire   (public)
└── 🔔 annonces-importantes   (admin only)
```

### 👥 **Rôles Créés**
- **🏢 Patron Concessionnaire** (Admin)
- **💼 Vendeur Auto** (Gérer ventes/stock)
- **🚗 Client Concessionnaire** (Acheter)
- **🤖 Bot Concessionnaire** (Système)

---

## 🔧 Configuration FiveM (Optionnel)

Si tu veux la synchronisation avec ton serveur :

1. **Installe la resource** (dossier `fivem-resource-example/`)
2. **Configure l'IP** dans `.env` : `FIVEM_SERVER_IP=TON_IP`
3. **Teste** : `/sync now`

---

## 🆘 Problèmes Courants

### Token Invalide
- ❌ **Erreur** : `An invalid token was provided`
- ✅ **Solution** : Régénère le token sur Discord Developer Portal

### Permissions Manquantes  
- ❌ **Erreur** : `Missing Permissions`
- ✅ **Solution** : Donne **Administrator** au bot (plus simple)

### Commandes Non Trouvées
- ❌ **Erreur** : `This interaction failed`  
- ✅ **Solution** : Lance `node deploy-commands.js`

### Bot Hors Ligne
- ❌ **Erreur** : Bot apparaît offline
- ✅ **Solution** : Vérifier token + intents activés

---

## 🎉 Et Voilà !

Ton concessionnaire Discord est **100% opérationnel** !

- 📱 **Interface moderne** avec boutons/menus
- 🔄 **Synchronisation automatique** FiveM  
- 📊 **Statistiques avancées**
- 🤖 **Configuration automatique**
- 💾 **Sauvegarde automatique**

**Bon business ! 🚗💨**
