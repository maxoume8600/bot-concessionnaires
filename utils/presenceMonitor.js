const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { getDiscordId } = require('./envHelper');

class PresenceMonitor {
    constructor(client) {
        this.client = client;
        this.statsUpdateInterval = 5 * 60 * 1000; // 5 minutes
        this.dailyReportInterval = 24 * 60 * 60 * 1000; // 24 heures
        this.lastStatsUpdate = 0;
        this.lastDailyReport = 0;
        this.statsMessageId = null;
        
        this.startMonitoring();
    }

    startMonitoring() {
        setTimeout(() => {
            this.initializeStatsMessage();
        }, 5000);

        setInterval(() => {
            this.updatePresenceStats();
        }, this.statsUpdateInterval);

        setInterval(() => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() < 5) {
                this.sendDailyReport();
            }
        }, 5 * 60 * 1000);

        console.log('📊 Monitoring de présence démarré');
    }

    async initializeStatsMessage() {
        try {
            const channelId = getDiscordId(process.env.CHANNEL_STATS_PRESENCE);
            if (!channelId) {
                console.log('⚠️ CHANNEL_STATS_PRESENCE non configuré ou invalide');
                return;
            }

            const channel = this.client.channels.cache.get(channelId);
            if (!channel) {
                console.log(`⚠️ Canal ${channelId} non trouvé ou inaccessible`);
                return;
            }

            const messages = await channel.messages.fetch({ limit: 10 });
            const botMessage = messages.find(msg => 
                msg.author.id === this.client.user.id && 
                msg.embeds.length > 0 &&
                msg.embeds[0].title === 'Monitoring des Services'
            );

            if (botMessage) {
                this.statsMessageId = botMessage.id;
            } else {
                const newMessage = await channel.send({ 
                    embeds: [this.createStatsEmbed()]
                });
                this.statsMessageId = newMessage.id;
            }
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du message de stats:', error);
        }
    }

    createStatsEmbed() {
        // Code existant pour createStatsEmbed
    }

    async updatePresenceStats() {
        // Code existant pour updatePresenceStats
    }

    async sendDailyReport() {
        // Code existant pour sendDailyReport
    }
}

module.exports = PresenceMonitor;
