const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mes-logs')
        .setDescription('Consulter vos logs personnels de service')
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Nombre de sessions à afficher (1-10)')
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const userId = interaction.user.id;
            const userName = interaction.user.displayName || interaction.user.username;
            const limit = interaction.options.getInteger('nombre') || 5;

            // Charger les données de service
            const serviceData = await this.loadServiceData();
            
            // Filtrer les sessions de l'utilisateur
            const userSessions = serviceData.history
                .filter(session => session.userId === userId)
                .sort((a, b) => b.startTime - a.startTime)
                .slice(0, limit);

            // Vérifier si en service actuellement
            const currentService = serviceData.activeServices?.find(s => s.userId === userId);

            if (userSessions.length === 0 && !currentService) {
                const noDataEmbed = new EmbedBuilder()
                    .setTitle('📋 Mes Logs de Service')
                    .setDescription('Aucune session de service trouvée.')
                    .addFields({
                        name: '💡 Pour commencer',
                        value: 'Utilisez `/service prendre` pour démarrer votre première session !',
                        inline: false
                    })
                    .setColor('#95A5A6')
                    .setTimestamp()
                    .setThumbnail(interaction.user.displayAvatarURL());

                return await interaction.editReply({ embeds: [noDataEmbed] });
            }

            // Créer l'embed principal
            const embed = new EmbedBuilder()
                .setTitle(`📋 Mes Logs de Service - ${userName}`)
                .setDescription(`Vos ${limit} dernières sessions de service`)
                .setColor('#3498DB')
                .setTimestamp()
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ text: 'Logs personnels - visible par vous uniquement' });

            // Session actuelle si applicable
            if (currentService) {
                const currentDuration = Date.now() - currentService.startTime;
                embed.addFields({
                    name: '🟢 Session en cours',
                    value: `**${currentService.poste}**\nDémarré: ${new Date(currentService.startTime).toLocaleString('fr-FR')}\nDurée: ${this.formatDuration(currentDuration)}`,
                    inline: false
                });
            }

            // Historique des sessions
            if (userSessions.length > 0) {
                const sessionsText = userSessions.map((session, index) => {
                    const startDate = new Date(session.startTime);
                    const endDate = new Date(session.endTime);
                    const duration = session.endTime - session.startTime;
                    
                    const performance = duration > 3600000 ? '🌟' : 
                                      duration > 1800000 ? '👍' : '⚠️';
                    
                    return `**${index + 1}.** ${session.poste} ${performance}\n` +
                           `📅 ${startDate.toLocaleDateString('fr-FR')} | ⏱️ ${this.formatDuration(duration)}`;
                }).join('\n\n');

                embed.addFields({
                    name: `📊 Historique (${userSessions.length} sessions)`,
                    value: sessionsText,
                    inline: false
                });

                // Statistiques personnelles
                const totalDuration = userSessions.reduce((sum, session) => sum + (session.endTime - session.startTime), 0);
                const averageDuration = totalDuration / userSessions.length;
                const longestSession = Math.max(...userSessions.map(s => s.endTime - s.startTime));

                embed.addFields({
                    name: '📈 Vos Statistiques',
                    value: `⏱️ **Temps total**: ${this.formatDuration(totalDuration)}\n` +
                           `📊 **Durée moyenne**: ${this.formatDuration(averageDuration)}\n` +
                           `🏆 **Meilleure session**: ${this.formatDuration(longestSession)}`,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur mes-logs:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Erreur')
                .setDescription(`Impossible de récupérer vos logs:\n\`\`\`${error.message}\`\`\``)
                .setColor('#E74C3C')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },

    async loadServiceData() {
        try {
            const dataPath = path.join(__dirname, '../data/services.json');
            const data = await fs.readFile(dataPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.log('Aucun fichier de service existant, création d\'un nouveau...');
            return {
                activeServices: [],
                history: []
            };
        }
    },

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${seconds}s`;
        }
    }
};
