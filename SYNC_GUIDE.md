# 🔄 Guide de Synchronisation FiveM

Ce guide explique comment configurer la synchronisation automatique entre ton serveur FiveM et le bot Discord.

## 📋 Configuration requise

### Côté FiveM
1. **Resource API** (exemple fourni)
2. **Port HTTP** ouvert (par défaut 30120)
3. **Données véhicules** structurées

### Côté Bot Discord
1. **IP du serveur** accessible
2. **Variables d'environnement** configurées
3. **Permissions** appropriées

## 🛠️ Installation côté FiveM

### Option 1: Resource personnalisée (recommandée)

1. **Copie la resource d'exemple**
   ```
   Copie le dossier fivem-resource-example/ dans ton dossier resources/
   Renomme-le en concessionnaire-api/
   ```

2. **Ajoute la resource à ton server.cfg**
   ```
   ensure concessionnaire-api
   ```

3. **Personnalise les données**
   Édite `server.lua` pour ajouter tes véhicules :
   ```lua
   ["ton_vehicule"] = {
       id = "ton_vehicule",
       name = "Nom du véhicule",
       brand = "Marque",
       price = 250000,
       category = "Sports",
       stock = 10
   }
   ```

### Option 2: ESX/QBCore existant

Si tu utilises déjà ESX ou QBCore, adapte ton script de concessionnaire existant :

#### Pour ESX :
```lua
-- Dans ton script de concessionnaire ESX
RegisterNetEvent('esx:playerLoaded')
AddEventHandler('esx:playerLoaded', function(playerId, xPlayer)
    -- Exposer une route HTTP
    SetHttpHandler(function(request, response)
        if request.path == "/vehicles" then
            MySQL.Async.fetchAll('SELECT * FROM vehicle_categories', {}, function(vehicles)
                response.writeHead(200, {["Content-Type"] = "application/json"})
                response.send(json.encode(vehicles))
            end)
        end
    end)
end)
```

#### Pour QBCore :
```lua
-- Dans ton script de concessionnaire QBCore  
QBCore.Commands.Add("startvehicleapi", "Démarrer l'API véhicules", {}, true, function(source, args)
    SetHttpHandler(function(request, response)
        if request.path == "/vehicles" then
            local vehicles = QBCore.Shared.Vehicles
            response.writeHead(200, {["Content-Type"] = "application/json"})
            response.send(json.encode(vehicles))
        end
    end)
end, "admin")
```

## ⚙️ Configuration côté Bot

### 1. Variables d'environnement

Édite ton fichier `.env` :
```env
# IP de ton serveur FiveM (IP publique ou locale)
FIVEM_SERVER_IP=192.168.1.100

# Port HTTP de ton serveur (généralement 30120)
FIVEM_SERVER_PORT=30120

# Endpoint API (selon ta configuration)
FIVEM_API_ENDPOINT=/vehicles

# Intervalle de synchronisation en millisecondes (300000 = 5 minutes)
SYNC_INTERVAL=300000
```

### 2. Formats de données supportés

Le bot supporte plusieurs formats de réponse API :

#### Format 1: Array simple
```json
[
  {
    "id": "adder",
    "name": "Truffade Adder",
    "price": 1500000,
    "stock": 5
  }
]
```

#### Format 2: Objet avec propriété vehicles
```json
{
  "vehicles": [
    {
      "id": "adder", 
      "name": "Truffade Adder",
      "price": 1500000
    }
  ]
}
```

#### Format 3: Objet clé-valeur
```json
{
  "adder": {
    "name": "Truffade Adder",
    "price": 1500000,
    "stock": 5
  },
  "sultan": {
    "name": "Karin Sultan", 
    "price": 180000,
    "stock": 8
  }
}
```

## 🚀 Utilisation

### Commandes disponibles

- `/sync now` - Force une synchronisation immédiate
- `/sync status` - Voir l'état de la synchronisation  
- `/sync start` - Démarrer la synchronisation auto
- `/sync stop` - Arrêter la synchronisation auto

### Synchronisation automatique

Une fois configuré, le bot se synchronise automatiquement :
- ✅ **Au démarrage** du bot
- 🔄 **Toutes les 5 minutes** (configurable)
- 📊 **Logs automatiques** des changements

### Notifications

Si configuré (`CHANNEL_LOGS`), le bot enverra des notifications lors de :
- Ajout de nouveaux véhicules
- Modification de prix/stock
- Erreurs de synchronisation

## 🔧 Dépannage

### Problèmes courants

#### 1. "Timeout de connexion"
- Vérifie que l'IP et le port sont corrects
- Assure-toi que le serveur FiveM est démarré
- Teste l'URL manuellement : `http://TON_IP:30120/vehicles`

#### 2. "Format de réponse invalide"
- Vérifie que ton API retourne du JSON valide
- Utilise un validateur JSON en ligne
- Consulte les logs du serveur FiveM

#### 3. "Aucune donnée reçue"
- Vérifie l'endpoint `/vehicles`
- Assure-toi qu'il y a des véhicules dans ta base
- Teste avec `/sync now` pour voir les erreurs détaillées

### Tests de connectivité

```bash
# Test depuis Windows PowerShell
Invoke-RestMethod -Uri "http://TON_IP:30120/vehicles"

# Test depuis navigateur
http://TON_IP:30120/vehicles
```

## 📈 Avantages de la synchronisation

- ✅ **Prix toujours à jour** avec le serveur
- ✅ **Stock en temps réel** 
- ✅ **Nouveaux véhicules** ajoutés automatiquement
- ✅ **Cohérence** entre le jeu et Discord
- ✅ **Moins de maintenance** manuelle
- ✅ **Notifications** automatiques des changements

## 🔒 Sécurité

### Recommandations :
- Utilise un **firewall** pour limiter l'accès à l'API
- Configure des **tokens d'authentification** si nécessaire  
- **Limite les endpoints** exposés
- **Monitore** les logs d'accès

### Configuration firewall Windows :
```powershell
# Autoriser seulement l'IP du bot Discord
New-NetFirewallRule -DisplayName "FiveM API" -Direction Inbound -Protocol TCP -LocalPort 30120 -RemoteAddress "IP_DU_BOT"
```

---

**Need help?** Contacte-moi si tu as des problèmes avec la configuration !
