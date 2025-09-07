const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class PlayerMonitoring {
    constructor(client) {
        this.client = client;
        this.monitoringData = {
            dealers: new Map(), // Vendeurs connectés
            activity: [], // Historique d'activité
            shifts: new Map(), // Sessions de travail
            alerts: [] // Alertes système
        };
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.dataFile = path.join(__dirname, '..', 'data', 'monitoring.json');
        
        // Configuration
        this.config = {
            checkInterval: 30000, // 30 secondes
            jobName: 'concessionnaire',
            inactivityThreshold: 300000, // 5 minutes
            shiftMinDuration: 600000, // 10 minutes minimum
        };
        
        this.loadMonitoringData();
    }

    async loadMonitoringData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            const parsed = JSON.parse(data);
            this.monitoringData.activity = parsed.activity || [];
            this.monitoringData.alerts = parsed.alerts || [];
            
            // Convertir les Maps depuis JSON
            if (parsed.dealers) {
                this.monitoringData.dealers = new Map(Object.entries(parsed.dealers));
            }
            if (parsed.shifts) {
                this.monitoringData.shifts = new Map(Object.entries(parsed.shifts));
            }
        } catch (error) {
            console.log('📊 Première initialisation du monitoring');
            await this.saveMonitoringData();
        }
    }

    async saveMonitoringData() {
        try {
            const dataToSave = {
                activity: this.monitoringData.activity,
                alerts: this.monitoringData.alerts,
                dealers: Object.fromEntries(this.monitoringData.dealers),
                shifts: Object.fromEntries(this.monitoringData.shifts),
                lastUpdate: new Date().toISOString()
            };

            await fs.writeFile(this.dataFile, JSON.stringify(dataToSave, null, 2));
        } catch (error) {
            console.error('❌ Erreur sauvegarde monitoring:', error);
        }
    }

    async startMonitoring() {
        if (this.isMonitoring) {
            return { success: false, message: 'Le monitoring est déjà actif' };
        }

        console.log('🔍 Démarrage du monitoring des vendeurs...');
        this.isMonitoring = true;
        
        // Vérification immédiate
        await this.checkPlayers();
        
        // Puis monitoring périodique
        this.monitoringInterval = setInterval(async () => {
            await this.checkPlayers();
        }, this.config.checkInterval);

        return { success: true, message: 'Monitoring des vendeurs démarré' };
    }

    stopMonitoring() {
        if (!this.isMonitoring) {
            return { success: false, message: 'Le monitoring n\'est pas actif' };
        }

        console.log('🔍 Arrêt du monitoring des vendeurs...');
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        return { success: true, message: 'Monitoring des vendeurs arrêté' };
    }

    async checkPlayers() {
        try {
            // Récupérer la liste des joueurs connectés
            const players = await this.fetchOnlinePlayers();
            if (!players || players.length === 0) {
                return;
            }

            // Analyser chaque joueur
            const currentTime = Date.now();
            const dealersFound = [];

            for (const player of players) {
                if (this.isDealerJob(player)) {
                    dealersFound.push(player);
                    await this.trackDealer(player, currentTime);
                }
            }

            // Vérifier les déconnexions
            await this.checkDisconnections(dealersFound, currentTime);
            
            // Vérifier l'inactivité
            await this.checkInactivity(currentTime);
            
            // Sauvegarder
            await this.saveMonitoringData();

        } catch (error) {
            console.error('❌ Erreur monitoring:', error);
            this.addAlert('Erreur de monitoring', 'error', error.message);
        }
    }

    async fetchOnlinePlayers() {
        const fivemIP = process.env.FIVEM_SERVER_IP;
        const fivemPort = process.env.FIVEM_SERVER_PORT;

        if (!fivemIP || !fivemPort) {
            throw new Error('Configuration FiveM manquante');
        }

        // Utiliser notre API de monitoring personnalisée
        const response = await fetch(`http://${fivemIP}:${fivemPort}/monitoring/players`);
        if (!response.ok) {
            throw new Error(`Erreur API FiveM Monitoring: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(`Erreur API: ${data.error}`);
        }

        return data.players || [];
    }

    isDealerJob(player) {
        return player.job && 
               player.job.name === this.config.jobName;
    }

    async trackDealer(player, currentTime) {
        const playerId = player.id;
        const playerName = player.name;
        
        const existingDealer = this.monitoringData.dealers.get(playerId);
        
        if (!existingDealer) {
            // Nouveau vendeur connecté
            const dealerData = {
                id: playerId,
                name: playerName,
                job: player.job,
                firstSeen: currentTime,
                lastSeen: currentTime,
                totalTime: 0,
                isActive: true,
                lastActivity: currentTime,
                activities: []
            };
            
            this.monitoringData.dealers.set(playerId, dealerData);
            
            // Log de connexion
            this.addActivity('dealer_connect', playerId, {
                name: playerName,
                job: player.job,
                timestamp: currentTime
            });

            // Notification Discord
            await this.sendDealerNotification('connect', dealerData);
            
        } else {
            // Vendeur existant - mise à jour
            existingDealer.lastSeen = currentTime;
            existingDealer.isActive = true;
            existingDealer.totalTime = currentTime - existingDealer.firstSeen;
            
            // Vérifier changement de grade
            if (existingDealer.job.grade !== player.job.grade) {
                this.addActivity('job_promotion', playerId, {
                    oldGrade: existingDealer.job.grade,
                    newGrade: player.job.grade,
                    timestamp: currentTime
                });
                existingDealer.job = player.job;
            }
        }
    }

    async checkDisconnections(onlineDealers, currentTime) {
        const onlineIds = new Set(onlineDealers.map(d => d.id));
        
        for (const [dealerId, dealer] of this.monitoringData.dealers) {
            if (!onlineIds.has(dealerId) && dealer.isActive) {
                // Vendeur déconnecté
                dealer.isActive = false;
                dealer.disconnectTime = currentTime;
                
                const sessionDuration = currentTime - dealer.firstSeen;
                
                this.addActivity('dealer_disconnect', dealerId, {
                    name: dealer.name,
                    sessionDuration: sessionDuration,
                    timestamp: currentTime
                });

                // Notification si session courte
                if (sessionDuration < this.config.shiftMinDuration) {
                    await this.sendDealerNotification('short_session', dealer, sessionDuration);
                }

                await this.sendDealerNotification('disconnect', dealer, sessionDuration);
            }
        }
    }

    async checkInactivity(currentTime) {
        for (const [dealerId, dealer] of this.monitoringData.dealers) {
            if (dealer.isActive) {
                const inactiveTime = currentTime - dealer.lastActivity;
                
                if (inactiveTime > this.config.inactivityThreshold) {
                    this.addAlert('Vendeur inactif', 'warning', 
                        `${dealer.name} est inactif depuis ${Math.round(inactiveTime / 60000)} minutes`
                    );
                }
            }
        }
    }

    addActivity(type, playerId, data) {
        this.monitoringData.activity.push({
            type,
            playerId,
            data,
            timestamp: Date.now()
        });

        // Garder seulement les 1000 dernières activités
        if (this.monitoringData.activity.length > 1000) {
            this.monitoringData.activity = this.monitoringData.activity.slice(-1000);
        }
    }

    addAlert(title, level, message) {
        this.monitoringData.alerts.push({
            title,
            level, // 'info', 'warning', 'error'
            message,
            timestamp: Date.now()
        });

        // Garder seulement les 100 dernières alertes
        if (this.monitoringData.alerts.length > 100) {
            this.monitoringData.alerts = this.monitoringData.alerts.slice(-100);
        }
    }

    async sendDealerNotification(type, dealer, extra = null) {
        try {
            const guild = this.client.guilds.cache.first();
            if (!guild) return;

            // Chercher le canal de logs
            const logChannel = guild.channels.cache.find(c => 
                c.name === 'logs-systeme' || c.name === 'monitoring-vendeurs'
            );
            if (!logChannel) return;

            let embed;
            const timestamp = new Date().toLocaleString('fr-FR');

            switch (type) {
                case 'connect':
                    embed = new EmbedBuilder()
                        .setTitle('🟢 Vendeur Connecté')
                        .setDescription(`**${dealer.name}** vient de se connecter`)
                        .addFields(
                            { name: '👤 Nom', value: dealer.name, inline: true },
                            { name: '🏢 Grade', value: dealer.job.label || 'Vendeur', inline: true },
                            { name: '🕐 Heure', value: timestamp, inline: true }
                        )
                        .setColor('#00FF00')
                        .setTimestamp();
                    break;

                case 'disconnect':
                    const duration = this.formatDuration(extra);
                    embed = new EmbedBuilder()
                        .setTitle('🔴 Vendeur Déconnecté')
                        .setDescription(`**${dealer.name}** s'est déconnecté`)
                        .addFields(
                            { name: '👤 Nom', value: dealer.name, inline: true },
                            { name: '⏱️ Durée de session', value: duration, inline: true },
                            { name: '🕐 Heure', value: timestamp, inline: true }
                        )
                        .setColor('#FF0000')
                        .setTimestamp();
                    break;

                case 'short_session':
                    const shortDuration = this.formatDuration(extra);
                    embed = new EmbedBuilder()
                        .setTitle('⚠️ Session Courte')
                        .setDescription(`**${dealer.name}** session très courte`)
                        .addFields(
                            { name: '👤 Nom', value: dealer.name, inline: true },
                            { name: '⏱️ Durée', value: shortDuration, inline: true },
                            { name: '📊 Statut', value: 'Session < 10min', inline: true }
                        )
                        .setColor('#FFA500')
                        .setTimestamp();
                    break;
            }

            if (embed) {
                await logChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error('❌ Erreur notification:', error);
        }
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    // API pour les commandes Discord
    getOnlineDealers() {
        return Array.from(this.monitoringData.dealers.values())
            .filter(dealer => dealer.isActive);
    }

    getDealerStats(playerId) {
        return this.monitoringData.dealers.get(playerId);
    }

    getRecentActivity(limit = 10) {
        return this.monitoringData.activity
            .slice(-limit)
            .reverse();
    }

    getAlerts(limit = 5) {
        return this.monitoringData.alerts
            .slice(-limit)
            .reverse();
    }

    generateDashboard() {
        const onlineDealers = this.getOnlineDealers();
        const recentActivity = this.getRecentActivity(5);
        const alerts = this.getAlerts(3);

        return {
            onlineDealers,
            totalOnline: onlineDealers.length,
            recentActivity,
            alerts,
            isMonitoring: this.isMonitoring,
            lastUpdate: new Date().toLocaleString('fr-FR')
        };
    }
}

module.exports = PlayerMonitoring;
