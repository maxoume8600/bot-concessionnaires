const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clean-roles')
        .setDescription('⚠️ DANGER: Supprime TOUS les rôles et recrée le rôle du bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Vous devez être administrateur pour utiliser cette commande',
                flags: [4096] // EPHEMERAL flag
            });
        }

        await interaction.deferReply();

        try {
            const guild = interaction.guild;
            const botMember = guild.members.cache.get(interaction.client.user.id);
            
            // Supprimer TOUS les rôles (sauf @everyone)
            const allRoles = guild.roles.cache.filter(role => role.name !== '@everyone');
            
            let deletedCount = 0;
            let errorCount = 0;

            await interaction.editReply('🔄 Suppression de tous les rôles en cours...');

            for (const role of allRoles.values()) {
                try {
                    await role.delete(`Suppression complète des rôles - demandé par ${interaction.user.tag}`);
                    console.log(`🗑️ Rôle supprimé: ${role.name}`);
                    deletedCount++;
                } catch (error) {
                    console.log(`⚠️ Impossible de supprimer le rôle: ${role.name} - ${error.message}`);
                    errorCount++;
                }
            }

            // Créer un nouveau rôle pour le bot avec toutes les permissions
            await interaction.editReply('🤖 Création du rôle administrateur pour le bot...');
            
            let botRole = null;
            try {
                botRole = await guild.roles.create({
                    name: '🤖 Bot Administrator',
                    color: '#00BFFF',
                    permissions: [
                        'Administrator',
                        'ManageRoles',
                        'ManageChannels',
                        'ManageGuild',
                        'ViewChannel',
                        'SendMessages',
                        'ManageMessages',
                        'EmbedLinks',
                        'AttachFiles',
                        'UseExternalEmojis',
                        'AddReactions',
                        'Connect',
                        'Speak'
                    ],
                    hoist: true,
                    reason: `Rôle administrateur du bot - créé après nettoyage par ${interaction.user.tag}`
                });
                console.log(`✅ Rôle bot créé: ${botRole.name}`);
                
                // Assigner le rôle au bot
                if (botMember) {
                    await botMember.roles.add(botRole, 'Attribution du rôle administrateur au bot');
                    console.log('✅ Rôle assigné au bot');
                }
                
            } catch (error) {
                console.error('Erreur création rôle bot:', error);
            }

            await interaction.editReply({
                content: `✅ **Suppression et recréation terminées !**\n\n` +
                        `🗑️ **Rôles supprimés :** ${deletedCount}\n` +
                        `⚠️ **Erreurs :** ${errorCount}\n` +
                        `🤖 **Rôle bot créé :** ${botRole ? '✅ ' + botRole.name : '❌ Échec'}\n\n` +
                        `**Rôles restants :**\n` +
                        `- @everyone (ne peut pas être supprimé)\n` +
                        `- 🤖 Bot Administrator (créé automatiquement avec permissions complètes)`
            });

        } catch (error) {
            console.error('Erreur lors du nettoyage des rôles:', error);
            await interaction.editReply({
                content: '❌ Erreur lors du nettoyage des rôles. Vérifiez les permissions du bot.'
            });
        }
    }
};
