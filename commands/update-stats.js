const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('update-stats')
        .setDescription('Force une mise à jour immédiate des statistiques de présence')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            if (!interaction.client.presenceMonitor) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Erreur')
                    .setDescription('Le système de monitoring de présence n\'est pas initialisé.')
                    .setColor('#E74C3C')
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Forcer une mise à jour
            await interaction.client.presenceMonitor.updatePresenceStats();

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Mise à jour forcée')
                .setDescription('Les statistiques de présence ont été mises à jour immédiatement.')
                .addFields(
                    { name: '📊 Canal', value: `<#${process.env.CHANNEL_STATS_PRESENCE}>`, inline: true },
                    { name: '⏱️ Prochaine mise à jour automatique', value: 'Dans 5 minutes', inline: true }
                )
                .setColor('#27AE60')
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Erreur update-stats:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Erreur')
                .setDescription(`Impossible de mettre à jour les statistiques:\n\`\`\`${error.message}\`\`\``)
                .setColor('#E74C3C')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
