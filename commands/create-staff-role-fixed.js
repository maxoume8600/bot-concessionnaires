const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-staff-role')
        .setDescription('Crée le rôle Staff avec toutes les permissions administratives')
        .addStringOption(option =>
            option.setName('couleur')
                .setDescription('La couleur du rôle Staff (hex: #FF0000 ou nom: RED)')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('admin-complet')
                .setDescription('Donner les permissions d\'administrateur complètes (défaut: false)')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        try {
            // Vérifier si l'utilisateur a les permissions d'administrateur
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: '❌ Vous devez être administrateur pour utiliser cette commande.',
                    ephemeral: true
                });
            }

            const roleColor = interaction.options.getString('couleur') || '#e7e7e7';
            const fullAdmin = interaction.options.getBoolean('admin-complet') || false;

            console.log(`[DEBUG] Création rôle Staff - Couleur: ${roleColor}, Admin complet: ${fullAdmin}`);

            await interaction.deferReply({ ephemeral: true });

            // Vérifier si le rôle Staff existe déjà
            const existingStaffRole = interaction.guild.roles.cache.find(role => 
                role.name.toLowerCase() === 'staff'
            );

            if (existingStaffRole) {
                return interaction.editReply({
                    content: `❌ Le rôle "Staff" existe déjà sur ce serveur.\nID du rôle: ${existingStaffRole.id}\nMentions: <@&${existingStaffRole.id}>`
                });
            }

            // Définir les permissions selon le niveau choisi
            const staffPermissions = fullAdmin ? [
                // Permissions d'administrateur complet
                PermissionFlagsBits.Administrator
            ] : [
                // Permissions staff superviseur (sans admin complet)
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageRoles,
                PermissionFlagsBits.ViewAuditLog,
                PermissionFlagsBits.ManageWebhooks,
                PermissionFlagsBits.ManageGuild,
                
                // Permissions de modération
                PermissionFlagsBits.KickMembers,
                PermissionFlagsBits.BanMembers,
                PermissionFlagsBits.ModerateMembers,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.ManageThreads,
                
                // Permissions de communication
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.SendMessagesInThreads,
                PermissionFlagsBits.CreatePublicThreads,
                PermissionFlagsBits.CreatePrivateThreads,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.MentionEveryone,
                PermissionFlagsBits.UseExternalEmojis,
                PermissionFlagsBits.UseExternalStickers,
                PermissionFlagsBits.AddReactions,
                
                // Permissions vocales
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.Speak,
                PermissionFlagsBits.MuteMembers,
                PermissionFlagsBits.DeafenMembers,
                PermissionFlagsBits.MoveMembers,
                PermissionFlagsBits.UseVAD,
                PermissionFlagsBits.PrioritySpeaker,
                
                // Permissions spéciales
                PermissionFlagsBits.ChangeNickname,
                PermissionFlagsBits.ManageNicknames
            ];

            // Vérifier que toutes les permissions existent
            const validPermissions = staffPermissions.filter(perm => perm !== undefined);
            console.log(`[DEBUG] Permissions valides: ${validPermissions.length}/${staffPermissions.length}`);
            
            if (validPermissions.length !== staffPermissions.length) {
                return interaction.editReply({
                    content: '❌ Certaines permissions sont invalides. Veuillez contacter un développeur.'
                });
            }

            // Créer le rôle Staff
            console.log('[DEBUG] Tentative de création du rôle Staff...');
            const staffRole = await interaction.guild.roles.create({
                name: 'Staff',
                color: roleColor,
                permissions: staffPermissions,
                hoist: true, // Afficher séparément dans la liste des membres
                mentionable: true, // Permettre de mentionner le rôle
                reason: `Rôle Staff créé par ${interaction.user.username} avec la commande /create-staff-role`
            });
            console.log(`[DEBUG] Rôle Staff créé avec succès - ID: ${staffRole.id}`);

            // Positionner le rôle en haut de la hiérarchie (juste en dessous du bot)
            const botMember = interaction.guild.members.me;
            const botHighestRole = botMember.roles.highest;
            
            try {
                await staffRole.setPosition(botHighestRole.position - 1);
            } catch (error) {
                console.log('Impossible de positionner le rôle Staff:', error.message);
            }

            // Configurer les permissions sur tous les salons
            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            const channels = interaction.guild.channels.cache;

            for (const [channelId, channel] of channels) {
                try {
                    // Permissions spéciales pour tous types de salons
                    const channelPermissions = {
                        ViewChannel: true,
                        ManageChannels: true,
                        ManageRoles: true,
                    };

                    // Permissions pour salons texte
                    if (channel.isTextBased()) {
                        Object.assign(channelPermissions, {
                            SendMessages: true,
                            SendMessagesInThreads: true,
                            CreatePublicThreads: true,
                            CreatePrivateThreads: true,
                            EmbedLinks: true,
                            AttachFiles: true,
                            ReadMessageHistory: true,
                            MentionEveryone: true,
                            UseExternalEmojis: true,
                            AddReactions: true,
                            ManageMessages: true,
                            ManageThreads: true
                        });
                    }

                    // Permissions pour salons vocaux
                    if (channel.type === 2) { // Voice channel
                        Object.assign(channelPermissions, {
                            Connect: true,
                            Speak: true,
                            MuteMembers: true,
                            DeafenMembers: true,
                            MoveMembers: true,
                            UseVAD: true,
                            PrioritySpeaker: true
                        });
                    }

                    await channel.permissionOverwrites.edit(staffRole, channelPermissions);
                    successCount++;
                } catch (error) {
                    errorCount++;
                    errors.push(`${channel.name}: ${error.message}`);
                }
            }

            // Message de résultat détaillé
            let resultMessage = `✅ **Rôle "Staff" créé avec succès !**\n\n`;
            resultMessage += `🎭 **Informations du rôle:**\n`;
            resultMessage += `• ID: \`${staffRole.id}\`\n`;
            resultMessage += `• Mention: <@&${staffRole.id}>\n`;
            resultMessage += `• Couleur: ${roleColor}\n`;
            resultMessage += `• Position: ${staffRole.position}\n`;
            resultMessage += `• Type: ${fullAdmin ? 'Administrateur complet' : 'Staff superviseur'}\n\n`;

            resultMessage += `📊 **Configuration des salons:**\n`;
            resultMessage += `• Salons configurés: **${successCount}**\n`;
            
            if (errorCount > 0) {
                resultMessage += `• Erreurs: **${errorCount}**\n`;
            }

            resultMessage += `\n🔧 **Permissions accordées:**\n`;
            
            if (fullAdmin) {
                resultMessage += `• **Administrateur complet** (toutes permissions)\n`;
            } else {
                resultMessage += `• Gestion des salons et rôles\n`;
                resultMessage += `• Modération complète (ban, kick, timeout)\n`;
                resultMessage += `• Gestion des messages et threads\n`;
                resultMessage += `• Contrôle vocal complet\n`;
                resultMessage += `• Accès aux logs d'audit\n`;
                resultMessage += `• Webhooks et intégrations\n`;
            }

            resultMessage += `\n💡 **Conseils:**\n`;
            resultMessage += `• Attribuez ce rôle aux membres de confiance\n`;
            resultMessage += `• Le rôle est mentionnable avec <@&${staffRole.id}>\n`;
            resultMessage += `• Utilisez \`/staff-access\` pour gérer l'accès aux salons\n`;

            if (errors.length > 0 && errors.length <= 3) {
                resultMessage += `\n❌ **Erreurs rencontrées:**\n`;
                errors.forEach(error => {
                    resultMessage += `• ${error}\n`;
                });
            }

            await interaction.editReply({
                content: resultMessage
            });

        } catch (error) {
            console.error('Erreur création rôle Staff:', error);
            
            let errorMessage = '❌ Une erreur est survenue lors de la création du rôle Staff.\n\n';
            
            // Messages d'erreur spécifiques
            if (error.code === 50013) {
                errorMessage += '**Raison:** Permissions insuffisantes.\n';
                errorMessage += '• Le bot doit avoir la permission "Gérer les rôles"\n';
                errorMessage += '• Le bot doit être positionné au-dessus des rôles qu\'il veut créer';
            } else if (error.code === 50035) {
                errorMessage += '**Raison:** Paramètres invalides.\n';
                errorMessage += `• Couleur fournie: \`${interaction.options.getString('couleur') || '#e7e7e7'}\`\n`;
                errorMessage += '• Vérifiez le format de la couleur (ex: #FF0000 ou RED)';
            } else if (error.message.includes('color')) {
                errorMessage += '**Raison:** Format de couleur invalide.\n';
                errorMessage += `• Couleur fournie: \`${interaction.options.getString('couleur') || '#e7e7e7'}\`\n`;
                errorMessage += '• Utilisez un format hex (#FF0000) ou un nom de couleur (RED, BLUE, etc.)';
            } else {
                errorMessage += `**Détails de l'erreur:**\n`;
                errorMessage += `• Code: ${error.code || 'Inconnu'}\n`;
                errorMessage += `• Message: ${error.message}\n`;
                errorMessage += `• Type: ${error.name || 'Erreur générale'}`;
            }
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: errorMessage
                });
            } else {
                await interaction.reply({
                    content: errorMessage,
                    ephemeral: true
                });
            }
        }
    },
};
