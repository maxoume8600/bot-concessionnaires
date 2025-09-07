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
            const channels = getChannels();
            const channelId = channels.statsPresence;
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
        const embed = new EmbedBuilder()
            .setTitle('Monitoring des Services')
            .setDescription('📊 Statistiques de présence des vendeurs')
            .addFields(
                { name: '👥 Vendeurs en service', value: '0', inline: true },
                { name: '⏱️ Durée moyenne', value: 'N/A', inline: true },
                { name: '📅 Sessions aujourd\'hui', value: '0', inline: true },
                { name: '🔄 Dernière mise à jour', value: new Date().toLocaleString('fr-FR'), inline: false }
            )
            .setColor('#2ecc71')
            .setTimestamp();

        return embed;
    }

    async updatePresenceStats() {
        try {
            if (!this.statsMessageId) return;

            const channels = getChannels();
            const channelId = channels.statsPresence;
            if (!channelId) return;

            const channel = this.client.channels.cache.get(channelId);
            if (!channel) return;

            const message = await channel.messages.fetch(this.statsMessageId);
            if (!message) return;

            // Charger les données de services
            const servicePath = path.join(__dirname, '..', 'data', 'services.json');
            let serviceData = { activeServices: [] };
            try {
                const data = await fs.readFile(servicePath, 'utf8');
                serviceData = JSON.parse(data);
            } catch (error) {
                console.error('Erreur lecture services:', error);
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

            const embed = new EmbedBuilder()
                .setTitle('Monitoring des Services')
                .setDescription('📊 Statistiques de présence des vendeurs')
                .addFields(
                    { name: '👥 Vendeurs en service', value: activeSessions.toString(), inline: true },
                    { name: '⏱️ Durée moyenne', value: formatDuration(averageDuration), inline: true },
                    { name: '📅 Sessions aujourd\'hui', value: serviceData.activeServices.length.toString(), inline: true },
                    { name: '🔄 Dernière mise à jour', value: new Date().toLocaleString('fr-FR'), inline: false }
                )
                .setColor('#2ecc71')
                .setTimestamp();

            await message.edit({ embeds: [embed] });
            this.lastStatsUpdate = now;

        } catch (error) {
            console.error('❌ Erreur mise à jour stats:', error);
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
