const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { getChannels } = require('./constants');

class PresenceMonitor {
    constructor(client) {
        this.client = client;
        this.statsUpdateInterval = 5 * 60 * 1000; // 5 minutes
        this.dailyReportInterval = 24 * 60 * 60 * 1000; // 24 heures
        this.lastStatsUpdate = 0;
        this.lastDailyReport = 0;
        this.statsMessageId = null;
        this.monitoringMessageId = null;
        
        this.startMonitoring();
    }

    startMonitoring() {
        // Initialisation immédiate
        this.initializeStatsMessage().then(() => {
            console.log('📊 Message de statistiques initialisé');
        }).catch(error => {
            console.error('❌ Erreur lors de l\'initialisation du message de stats:', error);
        });

        // Mise à jour régulière des stats
        setInterval(async () => {
            try {
                await this.updatePresenceStats();
                console.log('📊 Stats de présence mises à jour');
            } catch (error) {
                console.error('❌ Erreur lors de la mise à jour des stats:', error);
            }
        }, this.statsUpdateInterval);

        // Rapport journalier
        setInterval(() => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() < 5) {
                this.sendDailyReport().catch(error => {
                    console.error('❌ Erreur lors de l\'envoi du rapport journalier:', error);
                });
            }
        }, 5 * 60 * 1000);

        console.log('📊 Monitoring de présence démarré dans le salon', process.env.CHANNEL_STATS_PRESENCE);
    }

    async initializeStatsMessage() {
        try {
            const channels = getChannels();
            
            // Initialisation du message de stats de présence
            const statsChannelId = channels.statsPresence;
            if (!statsChannelId) {
                console.log('⚠️ CHANNEL_STATS_PRESENCE non configuré ou invalide');
                return;
            }

            // Initialisation du message de monitoring
            const monitoringChannelId = channels.monitoringService;
            if (!monitoringChannelId) {
                console.log('⚠️ CHANNEL_MONITORING_SERVICE non configuré ou invalide');
                return;
            }

            console.log(`📊 Initialisation des messages de stats...`);
            
            const statsChannel = this.client.channels.cache.get(statsChannelId);
            const monitoringChannel = this.client.channels.cache.get(monitoringChannelId);
            
            if (!statsChannel || !monitoringChannel) {
                console.log(`⚠️ Un ou plusieurs canaux non trouvés ou inaccessibles`);
                return;
            }

            // Nettoyer et initialiser le canal des stats
            const statsMessages = await statsChannel.messages.fetch({ limit: 20 });
            const oldStatsMessages = statsMessages.filter(msg => 
                msg.author.id === this.client.user.id && 
                msg.embeds.length > 0 &&
                msg.embeds[0].title === '📊 Statistiques de Présence - Temps Réel'
            );

            for (const oldMsg of oldStatsMessages.values()) {
                try {
                    await oldMsg.delete();
                } catch (error) {
                    console.error('❌ Erreur lors de la suppression d\'un ancien message de stats:', error);
                }
            }

            // Nettoyer et initialiser le canal de monitoring
            const monitoringMessages = await monitoringChannel.messages.fetch({ limit: 20 });
            const oldMonitoringMessages = monitoringMessages.filter(msg => 
                msg.author.id === this.client.user.id && 
                msg.embeds.length > 0 &&
                msg.embeds[0].title === 'Monitoring des Services'
            );

            for (const oldMsg of oldMonitoringMessages.values()) {
                try {
                    await oldMsg.delete();
                } catch (error) {
                    console.error('❌ Erreur lors de la suppression d\'un ancien message de monitoring:', error);
                }
            }

            // Créer les nouveaux messages
            const newStatsMessage = await statsChannel.send({ 
                embeds: [this.createDetailedStatsEmbed()]
            });
            this.statsMessageId = newStatsMessage.id;
            
            const newMonitoringMessage = await monitoringChannel.send({ 
                embeds: [this.createMonitoringEmbed()]
            });
            this.monitoringMessageId = newMonitoringMessage.id;
            
            console.log('✅ Messages initialisés - Stats:', this.statsMessageId, 'Monitoring:', this.monitoringMessageId);

            // Les nouveaux messages sont déjà créés et les IDs sont stockés plus haut
            // Pas besoin de cette partie du code car elle fait double emploi
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du message de stats:', error);
        }
    }

    createMonitoringEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('Monitoring des Services')
            .setDescription('📊 Vue d\'ensemble des services en cours')
            .addFields(
                { name: '👥 Vendeurs en service', value: '0', inline: true },
                { name: '⏱️ Durée moyenne', value: 'N/A', inline: true },
                { name: '📅 Sessions aujourd\'hui', value: '0', inline: true },
                { name: '🔄 Dernière mise à jour', value: new Date().toLocaleString('fr-FR'), inline: false }
            )
            .setColor('#2ecc71')
            .setFooter({ text: 'Vue simplifiée des services • Mise à jour toutes les 5 minutes' })
            .setTimestamp();

        return embed;
    }
    
    createDetailedStatsEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('📊 Statistiques de Présence - Temps Réel')
            .setDescription('Chargement des statistiques détaillées...')
            .setColor('#3498db')
            .setFooter({ text: 'Vue détaillée des statistiques • Mise à jour toutes les 5 minutes' })
            .setTimestamp();

        return embed;
    }

    async updatePresenceStats() {
        try {
            const channels = getChannels();
            const stats = { statsMessage: null, monitoringMessage: null };

            // Récupérer les messages
            if (this.statsMessageId) {
                const statsChannel = this.client.channels.cache.get(channels.statsPresence);
                if (statsChannel) {
                    stats.statsMessage = await statsChannel.messages.fetch(this.statsMessageId).catch(() => null);
                }
            }

            if (this.monitoringMessageId) {
                const monitoringChannel = this.client.channels.cache.get(channels.monitoringService);
                if (monitoringChannel) {
                    stats.monitoringMessage = await monitoringChannel.messages.fetch(this.monitoringMessageId).catch(() => null);
                }
            }

            if (!stats.statsMessage && !stats.monitoringMessage) {
                console.log('⚠️ Messages de stats non trouvés, réinitialisation...');
                await this.initializeStatsMessage();
                return;
            }

            // Charger les données de services
            const servicePath = path.join(__dirname, '..', 'data', 'services.json');
            let serviceData = { 
                activeServices: [],
                completedServices: [],
                history: []
            };
            try {
                const data = await fs.readFile(servicePath, 'utf8');
                serviceData = JSON.parse(data);
                if (!serviceData.completedServices) serviceData.completedServices = [];
                if (!serviceData.history) serviceData.history = [];
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // Créer le fichier s'il n'existe pas
                    await fs.writeFile(servicePath, JSON.stringify(serviceData, null, 2), 'utf8');
                    console.log('📋 Fichier services.json initialisé');
                } else {
                    console.error('Erreur lecture services:', error);
                }
            }

            // Calculer les statistiques
            const now = Date.now();
            const activeSessions = serviceData.activeServices.length;
            const durations = serviceData.activeServices.map(s => now - s.startTime);
            const averageDuration = durations.length > 0 
                ? Math.floor(durations.reduce((a, b) => a + b, 0) / durations.length)
                : 0;

            // Formater la durée moyenne
            const formatDuration = (ms) => {
                const minutes = Math.floor(ms / 60000);
                const hours = Math.floor(minutes / 60);
                const remainingMinutes = minutes % 60;
                return hours > 0 
                    ? `${hours}h${remainingMinutes}min`
                    : `${remainingMinutes}min`;
            };

            // Calculer les statistiques journalières
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayServices = serviceData.completedServices.filter(service => {
                const serviceDate = new Date(service.endTime);
                return serviceDate >= today;
            });

            const todayTotalServices = todayServices.length + activeSessions;
            const todayTotalDuration = todayServices.reduce((total, service) => 
                total + (service.endTime - service.startTime), 0);
            const todayAverageDuration = todayTotalServices > 0 ? todayTotalDuration / todayTotalServices : 0;
            const todayUniqueEmployees = new Set([
                ...todayServices.map(s => s.userId),
                ...serviceData.activeServices.map(s => s.userId)
            ]).size;

            // Calculer les statistiques hebdomadaires
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Début de la semaine
            weekStart.setHours(0, 0, 0, 0);
            
            const weekServices = serviceData.completedServices.filter(service => {
                const serviceDate = new Date(service.endTime);
                return serviceDate >= weekStart;
            });

            const weekTotalServices = weekServices.length + activeSessions;
            const weekTotalDuration = weekServices.reduce((total, service) => 
                total + (service.endTime - service.startTime), 0);
            const daysIntoWeek = (now - weekStart) / (24 * 60 * 60 * 1000);
            const weekSessionsPerDay = daysIntoWeek > 0 ? weekTotalServices / daysIntoWeek : 0;
            const weekUniqueEmployees = new Set([
                ...weekServices.map(s => s.userId),
                ...serviceData.activeServices.map(s => s.userId)
            ]).size;

            let statusColor = '#2ecc71'; // Vert par défaut
            let statusEmoji = '🟢';
            let statusText = 'Activité normale';

            if (activeSessions === 0) {
                statusColor = '#e74c3c'; // Rouge
                statusEmoji = '🔴';
                statusText = 'Aucune activité';
            } else if (todayTotalServices < 3) { // Seuil arbitraire, à ajuster selon les besoins
                statusColor = '#f1c40f'; // Jaune
                statusEmoji = '🟡';
                statusText = 'Activité réduite';
            }

            const embed = new EmbedBuilder()
                .setTitle('� Statistiques de Présence - Temps Réel')
                .setDescription([
                    `${statusEmoji} Actuellement en Service`,
                    activeSessions > 0 
                        ? serviceData.activeServices.map(s => `👤 <@${s.userId}>`).join('\n')
                        : '➖ Aucun employé en service',
                    '',
                    '📅 Aujourd\'hui',
                    `🔢 ${todayTotalServices} sessions`,
                    `👥 ${todayUniqueEmployees} employés`,
                    `⏱️ ${formatDuration(todayTotalDuration)} total`,
                    `📊 ${formatDuration(todayAverageDuration)} moyenne`,
                    '',
                    '� Cette Semaine',
                    `🔢 ${weekTotalServices} sessions`,
                    `👥 ${weekUniqueEmployees} employés`,
                    `⏱️ ${formatDuration(weekTotalDuration)} total`,
                    `📊 ${weekSessionsPerDay.toFixed(1)} sessions/jour`,
                    '',
                    '📈 État Général',
                    `${statusEmoji} ${statusText}`,
                ].join('\n'))
                .setColor(statusColor)
                .setFooter({ text: `Mise à jour automatique toutes les ${Math.floor(this.statsUpdateInterval / 60000)} minutes`})
                .setTimestamp();

            // Mettre à jour le message de monitoring (vue simplifiée)
            if (stats.monitoringMessage) {
                const monitoringEmbed = new EmbedBuilder()
                    .setTitle('Monitoring des Services')
                    .setDescription('📊 Vue d\'ensemble des services en cours')
                    .addFields(
                        { name: '👥 Vendeurs en service', value: activeSessions.toString(), inline: true },
                        { name: '⏱️ Durée moyenne', value: formatDuration(averageDuration), inline: true },
                        { name: '📅 Sessions aujourd\'hui', value: todayTotalServices.toString(), inline: true }
                    )
                    .setColor(statusColor)
                    .setFooter({ text: 'Vue simplifiée des services • Mise à jour toutes les 5 minutes' })
                    .setTimestamp();

                await stats.monitoringMessage.edit({ embeds: [monitoringEmbed] });
            }

            // Mettre à jour le message de statistiques détaillées
            if (stats.statsMessage) {
                await stats.statsMessage.edit({ embeds: [embed] });
            }

            this.lastStatsUpdate = now;
            console.log('✅ Messages de stats mis à jour');

        } catch (error) {
            console.error('❌ Erreur mise à jour stats:', error);
            // En cas d'erreur, tenter de réinitialiser les messages
            if (error.code === 10008) { // Message inconnu
                console.log('🔄 Réinitialisation des messages de stats...');
                this.statsMessageId = null;
                this.monitoringMessageId = null;
                await this.initializeStatsMessage();
            }
        }
    }

    async sendDailyReport() {
        try {
            const channels = getChannels();
            const channelId = channels.logs;
            if (!channelId) return;

            const channel = this.client.channels.cache.get(channelId);
            if (!channel) return;

            // Charger les données de services
            const servicePath = path.join(__dirname, '..', 'data', 'services.json');
            let serviceData = { activeServices: [], completedServices: [] };
            try {
                const data = await fs.readFile(servicePath, 'utf8');
                serviceData = JSON.parse(data);
            } catch (error) {
                console.error('Erreur lecture services:', error);
                return;
            }

            // Filtrer les services du jour précédent
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const yesterdayServices = serviceData.completedServices.filter(service => {
                const serviceDate = new Date(service.endTime);
                return serviceDate >= yesterday && serviceDate < today;
            });

            // Calculer les statistiques
            const totalServices = yesterdayServices.length;
            const totalDuration = yesterdayServices.reduce((total, service) => 
                total + (service.endTime - service.startTime), 0);
            const averageDuration = totalServices > 0 ? totalDuration / totalServices : 0;

            // Formater la durée moyenne
            const formatDuration = (ms) => {
                const minutes = Math.floor(ms / 60000);
                const hours = Math.floor(minutes / 60);
                const remainingMinutes = minutes % 60;
                return hours > 0 
                    ? `${hours}h${remainingMinutes}min`
                    : `${remainingMinutes}min`;
            };

            const embed = new EmbedBuilder()
                .setTitle('📊 Rapport Journalier - Services')
                .setDescription(`Statistiques pour le ${yesterday.toLocaleDateString('fr-FR')}`)
                .addFields(
                    { name: '📅 Nombre de services', value: totalServices.toString(), inline: true },
                    { name: '⏱️ Durée moyenne', value: formatDuration(averageDuration), inline: true },
                    { name: '⌛ Durée totale', value: formatDuration(totalDuration), inline: true }
                )
                .setColor('#3498db')
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            this.lastDailyReport = Date.now();

        } catch (error) {
            console.error('❌ Erreur envoi rapport journalier:', error);
        }
    }
}

module.exports = PresenceMonitor;
