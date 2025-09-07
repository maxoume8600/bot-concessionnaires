const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const VehicleSyncManager = require('../utils/vehicleSyncManager');
const EmbedUtils = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync-catalogue')
        .setDescription('Synchroniser le catalogue Discord avec le fichier vehicles.lua')
        .addBooleanOption(option =>
            option
                .setName('update-discord')
                .setDescription('Mettre à jour automatiquement le message de catalogue Discord')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const syncManager = new VehicleSyncManager();
            
            // Vérifier si le fichier Lua existe
            const luaExists = await syncManager.checkLuaFileExists();
            if (!luaExists) {
                // Créer un fichier exemple
                await syncManager.createExampleLuaFile();
                
                const embed = new EmbedBuilder()
                    .setTitle('📝 Fichier vehicles.lua créé')
                    .setDescription('Le fichier `data/vehicles.lua` a été créé avec des véhicules d\'exemple.')
                    .addFields(
                        { name: '📍 Emplacement', value: '`data/vehicles.lua`', inline: true },
                        { name: '✏️ Action requise', value: 'Modifiez ce fichier avec vos véhicules', inline: true },
                        { name: '🔄 Prochaine étape', value: 'Relancez cette commande après modification', inline: false }
                    )
                    .setColor('#FFA500')
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed] });
            }

            // Effectuer la synchronisation
            const result = await syncManager.syncLuaToJson();
            
            if (result.success) {
                // Recharger les véhicules dans le client
                await interaction.client.loadVehicules();
                
                const embed = new EmbedBuilder()
                    .setTitle('✅ Catalogue Synchronisé avec vehicles.lua')
                    .setDescription('Le catalogue Discord a été mis à jour avec les données du fichier Lua')
                    .addFields(
                        { name: '📊 Total véhicules', value: result.vehiclesCount.toString(), inline: true },
                        { name: '🆕 Nouveaux', value: result.newVehicles.toString(), inline: true },
                        { name: '🔄 Mis à jour', value: result.updatedVehicles.toString(), inline: true },
                        { name: '🕐 Dernière sync', value: new Date().toLocaleString('fr-FR'), inline: false }
                    )
                    .setColor('#00FF00')
                    .setTimestamp();

                // Si option activée, mettre à jour le message Discord
                const updateDiscord = interaction.options.getBoolean('update-discord');
                if (updateDiscord) {
                    try {
                        // Chercher la commande catalogue-update
                        const catalogueUpdateCommand = interaction.client.commands.get('catalogue-update');
                        if (catalogueUpdateCommand) {
                            // Créer une fausse interaction pour déclencher la mise à jour
                            const mockInteraction = {
                                ...interaction,
                                reply: () => {},
                                editReply: () => {},
                                guild: interaction.guild,
                                client: interaction.client
                            };
                            
                            await catalogueUpdateCommand.execute(mockInteraction);
                            
                            embed.addFields({
                                name: '📢 Catalogue Discord', 
                                value: '✅ Message de catalogue mis à jour automatiquement', 
                                inline: false
                            });
                        }
                    } catch (error) {
                        console.error('Erreur mise à jour catalogue Discord:', error);
                        embed.addFields({
                            name: '⚠️ Catalogue Discord', 
                            value: 'Erreur lors de la mise à jour automatique. Utilisez `/catalogue-update` manuellement.', 
                            inline: false
                        });
                    }
                } else {
                    embed.addFields({
                        name: '💡 Astuce', 
                        value: 'Utilisez `/catalogue-update` ou relancez avec `update-discord: true` pour mettre à jour le catalogue Discord', 
                        inline: false
                    });
                }
                
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('❌ Erreur sync catalogue:', error);
            await interaction.editReply({
                embeds: [EmbedUtils.createErrorEmbed(
                    'Erreur de Synchronisation',
                    `Impossible de synchroniser le catalogue avec vehicles.lua:\n\n` +
                    `**Erreur:** \`${error.message}\`\n\n` +
                    `**Solutions possibles:**\n` +
                    `• Vérifiez que le fichier \`data/vehicles.lua\` existe\n` +
                    `• Vérifiez la syntaxe Lua du fichier\n` +
                    `• Vérifiez que tous les véhicules ont les champs requis (id, nom, prix)`
                )]
            });
        }
    }
};
