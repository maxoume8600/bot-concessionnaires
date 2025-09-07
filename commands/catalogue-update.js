const { SlashCommandBuilder, PermissionFlagsBits , MessageFlags } = require('discord.js');
const EmbedUtils = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('catalogue-update')
        .setDescription('Mettre à jour le message de catalogue dans le canal approprié')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Trouver le canal catalogue
            const catalogueChannel = interaction.guild.channels.cache.find(channel => 
                channel.name.includes('catalogue') && channel.type === 0
            );

            if (!catalogueChannel) {
                return interaction.editReply({
                    embeds: [EmbedUtils.createErrorEmbed(
                        'Canal non trouvé',
                        'Aucun canal de catalogue trouvé. Utilisez `/setup init` pour configurer le serveur.'
                    )]
                });
            }

            // Récupérer les véhicules
            const vehicules = Array.from(interaction.client.vehicules.values());

            if (vehicules.length === 0) {
                return interaction.editReply({
                    embeds: [EmbedUtils.createErrorEmbed(
                        'Aucun véhicule',
                        'Aucun véhicule n\'est disponible. Ajoutez des véhicules avec `/vehicule ajouter`.'
                    )]
                });
            }

            // Créer le message de catalogue mis à jour
            const catalogueEmbed = EmbedUtils.createInfoEmbed(
                `🏪 ${process.env.SERVER_NAME || 'Concessionnaire'} - Catalogue Officiel`,
                `**Bienvenue dans notre showroom virtuel !**\n\n` +
                `🚗 **${vehicules.length} véhicules** disponibles actuellement\n` +
                `💰 **Prix compétitifs** avec possibilité de négociation\n` +
                `📦 **Stock en temps réel** ${process.env.FIVEM_SERVER_IP ? '(Sync FiveM)' : ''}\n` +
                `💼 **Service professionnel** par notre équipe\n\n` +
                `**🎯 Comment procéder :**\n` +
                `1️⃣ Tapez \`/catalogue\` pour voir tous nos véhicules\n` +
                `2️⃣ Sélectionnez le véhicule qui vous intéresse\n` +
                `3️⃣ Contactez un vendeur pour finaliser l'achat\n` +
                `4️⃣ Récupérez votre véhicule directement en jeu !\n\n` +
                `*Catalogue mis à jour automatiquement*`
            );

            catalogueEmbed.setThumbnail('https://cdn-icons-png.flaticon.com/512/3774/3774299.png');

            // Ajouter un aperçu des véhicules les plus chers
            const topVehicules = vehicules
                .sort((a, b) => b.prix - a.prix)
                .slice(0, 5);

            let vehiculesPreview = '';
            topVehicules.forEach((vehicule, index) => {
                const icon = index === 0 ? '👑' : index === 1 ? '🥇' : index === 2 ? '🥈' : '🥉';
                vehiculesPreview += `${icon} **${vehicule.nom}** - ${vehicule.prix.toLocaleString('fr-FR')} ${process.env.DEVISE || '€'}\n`;
            });

            if (vehiculesPreview) {
                catalogueEmbed.addFields({
                    name: '⭐ Véhicules Premium',
                    value: vehiculesPreview,
                    inline: false
                });
            }

            catalogueEmbed.addFields(
                {
                    name: '📊 Statistiques',
                    value: `🚗 ${vehicules.length} modèles\n📦 ${vehicules.reduce((sum, v) => sum + v.stock, 0)} en stock\n💰 Prix moyen: ${Math.round(vehicules.reduce((sum, v) => sum + v.prix, 0) / vehicules.length).toLocaleString('fr-FR')} €`,
                    inline: true
                },
                {
                    name: '🕒 Horaires',
                    value: '24h/24 - 7j/7\nService automatisé\nRéponse immédiate',
                    inline: true
                }
            );

            catalogueEmbed.setFooter({ 
                text: `${process.env.SERVER_NAME || 'Concessionnaire'} • Dernière mise à jour`,
                iconURL: interaction.client.user.displayAvatarURL()
            });

            // Supprimer les anciens messages du bot dans le canal
            try {
                const messages = await catalogueChannel.messages.fetch({ limit: 20 });
                const botMessages = messages.filter(m => m.author.id === interaction.client.user.id);
                if (botMessages.size > 0) {
                    await Promise.all(botMessages.map(m => m.delete().catch(() => {})));
                }
            } catch (error) {
                console.log('Impossible de supprimer les anciens messages');
            }

            // Envoyer le nouveau message
            const catalogueMessage = await catalogueChannel.send({ 
                embeds: [catalogueEmbed]
            });

            // Ajouter des réactions pour l'interactivité
            try {
                await catalogueMessage.react('🚗');
                await catalogueMessage.react('💰');
                await catalogueMessage.react('📋');
            } catch (error) {
                console.log('Impossible d\'ajouter les réactions');
            }

            await interaction.editReply({
                embeds: [EmbedUtils.createSuccessEmbed(
                    'Catalogue mis à jour !',
                    `Le catalogue a été mis à jour dans ${catalogueChannel} avec ${vehicules.length} véhicules.\n\n` +
                    `Les utilisateurs peuvent maintenant utiliser \`/catalogue\` pour voir tous les véhicules disponibles.`
                )]
            });

        } catch (error) {
            console.error('Erreur mise à jour catalogue:', error);
            await interaction.editReply({
                embeds: [EmbedUtils.createErrorEmbed(
                    'Erreur',
                    `Impossible de mettre à jour le catalogue: ${error.message}`
                )]
            });
        }
    },
};
