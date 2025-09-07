const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class PresenceMonitor {
    constructor(client) {
        this.client = client;
        this.statsUpdateInterval = 5 * 60 * 1000; // 5 minutes
        this.dailyReportInterval = 24 * 60 * 60 * 1000; // 24 heures
        this.lastStatsUpdate = 0;
        this.lastDailyReport = 0;
        this.statsMessageId = null; // ID du message de stats à modifier
        
        this.startMonitoring();
    }

    startMonitoring() {
        // Initialiser le message au démarrage avec un délai
        setTimeout(() => {
            this.initializeStatsMessage();
        }, 5000); // 5 secondes après le démarrage

        // Mise à jour des statistiques toutes les 5 minutes
        setInterval(() => {
            this.updatePresenceStats();
        }, this.statsUpdateInterval);

        // Rapport quotidien à minuit
        setInterval(() => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() < 5) {
                this.sendDailyReport();
            }
        }, 5 * 60 * 1000); // Vérifier toutes les 5 minutes autour de minuit

        console.log('📊 Monitoring de présence démarré');
    }

    async initializeStatsMessage() {
        try {
            const channelId = process.env.CHANNEL_STATS_PRESENCE;
            if (!channelId) return;

            const channel = this.client.channels.cache.get(channelId);
            if (!channel) return;

            // Chercher le dernier message du bot dans le canal
            const messages = await channel.messages.fetch({ limit: 10 });
            const botMessage = messages.find(msg => 
                msg.author.id === this.client.user.id && 
                msg.embeds.length > 0 && 
                msg.embeds[0].title?.includes('Statistiques de Présence')
            );

            if (botMessage) {
                this.statsMessageId = botMessage.id;
                console.log('📊 Message de statistiques existant trouvé');
                // Lancer immédiatement une mise à jour
                this.updatePresenceStats();
            } else {
                console.log('📊 Aucun message de statistiques trouvé, création au prochain cycle');
            }

        } catch (error) {
            console.error('❌ Erreur initialisation message stats:', error);
        }
    }

    async updatePresenceStats() {
        try {
            const serviceData = await this.loadServiceData();
            const stats = await this.calculateCurrentStats(serviceData);
            
            await this.sendStatsUpdate(stats);
            this.lastStatsUpdate = Date.now();

        } catch (error) {
            console.error('❌ Erreur mise à jour stats présence:', error);
        }
    }

    async calculateCurrentStats(serviceData) {
        const now = Date.now();
        const activeServices = serviceData.activeServices || [];
        const history = serviceData.history || [];

        // Statistiques actuelles
        const currentStats = {
            activeCount: activeServices.length,
            activeUsers: activeServices.map(s => ({
                userName: s.userName,
                poste: s.poste,
                duration: now - s.startTime,
                startTime: s.startTime
            }))
        };

        // Statistiques quotidiennes
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.getTime();

        const todayServices = history.filter(s => 
            s.startTime >= todayStart || (s.endTime && s.endTime >= todayStart)
        );

        const dailyStats = {
            totalSessions: todayServices.length,
            totalDuration: todayServices.reduce((sum, s) => sum + (s.duration || 0), 0),
            uniqueUsers: [...new Set(todayServices.map(s => s.userId))].length,
            averageSession: todayServices.length > 0 ? 
                todayServices.reduce((sum, s) => sum + (s.duration || 0), 0) / todayServices.length : 0
        };

        // Statistiques hebdomadaires
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
        const weekServices = history.filter(s => s.startTime >= weekAgo);

        const weeklyStats = {
            totalSessions: weekServices.length,
            totalDuration: weekServices.reduce((sum, s) => sum + (s.duration || 0), 0),
            uniqueUsers: [...new Set(weekServices.map(s => s.userId))].length,
            averageDaily: weekServices.length / 7
        };

        return {
            current: currentStats,
            daily: dailyStats,
            weekly: weeklyStats,
            timestamp: now
        };
    }

    async sendStatsUpdate(stats) {
        try {
            const channelId = process.env.CHANNEL_STATS_PRESENCE;
            if (!channelId) {
                console.log('⚠️ CHANNEL_STATS_PRESENCE non configuré');
                return;
            }

            const channel = this.client.channels.cache.get(channelId);
            if (!channel) {
                console.log(`⚠️ Canal stats présence ${channelId} introuvable`);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('📊 Statistiques de Présence - Temps Réel')
                .setColor('#3498DB')
                .setTimestamp()
                .setFooter({ text: 'Mise à jour automatique toutes les 5 minutes' });

            // Section service actuel
            if (stats.current.activeCount > 0) {
                const activeList = stats.current.activeUsers
                    .map(user => `• **${user.userName}** - ${user.poste} *(${this.formatDuration(user.duration)})*`)
                    .join('\n');

                embed.addFields({
                    name: `🟢 Actuellement en Service (${stats.current.activeCount})`,
                    value: activeList,
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '🟢 Actuellement en Service',
                    value: '➖ Aucun employé en service',
                    inline: false
                });
            }

            // Statistiques du jour
            embed.addFields(
                { 
                    name: '📅 Aujourd\'hui', 
                    value: `🔢 **${stats.daily.totalSessions}** sessions\n👥 **${stats.daily.uniqueUsers}** employés\n⏱️ **${this.formatDuration(stats.daily.totalDuration)}** total\n📊 **${this.formatDuration(stats.daily.averageSession)}** moyenne`, 
                    inline: true 
                },
                { 
                    name: '📆 Cette Semaine', 
                    value: `🔢 **${stats.weekly.totalSessions}** sessions\n👥 **${stats.weekly.uniqueUsers}** employés\n⏱️ **${this.formatDuration(stats.weekly.totalDuration)}** total\n📊 **${stats.weekly.averageDaily.toFixed(1)}** sessions/jour`, 
                    inline: true 
                }
            );

            // Indicateur de performance
            let performanceIndicator = '🟡 Normal';
            let performanceColor = '#FFA500';

            if (stats.current.activeCount >= 3) {
                performanceIndicator = '🟢 Excellente activité';
                performanceColor = '#00FF00';
            } else if (stats.current.activeCount === 0) {
                performanceIndicator = '🔴 Aucune activité';
                performanceColor = '#FF0000';
            }

            embed.setColor(performanceColor);
            embed.addFields({
                name: '📈 État Général',
                value: performanceIndicator,
                inline: false
            });

            // Essayer de modifier le message existant, sinon créer un nouveau
            if (this.statsMessageId) {
                try {
                    const existingMessage = await channel.messages.fetch(this.statsMessageId);
                    await existingMessage.edit({ embeds: [embed] });
                    console.log('✅ Message de statistiques mis à jour');
                    return;
                } catch (error) {
                    console.log('⚠️ Message existant introuvable, création d\'un nouveau...');
                    this.statsMessageId = null;
                }
            }

            // Créer un nouveau message si nécessaire
            const newMessage = await channel.send({ embeds: [embed] });
            this.statsMessageId = newMessage.id;
            console.log('✅ Nouveau message de statistiques créé');

        } catch (error) {
            console.error('❌ Erreur envoi stats présence:', error);
        }
    }

    async sendDailyReport() {
        try {
            if (Date.now() - this.lastDailyReport < 20 * 60 * 60 * 1000) {
                return; // Éviter les doublons (moins de 20h depuis le dernier)
            }

            const channelId = process.env.CHANNEL_LOGS;
            if (!channelId) return;

            const channel = this.client.channels.cache.get(channelId);
            if (!channel) return;

            const serviceData = await this.loadServiceData();
            const yesterdayStats = await this.calculateYesterdayStats(serviceData);

            const embed = new EmbedBuilder()
                .setTitle('📋 Rapport Quotidien de Présence')
                .setDescription(`Activité du **${new Date(yesterdayStats.date).toLocaleDateString('fr-FR')}**`)
                .setColor('#9B59B6')
                .addFields(
                    { name: '📊 Sessions Totales', value: `${yesterdayStats.totalSessions}`, inline: true },
                    { name: '👥 Employés Actifs', value: `${yesterdayStats.uniqueUsers}`, inline: true },
                    { name: '⏱️ Temps Total', value: this.formatDuration(yesterdayStats.totalDuration), inline: true },
                    { name: '📈 Durée Moyenne', value: this.formatDuration(yesterdayStats.averageSession), inline: true },
                    { name: '🏆 Plus Long Service', value: this.formatDuration(yesterdayStats.longestSession), inline: true },
                    { name: '🕐 Heures de Pointe', value: yesterdayStats.peakHours, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Rapport automatique quotidien' });

            if (yesterdayStats.topUsers.length > 0) {
                const topList = yesterdayStats.topUsers
                    .slice(0, 5)
                    .map((user, index) => `${index + 1}. **${user.userName}** - ${this.formatDuration(user.totalTime)}`)
                    .join('\n');

                embed.addFields({
                    name: '🏅 Top Employés de la Journée',
                    value: topList,
                    inline: false
                });
            }

            await channel.send({ embeds: [embed] });
            this.lastDailyReport = Date.now();
            console.log('✅ Rapport quotidien envoyé');

        } catch (error) {
            console.error('❌ Erreur rapport quotidien:', error);
        }
    }

    async calculateYesterdayStats(serviceData) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayStart = yesterday.getTime();
        const yesterdayEnd = yesterdayStart + (24 * 60 * 60 * 1000);

        const history = serviceData.history || [];
        const yesterdayServices = history.filter(s => 
            s.startTime >= yesterdayStart && s.startTime < yesterdayEnd
        );

        const userStats = {};
        yesterdayServices.forEach(service => {
            if (!userStats[service.userId]) {
                userStats[service.userId] = {
                    userName: service.userName,
                    totalTime: 0,
                    sessions: 0
                };
            }
            userStats[service.userId].totalTime += service.duration || 0;
            userStats[service.userId].sessions += 1;
        });

        const topUsers = Object.values(userStats)
            .sort((a, b) => b.totalTime - a.totalTime);

        return {
            date: yesterdayStart,
            totalSessions: yesterdayServices.length,
            totalDuration: yesterdayServices.reduce((sum, s) => sum + (s.duration || 0), 0),
            uniqueUsers: Object.keys(userStats).length,
            averageSession: yesterdayServices.length > 0 ? 
                yesterdayServices.reduce((sum, s) => sum + (s.duration || 0), 0) / yesterdayServices.length : 0,
            longestSession: yesterdayServices.length > 0 ? 
                Math.max(...yesterdayServices.map(s => s.duration || 0)) : 0,
            peakHours: this.calculatePeakHours(yesterdayServices),
            topUsers
        };
    }

    calculatePeakHours(services) {
        const hourCount = {};
        
        services.forEach(service => {
            const startHour = new Date(service.startTime).getHours();
            const endHour = service.endTime ? new Date(service.endTime).getHours() : startHour;
            
            for (let hour = startHour; hour <= endHour; hour++) {
                hourCount[hour] = (hourCount[hour] || 0) + 1;
            }
        });

        const maxCount = Math.max(...Object.values(hourCount));
        const peakHours = Object.keys(hourCount)
            .filter(hour => hourCount[hour] === maxCount)
            .map(hour => `${hour}h-${parseInt(hour) + 1}h`)
            .join(', ');

        return peakHours || 'Non déterminé';
    }

    async loadServiceData() {
        try {
            const servicePath = path.join(__dirname, '..', 'data', 'services.json');
            const data = await fs.readFile(servicePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return { activeServices: [], history: [] };
        }
    }

    formatDuration(ms) {
        if (!ms || ms < 0) return '0min';
        
        const hours = Math.floor(ms / (60 * 60 * 1000));
        const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
        
        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        } else {
            return `${minutes}min`;
        }
    }
}

module.exports = PresenceMonitor;
