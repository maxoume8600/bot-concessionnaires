const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder , MessageFlags } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const VehicleSyncManager = require('../utils/vehicleSyncManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync')
        .setDescription('Gérer la synchronisation avec le serveur FiveM et les fichiers')
        .addSubcommand(subcommand =>
            subcommand
                .setName('now')
                .setDescription('Forcer une synchronisation immédiate avec FiveM'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lua')
                .setDescription('Synchroniser le catalogue avec le fichier vehicles.lua'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Voir le statut de la synchronisation'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Démarrer la synchronisation automatique'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Arrêter la synchronisation automatique'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'now':
                await this.syncNow(interaction);
                break;
            case 'lua':
                await this.syncLua(interaction);
                break;
            case 'status':
                await this.showStatus(interaction);
                break;
            case 'start':
                await this.startSync(interaction);
                break;
            case 'stop':
                await this.stopSync(interaction);
                break;
        }
    },

    async syncLua(interaction) {
        await interaction.deferReply();

        try {
            const syncManager = new VehicleSyncManager();
            
            // Vérifier si le fichier Lua existe
            const luaExists = await syncManager.checkLuaFileExists();
            if (!luaExists) {
                return interaction.editReply({
                    embeds: [EmbedUtils.createErrorEmbed(
                        'Fichier vehicles.lua introuvable',
                        'Le fichier `data/vehicles.lua` n\'existe pas.\n\n' +
                        '💡 **Solution:** Créez ce fichier avec vos véhicules ou utilisez `/sync lua` pour créer un exemple.'
                    )]
                });
            }

            // Effectuer la synchronisation
            const result = await syncManager.syncLuaToJson();
            
            if (result.success) {
                // Recharger les véhicules dans le client
                await interaction.client.loadVehicules();
                
                const embed = new EmbedBuilder()
                    .setTitle('✅ Synchronisation Lua Réussie')
                    .setDescription('Le catalogue a été synchronisé avec le fichier `vehicles.lua`')
                    .addFields(
                        { name: '📊 Total véhicules', value: result.vehiclesCount.toString(), inline: true },
                        { name: '🆕 Nouveaux', value: result.newVehicles.toString(), inline: true },
                        { name: '🔄 Mis à jour', value: result.updatedVehicles.toString(), inline: true },
                        { name: '📁 Fichier source', value: '`data/vehicles.lua`', inline: false },
                        { name: '💡 Astuce', value: 'Utilisez `/catalogue-update` pour mettre à jour le catalogue Discord', inline: false }
                    )
                    .setColor('#00FF00')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('❌ Erreur sync Lua:', error);
            await interaction.editReply({
                embeds: [EmbedUtils.createErrorEmbed(
                    'Erreur de Synchronisation',
                    `Impossible de synchroniser avec vehicles.lua:\n\`\`\`${error.message}\`\`\``
                )]
            });
        }
    },

    async syncNow(interaction) {
        if (!process.env.FIVEM_SERVER_IP) {
            return interaction.reply({
                embeds: [EmbedUtils.createErrorEmbed(
                    'Synchronisation impossible',
                    'Aucune IP de serveur FiveM configurée dans le fichier .env'
                )],
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply();

        try {
            const result = await interaction.client.fivemSync.manualSync();
            
            const embed = EmbedUtils.createSuccessEmbed(
                'Synchronisation terminée',
                `Synchronisation avec **${process.env.FIVEM_SERVER_IP}:${process.env.FIVEM_SERVER_PORT || '30120'}** réussie !\n\n` +
                `**${result.vehicleCount}** véhicules dans la base de données\n` +
                `**Dernière sync:** ${result.lastSync ? result.lastSync.toLocaleString('fr-FR') : 'Maintenant'}`
            );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply({
                embeds: [EmbedUtils.createErrorEmbed(
                    'Erreur de synchronisation',
                    `Impossible de se connecter au serveur FiveM:\n\`${error.message}\``
                )]
            });
        }
    },

    async showStatus(interaction) {
        const status = interaction.client.fivemSync.getSyncStatus();
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Statut de la Synchronisation FiveM')
            .setColor(status.isActive ? '#00FF00' : '#FFA500')
            .addFields(
                { 
                    name: '🔄 Synchronisation automatique', 
                    value: status.isActive ? '✅ Active' : '❌ Inactive', 
                    inline: true 
                },
                { 
                    name: '🌐 Serveur FiveM', 
                    value: status.serverIP ? `${status.serverIP}:${status.serverPort}` : 'Non configuré', 
                    inline: true 
                },
                { 
                    name: '⏱️ Intervalle', 
                    value: `${status.syncInterval / 1000} secondes`, 
                    inline: true 
                },
                { 
                    name: '🚗 Véhicules en base', 
                    value: status.vehicleCount.toString(), 
                    inline: true 
                },
                { 
                    name: '📅 Dernière synchronisation', 
                    value: status.lastSync ? 
                        status.lastSync.toLocaleString('fr-FR') : 
                        'Jamais', 
                    inline: true 
                }
            )
            .setTimestamp();

        if (!status.serverIP) {
            embed.addFields({
                name: '⚠️ Configuration requise',
                value: 'Ajoutez `FIVEM_SERVER_IP` dans votre fichier .env pour activer la synchronisation',
                inline: false
            });
        }

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    },

    async startSync(interaction) {
        if (!process.env.FIVEM_SERVER_IP) {
            return interaction.reply({
                embeds: [EmbedUtils.createErrorEmbed(
                    'Configuration manquante',
                    'Configurez `FIVEM_SERVER_IP` dans votre fichier .env'
                )],
                flags: MessageFlags.Ephemeral
            });
        }

        const status = interaction.client.fivemSync.getSyncStatus();
        
        if (status.isActive) {
            return interaction.reply({
                embeds: [EmbedUtils.createInfoEmbed(
                    'Synchronisation déjà active',
                    'La synchronisation automatique est déjà en cours'
                )],
                flags: MessageFlags.Ephemeral
            });
        }

        interaction.client.fivemSync.startAutoSync();
        
        await interaction.reply({
            embeds: [EmbedUtils.createSuccessEmbed(
                'Synchronisation démarrée',
                `Synchronisation automatique activée avec **${process.env.FIVEM_SERVER_IP}**\n` +
                `Intervalle: ${(process.env.SYNC_INTERVAL || 300000) / 1000} secondes`
            )]
        });
    },

    async stopSync(interaction) {
        const status = interaction.client.fivemSync.getSyncStatus();
        
        if (!status.isActive) {
            return interaction.reply({
                embeds: [EmbedUtils.createInfoEmbed(
                    'Synchronisation déjà inactive',
                    'La synchronisation automatique n\'est pas en cours'
                )],
                flags: MessageFlags.Ephemeral
            });
        }

        interaction.client.fivemSync.stopAutoSync();
        
        await interaction.reply({
            embeds: [EmbedUtils.createSuccessEmbed(
                'Synchronisation arrêtée',
                'La synchronisation automatique a été désactivée'
            )]
        });
    },
};
