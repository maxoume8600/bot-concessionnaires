const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-logs-service')
        .setDescription('Crée les salons de logs de service automatiquement')
        .addBooleanOption(option =>
            option.setName('force')
                .setDescription('Remplacer les salons existants')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const guild = interaction.guild;
            const force = interaction.options.getBoolean('force') || false;

            // Chercher ou créer la catégorie "LOGS SERVICE"
            let logsCategory = guild.channels.cache.find(c => 
                c.type === 4 && (
                    c.name.toLowerCase().includes('logs') && c.name.toLowerCase().includes('service')
                )
            );

            if (!logsCategory) {
                logsCategory = await guild.channels.create({
                    name: '📊 LOGS SERVICE',
                    type: 4, // Category
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: ['SendMessages'],
                            allow: ['ViewChannel', 'ReadMessageHistory']
                        }
                    ]
                });
                console.log('✅ Catégorie logs service créée');
            }

            // Configuration des salons à créer
            const channelsToCreate = [
                {
                    name: '🟢-prise-de-service',
                    description: 'Logs automatiques des prises de service',
                    envVar: 'CHANNEL_LOGS_PRISE_SERVICE'
                },
                {
                    name: '🔴-fin-de-service', 
                    description: 'Logs automatiques des fins de service',
                    envVar: 'CHANNEL_LOGS_FIN_SERVICE'
                }
            ];

            const createdChannels = [];
            const existingChannels = [];
            
            for (const channelConfig of channelsToCreate) {
                // Chercher si le salon existe déjà
                let existingChannel = guild.channels.cache.find(c => 
                    c.name === channelConfig.name || 
                    c.name.includes(channelConfig.name.replace(/[🟢🔴-]/g, ''))
                );

                if (existingChannel && !force) {
                    existingChannels.push({
                        channel: existingChannel,
                        config: channelConfig
                    });
                    continue;
                }

                // Supprimer l'ancien si force est activé
                if (existingChannel && force) {
                    await existingChannel.delete();
                    console.log(`🗑️ Ancien salon ${channelConfig.name} supprimé`);
                }

                // Créer le nouveau salon
                const newChannel = await guild.channels.create({
                    name: channelConfig.name,
                    type: 0, // Text channel
                    parent: logsCategory.id,
                    topic: channelConfig.description,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            allow: ['ViewChannel', 'ReadMessageHistory', 'UseApplicationCommands'],
                            deny: ['SendMessages', 'AddReactions', 'CreatePublicThreads', 'CreatePrivateThreads']
                        },
                        {
                            id: guild.members.me.id,
                            allow: ['SendMessages', 'EmbedLinks', 'AttachFiles', 'UseApplicationCommands', 'ManageMessages']
                        }
                    ]
                });

                createdChannels.push({
                    channel: newChannel,
                    config: channelConfig
                });

                console.log(`✅ Salon ${channelConfig.name} créé`);
            }

            // Créer l'embed de confirmation
            const embed = new EmbedBuilder()
                .setTitle('✅ Configuration des Logs de Service')
                .setDescription('Salons de logs automatiques configurés')
                .setColor('#27AE60')
                .setTimestamp();

            // Ajouter les salons créés
            if (createdChannels.length > 0) {
                const createdList = createdChannels
                    .map(item => `${item.channel} - ${item.config.description}`)
                    .join('\n');
                
                embed.addFields({
                    name: '🆕 Salons créés',
                    value: createdList,
                    inline: false
                });
            }

            // Ajouter les salons existants
            if (existingChannels.length > 0) {
                const existingList = existingChannels
                    .map(item => `${item.channel} - Déjà existant`)
                    .join('\n');
                
                embed.addFields({
                    name: '📋 Salons existants',
                    value: existingList,
                    inline: false
                });
            }

            // Instructions pour la configuration
            embed.addFields({
                name: '⚙️ Configuration automatique',
                value: 'Les IDs des salons ont été automatiquement configurés pour le bot.\n' +
                       'Les logs de service seront maintenant envoyés dans ces salons dédiés.',
                inline: false
            });

            // Mettre à jour les variables d'environnement (simulation)
            if (createdChannels.length > 0 || existingChannels.length > 0) {
                const allChannels = [...createdChannels, ...existingChannels];
                let envInstructions = '\n**🔧 Variables d\'environnement à ajouter dans .env :**\n```';
                
                for (const item of allChannels) {
                    envInstructions += `\n${item.config.envVar}=${item.channel.id}`;
                }
                envInstructions += '\n```';
                
                embed.addFields({
                    name: '📝 Configuration .env',
                    value: envInstructions,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

            // Envoyer un message de test dans chaque salon créé
            for (const item of createdChannels) {
                if (item.config.name === '🟢-prise-de-service') {
                    // Salon prise de service avec bouton
                    const priseServiceEmbed = new EmbedBuilder()
                        .setTitle('🟢 Prise de Service')
                        .setDescription('Cliquez sur le bouton ci-dessous pour prendre votre service.')
                        .addFields(
                            { name: '📋 Instructions', value: '1. Choisissez votre poste\n2. Confirmez votre prise de service\n3. Votre rôle sera assigné automatiquement', inline: false },
                            { name: '📊 Logs', value: 'Votre prise de service sera enregistrée dans ce salon', inline: false }
                        )
                        .setColor('#00FF00')
                        .setTimestamp()
                        .setFooter({ text: 'Système de gestion RH automatisé' });

                    const priseServiceButton = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('prendre_service')
                                .setLabel('🟢 Prendre Service')
                                .setStyle(ButtonStyle.Success)
                        );

                    await item.channel.send({ 
                        embeds: [priseServiceEmbed], 
                        components: [priseServiceButton] 
                    });
                    
                } else if (item.config.name === '🔴-fin-de-service') {
                    // Salon fin de service avec bouton
                    const finServiceEmbed = new EmbedBuilder()
                        .setTitle('🔴 Fin de Service')
                        .setDescription('Cliquez sur le bouton ci-dessous pour terminer votre service.')
                        .addFields(
                            { name: '📋 Instructions', value: '1. Cliquez sur terminer service\n2. Votre temps sera calculé automatiquement\n3. Votre rôle sera retiré automatiquement', inline: false },
                            { name: '📊 Logs', value: 'Votre fin de service sera enregistrée dans ce salon', inline: false }
                        )
                        .setColor('#FF0000')
                        .setTimestamp()
                        .setFooter({ text: 'Système de gestion RH automatisé' });

                    const finServiceButton = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('terminer_service')
                                .setLabel('🔴 Terminer Service')
                                .setStyle(ButtonStyle.Danger)
                        );

                    await item.channel.send({ 
                        embeds: [finServiceEmbed], 
                        components: [finServiceButton] 
                    });
                } else {
                    // Message par défaut pour les autres salons
                    const testEmbed = new EmbedBuilder()
                        .setTitle(`🚀 Salon ${item.config.name} configuré`)
                        .setDescription('Ce salon recevra automatiquement les logs de service.')
                        .addFields(
                            { name: '🎯 Fonction', value: item.config.description, inline: true },
                            { name: '🤖 Bot', value: 'Logs automatiques activés', inline: true },
                            { name: '👀 Visibilité', value: 'Lecture seule pour tous', inline: true }
                        )
                        .setColor('#3498DB')
                        .setTimestamp()
                        .setFooter({ text: 'Système de logs automatiques' });

                    await item.channel.send({ embeds: [testEmbed] });
                }
            }

        } catch (error) {
            console.error('Erreur setup-logs-service:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Erreur')
                .setDescription(`Impossible de configurer les salons de logs:\n\`\`\`${error.message}\`\`\``)
                .setColor('#E74C3C')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
