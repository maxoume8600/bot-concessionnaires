const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-server')
        .setDescription('⚠️ DANGER: Supprimer TOUT le contenu du serveur (canaux, rôles, etc.)')
        .addStringOption(option =>
            option
                .setName('confirmation')
                .setDescription('Tapez "SUPPRIMER TOUT" pour confirmer cette action irréversible')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const confirmation = interaction.options.getString('confirmation');
        
        // Vérifier la confirmation
        if (confirmation !== 'SUPPRIMER TOUT') {
            const embed = new EmbedBuilder()
                .setTitle('❌ Confirmation Invalide')
                .setDescription('Pour des raisons de sécurité, vous devez taper exactement **"SUPPRIMER TOUT"** pour confirmer.')
                .addFields({
                    name: '⚠️ Cette action va supprimer',
                    value: [
                        '• 🗂️ **Tous les canaux** (texte, vocal, catégories)',
                        '• 👥 **Tous les rôles** (sauf @everyone et bot)',
                        '• 📝 **Tous les messages** (dans les canaux supprimés)',
                        '• 🔒 **Toutes les permissions** personnalisées',
                        '• 📊 **Toute la configuration** du serveur'
                    ].join('\n'),
                    inline: false
                })
                .setColor('#FF0000')
                .setFooter({ text: 'Cette action est IRRÉVERSIBLE !' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], flags: [4096] }); // EPHEMERAL
        }

        // Vérifier les permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Vous devez être **Administrateur** pour utiliser cette commande !',
                flags: [4096] // EPHEMERAL
            });
        }

        // Démarrer le processus de suppression
        await interaction.deferReply();

        try {
            const guild = interaction.guild;
            const botMember = guild.members.me;
            let deletedCount = {
                channels: 0,
                categories: 0,
                roles: 0
            };

            // Vérifier que le bot a les permissions nécessaires
            console.log(`🤖 Permissions du bot:`);
            console.log(`   - Gérer les canaux: ${botMember.permissions.has(PermissionFlagsBits.ManageChannels)}`);
            console.log(`   - Gérer les rôles: ${botMember.permissions.has(PermissionFlagsBits.ManageRoles)}`);
            console.log(`   - Administrateur: ${botMember.permissions.has(PermissionFlagsBits.Administrator)}`);
            console.log(`🤖 Rôle le plus haut du bot: "${botMember.roles.highest.name}" (position: ${botMember.roles.highest.position})`);
            
            if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels) || 
                !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                const missingPerms = [];
                if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) missingPerms.push('Gérer les canaux');
                if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) missingPerms.push('Gérer les rôles');
                
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Permissions Insuffisantes')
                    .setDescription('Le bot n\'a pas toutes les permissions nécessaires.')
                    .addFields({
                        name: '⚠️ Permissions manquantes',
                        value: missingPerms.join(', '),
                        inline: false
                    }, {
                        name: '💡 Solution',
                        value: 'Donnez au bot le rôle **Administrateur** ou les permissions **Gérer les canaux** et **Gérer les rôles**',
                        inline: false
                    })
                    .setColor('#FF0000');
                    
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            const progressEmbed = new EmbedBuilder()
                .setTitle('🧹 Nettoyage du Serveur en Cours...')
                .setDescription('⏳ Suppression de tout le contenu du serveur...')
                .setColor('#FFA500')
                .setTimestamp();

            await interaction.editReply({ embeds: [progressEmbed] });

            // 1. Supprimer tous les canaux (y compris les catégories)
            console.log('🧹 Début de la suppression des canaux...');
            const channels = guild.channels.cache.filter(channel => channel.deletable);
            
            for (const [channelId, channel] of channels) {
                try {
                    await channel.delete('Reset complet du serveur');
                    if (channel.type === 4) { // Category
                        deletedCount.categories++;
                    } else {
                        deletedCount.channels++;
                    }
                    console.log(`✅ Canal supprimé: ${channel.name}`);
                    
                    // Petite pause pour éviter la limite de taux
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    console.error(`❌ Erreur suppression canal ${channel.name}:`, error);
                }
            }

            // Mise à jour du progrès
            try {
                progressEmbed.setDescription('⏳ Canaux supprimés, suppression des rôles...');
                await interaction.editReply({ embeds: [progressEmbed] });
            } catch (editError) {
                // Si le message a été supprimé avec le canal, ignorer l'erreur
                if (editError.code === 10008) {
                    console.log('⚠️ Message d\'interaction supprimé avec le canal, continuons...');
                } else {
                    console.error('Erreur modification message:', editError);
                }
            }

            // 2. Supprimer tous les rôles (sauf @everyone et les rôles du bot)
            console.log('🧹 Début de la suppression des rôles...');
            
            // D'abord, essayer de déplacer le rôle du bot en haut de la hiérarchie
            try {
                const botRole = botMember.roles.highest;
                if (botRole && botRole.position < guild.roles.cache.size - 2) {
                    console.log('🔄 Tentative de repositionnement du rôle du bot...');
                    await botRole.setPosition(guild.roles.cache.size - 1);
                    console.log('✅ Rôle du bot repositionné en haut');
                }
            } catch (error) {
                console.log('⚠️ Impossible de repositionner le rôle du bot:', error.message);
            }
            
            // Récupérer tous les rôles à supprimer, triés du plus haut au plus bas
            const rolesToDelete = Array.from(guild.roles.cache.values())
                .filter(role => {
                    // Exclusions
                    if (role.id === guild.id) return false; // @everyone
                    if (role.managed) return false; // Rôles gérés par bots/intégrations
                    if (role.name.includes('Bot') && role.name.includes('RH')) return false; // Notre bot
                    
                    return true;
                })
                .sort((a, b) => b.position - a.position); // Trier du plus haut au plus bas

            console.log(`📊 ${rolesToDelete.length} rôles à supprimer sur ${guild.roles.cache.size} rôles totaux`);
            
            // Afficher tous les rôles à supprimer
            rolesToDelete.forEach(role => {
                console.log(`🔍 Rôle à supprimer: "${role.name}" (ID: ${role.id}, Position: ${role.position}, Managed: ${role.managed})`);
            });

            // Supprimer les rôles un par un
            for (const role of rolesToDelete) {
                try {
                    // Vérifications supplémentaires
                    console.log(`🔄 Tentative suppression: "${role.name}" (Position: ${role.position})`);
                    
                    // Vérifier si le rôle existe encore (peut avoir été supprimé par une cascade)
                    const currentRole = guild.roles.cache.get(role.id);
                    if (!currentRole) {
                        console.log(`⚠️ Rôle "${role.name}" déjà supprimé, ignoré`);
                        continue;
                    }
                    
                    // Vérifier la position relative
                    const botHighestRole = botMember.roles.highest;
                    console.log(`🤖 Position du bot: ${botHighestRole.position}, Position du rôle: ${currentRole.position}`);
                    
                    if (currentRole.comparePositionTo(botHighestRole) >= 0) {
                        console.log(`⚠️ Rôle "${role.name}" trop élevé dans la hiérarchie (${currentRole.position} >= ${botHighestRole.position}), ignoré`);
                        continue;
                    }
                    
                    // Essayer de supprimer le rôle
                    await currentRole.delete('Reset complet du serveur');
                    deletedCount.roles++;
                    console.log(`✅ Rôle supprimé: "${role.name}"`);
                    
                    // Pause pour éviter la limite de taux Discord
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    console.error(`❌ Erreur suppression rôle "${role.name}":`, error.message);
                    console.error(`🔍 Code d'erreur: ${error.code}`);
                    
                    // Détails sur les erreurs courantes
                    if (error.code === 50013) {
                        console.log(`⚠️ Permission insuffisante pour supprimer: "${role.name}"`);
                    } else if (error.code === 50028) {
                        console.log(`⚠️ Rôle utilisé par une intégration: "${role.name}"`);
                    } else if (error.code === 10011) {
                        console.log(`⚠️ Rôle "${role.name}" n'existe plus`);
                    }
                }
            }

            // 3. Remettre à zéro les paramètres du serveur
            try {
                await guild.setSystemChannel(null);
                await guild.setRulesChannel(null);
                await guild.setPublicUpdatesChannel(null);
                console.log('✅ Paramètres du serveur réinitialisés');
            } catch (error) {
                console.error('❌ Erreur réinitialisation paramètres:', error);
            }

            // Embed de résultat final
            const finalEmbed = new EmbedBuilder()
                .setTitle('✅ Nettoyage Complet du Serveur Terminé!')
                .setDescription('Le serveur a été complètement nettoyé et remis à zéro.')
                .addFields(
                    { name: '🗂️ Canaux supprimés', value: `${deletedCount.channels}`, inline: true },
                    { name: '📁 Catégories supprimées', value: `${deletedCount.categories}`, inline: true },
                    { name: '👥 Rôles supprimés', value: `${deletedCount.roles}`, inline: true },
                    { name: '🎯 Résultat', value: 'Serveur complètement nettoyé !', inline: false },
                    { name: '💡 Prochaines étapes', value: 'Vous pouvez maintenant reconfigurer votre serveur depuis zéro.', inline: false }
                )
                .setColor('#00FF00')
                .setFooter({ text: `Nettoyage effectué par ${interaction.user.username}` })
                .setTimestamp();

            // Essayer de modifier le message, ou envoyer un nouveau message si impossible
            try {
                await interaction.editReply({ embeds: [finalEmbed] });
            } catch (editError) {
                if (editError.code === 10008) {
                    // Le message d'interaction a été supprimé, essayer de créer un nouveau canal pour le rapport
                    console.log('📝 Message d\'interaction supprimé, création d\'un canal de rapport...');
                    
                    try {
                        const reportChannel = await guild.channels.create({
                            name: '✅-nettoyage-termine',
                            type: 0, // Text channel
                            topic: 'Rapport de nettoyage complet du serveur'
                        });
                        
                        await reportChannel.send({ embeds: [finalEmbed] });
                        console.log('✅ Rapport final envoyé dans le nouveau canal');
                    } catch (channelError) {
                        console.error('❌ Impossible de créer le canal de rapport:', channelError);
                    }
                } else {
                    console.error('❌ Erreur modification message final:', editError);
                }
            }

            // Log dans la console
            console.log('🎉 NETTOYAGE COMPLET TERMINÉ !');
            console.log(`📊 Statistiques: ${deletedCount.channels} canaux, ${deletedCount.categories} catégories, ${deletedCount.roles} rôles supprimés`);

        } catch (error) {
            console.error('❌ Erreur lors du nettoyage du serveur:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Erreur lors du Nettoyage')
                .setDescription('Une erreur s\'est produite pendant le nettoyage du serveur.')
                .addFields({
                    name: '🔍 Détails de l\'erreur',
                    value: `\`\`\`${error.message}\`\`\``,
                    inline: false
                })
                .setColor('#FF0000')
                .setTimestamp();

            try {
                await interaction.editReply({ embeds: [errorEmbed] });
            } catch (replyError) {
                // Si on ne peut pas modifier le message d'origine, créer un nouveau canal
                if (replyError.code === 10008) {
                    console.log('⚠️ Message d\'interaction supprimé, tentative création canal d\'erreur...');
                    try {
                        const errorChannel = await interaction.guild.channels.create({
                            name: '❌-erreur-nettoyage',
                            type: 0,
                            topic: 'Erreur lors du nettoyage du serveur'
                        });
                        await errorChannel.send({ embeds: [errorEmbed] });
                    } catch (channelError) {
                        console.log('❌ Impossible de créer le canal d\'erreur:', channelError.message);
                    }
                } else {
                    console.error('Impossible de répondre à l\'interaction:', replyError);
                }
            }
        }
    }
};
