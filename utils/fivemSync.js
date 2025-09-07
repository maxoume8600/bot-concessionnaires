const https = require('https');
const http = require('http');
const DataManager = require('./dataManager');

class FiveMSync {
    constructor(client) {
        this.client = client;
        this.serverIP = process.env.FIVEM_SERVER_IP;
        this.serverPort = process.env.FIVEM_SERVER_PORT || '30120';
        this.apiEndpoint = process.env.FIVEM_API_ENDPOINT || '/vehicles';
        this.syncInterval = parseInt(process.env.SYNC_INTERVAL) || 300000; // 5 minutes par défaut
        this.lastSync = null;
        this.syncTimer = null;
    }

    /**
     * Démarre la synchronisation automatique
     */
    startAutoSync() {
        if (!this.serverIP) {
            console.log('⚠️ IP du serveur FiveM non configurée, synchronisation désactivée');
            return;
        }

        console.log(`🔄 Synchronisation automatique activée (${this.syncInterval/1000}s)`);
        
        // Synchronisation immédiate au démarrage
        this.syncWithServer();
        
        // Puis synchronisation périodique
        this.syncTimer = setInterval(() => {
            this.syncWithServer();
        }, this.syncInterval);
    }

    /**
     * Arrête la synchronisation automatique
     */
    stopAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
            console.log('🛑 Synchronisation automatique arrêtée');
        }
    }

    /**
     * Synchronise avec le serveur FiveM
     */
    async syncWithServer() {
        try {
            console.log(`🔄 Synchronisation avec ${this.serverIP}:${this.serverPort}...`);
            
            const vehiculesData = await this.fetchVehiclesFromServer();
            
            if (vehiculesData && vehiculesData.length > 0) {
                await this.updateLocalVehicles(vehiculesData);
                this.lastSync = new Date();
                console.log(`✅ ${vehiculesData.length} véhicules synchronisés avec succès`);
            } else {
                console.log('⚠️ Aucune donnée reçue du serveur');
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la synchronisation:', error.message);
        }
    }

    /**
     * Récupère les véhicules depuis le serveur FiveM
     */
    fetchVehiclesFromServer() {
        return new Promise((resolve, reject) => {
            const url = `http://${this.serverIP}:${this.serverPort}${this.apiEndpoint}`;
            const protocol = url.startsWith('https') ? https : http;
            
            const req = protocol.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Discord-Bot-Concessionnaire/1.0'
                }
            }, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(this.parseServerData(jsonData));
                    } catch (error) {
                        reject(new Error('Format de réponse invalide: ' + error.message));
                    }
                });
            });
            
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Timeout de connexion au serveur'));
            });
            
            req.on('error', (error) => {
                reject(new Error('Erreur de connexion: ' + error.message));
            });
        });
    }

    /**
     * Parse les données du serveur selon différents formats possibles
     */
    parseServerData(data) {
        // Format 1: Array direct de véhicules
        if (Array.isArray(data)) {
            return data.map(vehicle => this.normalizeVehicleData(vehicle));
        }
        
        // Format 2: Objet avec propriété vehicles
        if (data.vehicles && Array.isArray(data.vehicles)) {
            return data.vehicles.map(vehicle => this.normalizeVehicleData(vehicle));
        }
        
        // Format 3: Objet avec propriété data
        if (data.data && Array.isArray(data.data)) {
            return data.data.map(vehicle => this.normalizeVehicleData(vehicle));
        }
        
        // Format 4: Objet clé-valeur (véhicule ID -> données)
        if (typeof data === 'object' && !Array.isArray(data)) {
            return Object.entries(data).map(([id, vehicle]) => 
                this.normalizeVehicleData({ ...vehicle, id })
            );
        }
        
        throw new Error('Format de données non reconnu');
    }

    /**
     * Normalise les données d'un véhicule
     */
    normalizeVehicleData(vehicle) {
        return {
            id: vehicle.id || vehicle.model || vehicle.spawn_code,
            nom: vehicle.nom || vehicle.name || vehicle.display_name || `Véhicule ${vehicle.id}`,
            marque: vehicle.marque || vehicle.brand || vehicle.make || 'Inconnue',
            prix: parseInt(vehicle.prix || vehicle.price || vehicle.cost || 0),
            categorie: vehicle.categorie || vehicle.category || vehicle.class || 'Autre',
            stock: parseInt(vehicle.stock || vehicle.quantity || 999),
            image: vehicle.image || vehicle.img_url || null,
            dateSync: new Date().toISOString()
        };
    }

    /**
     * Met à jour les véhicules locaux
     */
    async updateLocalVehicles(serverVehicles) {
        let added = 0;
        let updated = 0;
        let unchanged = 0;

        for (const serverVehicle of serverVehicles) {
            const existingVehicle = this.client.vehicules.get(serverVehicle.id);
            
            if (!existingVehicle) {
                // Nouveau véhicule
                this.client.vehicules.set(serverVehicle.id, serverVehicle);
                added++;
            } else {
                // Vérifier s'il y a des changements
                const hasChanges = 
                    existingVehicle.prix !== serverVehicle.prix ||
                    existingVehicle.stock !== serverVehicle.stock ||
                    existingVehicle.nom !== serverVehicle.nom;
                
                if (hasChanges) {
                    // Garder certaines données locales
                    serverVehicle.dateAjout = existingVehicle.dateAjout;
                    this.client.vehicules.set(serverVehicle.id, serverVehicle);
                    updated++;
                } else {
                    unchanged++;
                }
            }
        }

        // Sauvegarder les changements
        if (added > 0 || updated > 0) {
            DataManager.saveVehicules(this.client);
        }

        console.log(`📊 Synchronisation terminée: ${added} ajoutés, ${updated} modifiés, ${unchanged} inchangés`);
        
        // Envoyer notification si configuré
        await this.sendSyncNotification(added, updated, unchanged);
    }

    /**
     * Envoie une notification de synchronisation
     */
    async sendSyncNotification(added, updated, unchanged) {
        if (!process.env.CHANNEL_LOGS || (added === 0 && updated === 0)) return;
        
        try {
            const channel = this.client.channels.cache.get(process.env.CHANNEL_LOGS);
            if (!channel) return;

            const embed = {
                title: '🔄 Synchronisation serveur FiveM',
                color: 0x00FF00,
                fields: [
                    { name: '➕ Véhicules ajoutés', value: added.toString(), inline: true },
                    { name: '🔄 Véhicules modifiés', value: updated.toString(), inline: true },
                    { name: '📊 Total véhicules', value: this.client.vehicules.size.toString(), inline: true }
                ],
                timestamp: new Date().toISOString(),
                footer: { text: `Serveur: ${this.serverIP}:${this.serverPort}` }
            };

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erreur lors de l\'envoi de notification:', error.message);
        }
    }

    /**
     * Synchronisation manuelle
     */
    async manualSync() {
        console.log('🔄 Synchronisation manuelle démarrée...');
        await this.syncWithServer();
        return {
            success: true,
            lastSync: this.lastSync,
            vehicleCount: this.client.vehicules.size
        };
    }

    /**
     * Obtenir le statut de la synchronisation
     */
    getSyncStatus() {
        return {
            isActive: !!this.syncTimer,
            lastSync: this.lastSync,
            serverIP: this.serverIP,
            serverPort: this.serverPort,
            syncInterval: this.syncInterval,
            vehicleCount: this.client.vehicules.size
        };
    }
}

module.exports = FiveMSync;
