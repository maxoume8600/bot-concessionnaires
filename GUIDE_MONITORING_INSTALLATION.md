# 🔍 GUIDE D'INSTALLATION - MONITORING VENDEURS FIVEM

## 📋 **Vue d'ensemble**

Ce système permet à ton bot Discord de surveiller en temps réel :
- ✅ **Qui est connecté** sur ton serveur FiveM
- ✅ **Quels vendeurs** sont au travail (job concessionnaire)
- ✅ **Combien de temps** ils restent connectés
- ✅ **Notifications automatiques** des connexions/déconnexions
- ✅ **Alertes d'inactivité** si un vendeur ne fait rien
- ✅ **Statistiques complètes** des sessions de travail

---

## 🚀 **INSTALLATION FIVEM RESOURCE**

### Étape 1 : Copier la resource
```bash
# Dans ton serveur FiveM, copie le dossier :
fivem-monitoring-resource/ → ton-serveur/resources/concessionnaire-monitoring/
```

### Étape 2 : Ajouter dans server.cfg
```cfg
# Dans ton server.cfg, ajoute cette ligne :
ensure concessionnaire-monitoring
```

### Étape 3 : Redémarrer le serveur
```
restart concessionnaire-monitoring
```

### Étape 4 : Vérifier l'installation
```
# Dans la console de ton serveur FiveM, tape :
monitoring:test
```

Tu devrais voir :
```
=== TEST API MONITORING ===
Vendeurs concessionnaire connectés: X
  - NomJoueur (ID: 1) - Grade: Patron
```

---

## 🎯 **CONFIGURATION DISCORD**

### Active le monitoring dans ton bot
```env
# Dans ton fichier .env
MONITORING_ENABLED=true
MONITORING_INTERVAL=30000          # Vérification toutes les 30 secondes
INACTIVITY_THRESHOLD=300000        # Alerte après 5 min d'inactivité
MIN_SHIFT_DURATION=600000          # Session minimum 10 minutes
DEALER_JOB_NAME=concessionnaire    # Nom du job à surveiller
```

### Redémarre ton bot
```bash
node index.js
```

---

## 🎮 **COMMANDES DISCORD DISPONIBLES**

### Pour démarrer le monitoring :
```
/monitoring start              → Démarre la surveillance
/monitoring stop               → Arrête la surveillance
/monitoring status             → État du système
```

### Pour voir l'activité :
```
/monitoring vendeurs           → Vendeurs connectés maintenant
/monitoring activite           → Activité récente (connexions/déconnexions)
/monitoring dashboard          → Vue d'ensemble complète
```

---

## 📊 **EXEMPLE D'UTILISATION**

### Scénario typique :

**1. Un vendeur se connecte au serveur FiveM avec le job concessionnaire**
   - 🟢 Bot Discord : "**PlayerName** vient de se connecter (Vendeur Auto)"
   
**2. Le vendeur reste connecté 2 heures**
   - 📊 Dashboard Discord : "PlayerName (Vendeur Auto) - 2h15m"
   
**3. Le vendeur ne fait rien pendant 5 minutes**
   - ⚠️ Alerte Discord : "PlayerName est inactif depuis 5 minutes"
   
**4. Le vendeur se déconnecte**
   - 🔴 Bot Discord : "**PlayerName** s'est déconnecté (session: 2h15m)"

---

## 🔧 **API ENDPOINTS DISPONIBLES**

### Ton serveur FiveM expose maintenant ces APIs :

```http
GET http://ton-ip:30120/monitoring/players    → Tous les joueurs avec jobs
GET http://ton-ip:30120/monitoring/dealers    → Seulement les vendeurs  
GET http://ton-ip:30120/monitoring/player/1   → Infos d'un joueur spécifique
GET http://ton-ip:30120/monitoring/stats      → Statistiques serveur
```

### Test manuel depuis ton navigateur :
```
http://51.210.113.170:30120/monitoring/dealers
```

Réponse attendue :
```json
{
  "success": true,
  "dealers": [
    {
      "id": 1,
      "name": "PlayerName",
      "job": {
        "name": "concessionnaire",
        "label": "Concessionnaire",
        "grade": 2,
        "grade_label": "Patron"
      }
    }
  ],
  "count": 1
}
```

---

## 🛠️ **COMPATIBILITÉ FRAMEWORKS**

### ✅ **ESX Legacy**
```lua
-- Automatiquement détecté
-- Fonctionne avec xPlayer.job
```

### ✅ **QB-Core**  
```lua
-- Automatiquement détecté
-- Fonctionne avec Player.PlayerData.job
```

### ✅ **Framework personnalisé**
```lua
-- Modifie la fonction getPlayerData() dans server.lua
-- pour s'adapter à ton système de jobs
```

---

## 🚨 **RÉSOLUTION DE PROBLÈMES**

### ❌ **"Configuration FiveM manquante"**
```env
# Vérifie ton .env :
FIVEM_SERVER_IP=ton-ip
FIVEM_SERVER_PORT=30120
```

### ❌ **"Erreur API FiveM Monitoring: 404"**
```bash
# Vérifie que la resource est bien démarrée :
ensure concessionnaire-monitoring
restart concessionnaire-monitoring
```

### ❌ **"Aucun vendeur trouvé"**
```lua
-- Dans server.lua, vérifie le nom du job :
DEALER_JOB_NAME=concessionnaire  -- Doit correspondre exactement
```

### ❌ **Bot ne voit pas les connexions**
```
# Teste manuellement l'API :
/monitoring start     → Démarre le monitoring
/monitoring status    → Vérifie l'état
```

---

## 🎉 **FONCTIONNALITÉS AVANCÉES**

### 🔔 **Notifications automatiques**
- Vendeur se connecte → Message dans #logs-systeme
- Vendeur se déconnecte → Message avec durée de session
- Session trop courte → Alerte spéciale
- Inactivité détectée → Avertissement

### 📈 **Analytics en temps réel**
- Temps de connexion total par vendeur
- Nombre de sessions par jour
- Vendeur le plus actif
- Statistiques de présence

### 🚨 **Système d'alertes**
- Aucun vendeur connecté pendant X temps
- Vendeur inactif trop longtemps  
- Session trop courte (moins de 10min)
- Pic ou chute d'activité inhabituelle

---

## 🏆 **AVANTAGES POUR TON CONCESSIONNAIRE**

### ✅ **Gestion d'équipe optimisée**
- Sais quand tes vendeurs travaillent vraiment
- Détecte les vendeurs fantômes
- Récompense les plus actifs

### ✅ **Professionnalisme**
- Monitoring niveau entreprise
- Données précises et fiables
- Interface Discord intuitive

### ✅ **Automatisation totale**
- Aucune intervention manuelle
- Tout en temps réel  
- Historique complet conservé

---

# 🎯 **TON SYSTÈME EST PRÊT !**

**Une fois installé, tu auras un monitoring professionnel de tes vendeurs, directement dans Discord !**

**Questions ? Utilise `/monitoring status` pour vérifier que tout fonctionne !** 🚀
