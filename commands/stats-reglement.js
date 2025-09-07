const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats-reglement')
        .setDescription('Affiche les statistiques de validation du règlement')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const guild = interaction.guild;
            
            // Chercher le rôle de validation du règlement
            const validatedRole = guild.roles.cache.find(role => 
                role.name.toLowerCase().includes('validé') || 
                role.name.toLowerCase().includes('certifié') ||
                role.name.toLowerCase().includes('règlement')
            );

            if (!validatedRole) {
                const noRoleEmbed = new EmbedBuilder()
                    .setTitle('❌ Aucun rôle trouvé')
                    .setDescription('Aucun rôle de validation de règlement n\'a été trouvé.\nUtilisez `/setup-reglement` pour configurer le système.')
                    .setColor('#E74C3C')
                    .setTimestamp();

                return await interaction.editReply({ embeds: [noRoleEmbed] });
            }

            // Statistiques
            const totalMembers = guild.memberCount;
            const validatedMembers = validatedRole.members.size;
            const validationRate = ((validatedMembers / totalMembers) * 100).toFixed(1);

            // Récupérer les derniers validés (top 10)
            const recentValidated = validatedRole.members
                .sort((a, b) => b.joinedTimestamp - a.joinedTimestamp)
                .first(10);

            // Créer l'embed de statistiques
            const statsEmbed = new EmbedBuilder()
                .setTitle('📊 Statistiques du Règlement')
                .setDescription(`État de la validation du règlement sur **${guild.name}**`)
                .addFields(
                    { name: '👥 Total membres', value: `${totalMembers}`, inline: true },
                    { name: '✅ Règlement validé', value: `${validatedMembers}`, inline: true },
                    { name: '📈 Taux de validation', value: `${validationRate}%`, inline: true },
                    { name: '🏷️ Rôle utilisé', value: `${validatedRole}`, inline: true },
                    { name: '📅 Créé le', value: `<t:${Math.floor(validatedRole.createdTimestamp / 1000)}:F>`, inline: true },
                    { name: '🎨 Couleur', value: `#${validatedRole.color.toString(16).padStart(6, '0')}`, inline: true }
                )
                .setColor(validatedRole.color || '#27AE60')
                .setTimestamp()
                .setThumbnail(guild.iconURL());

            // Ajouter les derniers validés si disponibles
            if (recentValidated.length > 0) {
                const recentList = recentValidated
                    .map((member, index) => `${index + 1}. ${member.displayName}`)
                    .join('\n');

                statsEmbed.addFields({
                    name: `👑 Derniers validés (${recentValidated.length})`,
                    value: recentList,
                    inline: false
                });
            }

            // Ajouter une barre de progression visuelle
            const progressBar = this.createProgressBar(validationRate);
            statsEmbed.addFields({
                name: '📊 Progression',
                value: `${progressBar} ${validationRate}%`,
                inline: false
            });

            await interaction.editReply({ embeds: [statsEmbed] });

        } catch (error) {
            console.error('Erreur stats règlement:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Erreur')
                .setDescription(`Impossible de récupérer les statistiques:\n\`\`\`${error.message}\`\`\``)
                .setColor('#E74C3C')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },

    createProgressBar(percentage) {
        const total = 20;
        const filled = Math.round((percentage / 100) * total);
        const empty = total - filled;
        
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
};
