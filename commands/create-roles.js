const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-roles')
        .setDescription('✨ Crée les rôles de service personnalisés')
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
            
            // Définir les rôles à créer (tous en français)
            const rolesToCreate = [
                { name: '🟢 En Service', color: '#00FF00', description: 'Rôle générique de service' },
                { name: '👶 Recrue', color: '#87CEEB', description: 'Nouveau membre en formation' },
                { name: '🚗 Exposition', color: '#FF4500', description: 'Responsable de la présentation des véhicules' },
                { name: '💰 Vendeur', color: '#32CD32', description: 'Spécialiste de la vente' },
                { name: '📈 Commercial', color: '#4169E1', description: 'Gestionnaire des affaires commerciales' },
                { name: '💳 Financier', color: '#FFD700', description: 'Responsable financier et crédit' },
                { name: '👔 Responsable', color: '#800080', description: 'Chef d\'équipe et management' }
            ];
            
            let createdCount = 0;
            let existingCount = 0;
            let errorCount = 0;

            await interaction.editReply('✨ Création des rôles de service en cours...');

            for (const roleData of rolesToCreate) {
                // Vérifier si le rôle existe déjà
                const existingRole = guild.roles.cache.find(r => r.name === roleData.name);
                
                if (existingRole) {
                    console.log(`ℹ️ Rôle déjà existant: ${roleData.name}`);
                    existingCount++;
                } else {
                    try {
                        const newRole = await guild.roles.create({
                            name: roleData.name,
                            color: roleData.color,
                            hoist: false,
                            mentionable: true,
                            reason: `Création des rôles de service - demandé par ${interaction.user.tag}`
                        });
                        console.log(`✅ Rôle créé: ${roleData.name}`);
                        createdCount++;
                    } catch (error) {
                        console.log(`⚠️ Impossible de créer le rôle: ${roleData.name} - ${error.message}`);
                        errorCount++;
                    }
                }
            }

            await interaction.editReply({
                content: `✅ **Création des rôles terminée !**\n\n` +
                        `✨ **Rôles créés :** ${createdCount}\n` +
                        `ℹ️ **Rôles existants :** ${existingCount}\n` +
                        `⚠️ **Erreurs :** ${errorCount}\n\n` +
                        `**Rôles disponibles :**\n` +
                        `🟢 **En Service** - Rôle générique\n` +
                        `👶 **Recrue** - Nouveau membre\n` +
                        `🚗 **Exposition** - Présentation véhicules\n` +
                        `💰 **Vendeur** - Spécialiste vente\n` +
                        `📈 **Commercial** - Affaires commerciales\n` +
                        `💳 **Financier** - Responsable financier\n` +
                        `👔 **Responsable** - Chef d'équipe\n\n` +
                        `💡 **Utilise maintenant /service prendre ou le bouton pour la détection automatique !**`
            });

        } catch (error) {
            console.error('Erreur lors de la création des rôles:', error);
            await interaction.editReply({
                content: '❌ Erreur lors de la création des rôles. Vérifiez les permissions du bot.'
            });
        }
    }
};
