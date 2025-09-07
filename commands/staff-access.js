const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff-access')
        .setDescription('Gestion de l\'accès complet au serveur (Staff uniquement)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('donner')
                .setDescription('Donne l\'accès à tous les salons à un utilisateur')
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription('L\'utilisateur à qui donner l\'accès (optionnel)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('role')
                .setDescription('Crée un rôle avec accès complet au serveur')
                .addStringOption(option =>
                    option.setName('nom')
                        .setDescription('Le nom du rôle à créer')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('couleur')
                        .setDescription('La couleur du rôle (hex: #FF0000 ou nom: RED)')
                        .setRequired(false)
                )
        ),
    
    async execute(interaction) {
        try {
            // Vérifier si l'utilisateur a le rôle staff
            const staffRole = interaction.guild.roles.cache.find(role => role.name.toLowerCase() === 'staff');
            
            if (!staffRole) {
                return interaction.reply({
                    content: '❌ Le rôle "Staff" n\'existe pas sur ce serveur.',
                    ephemeral: true
                });
            }

            // Vérifier si l'utilisateur qui exécute la commande a le rôle staff
            if (!interaction.member.roles.cache.has(staffRole.id)) {
                return interaction.reply({
                    content: '❌ Vous devez avoir le rôle "Staff" pour utiliser cette commande.',
                    ephemeral: true
                });
            }

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'donner') {
                await this.handleGiveAccess(interaction);
            } else if (subcommand === 'role') {
                await this.handleCreateRole(interaction);
            }

        } catch (error) {
            console.error('Erreur commande staff-access:', error);
            
            const errorMessage = interaction.deferred ? 
                { content: '❌ Une erreur est survenue lors de l\'exécution de la commande.' } :
                { content: '❌ Une erreur est survenue lors de l\'exécution de la commande.', ephemeral: true };
                
            if (interaction.deferred) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    },

    async handleGiveAccess(interaction) {

            // Détermine l'utilisateur cible (celui spécifié ou l'utilisateur qui exécute la commande)
            const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
            const targetMember = await interaction.guild.members.fetch(targetUser.id);

            if (!targetMember) {
                return interaction.reply({
                    content: '❌ Utilisateur introuvable sur ce serveur.',
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            // Parcourir tous les salons du serveur
            const channels = interaction.guild.channels.cache.filter(channel => 
                channel.isTextBased() || channel.type === 2 // Text channels et Voice channels
            );

            for (const [channelId, channel] of channels) {
                try {
                    // Donner les permissions de lecture et écriture
                    await channel.permissionOverwrites.edit(targetMember, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true,
                        Connect: true, // Pour les salons vocaux
                        Speak: true    // Pour les salons vocaux
                    });
                    successCount++;
                } catch (error) {
                    errorCount++;
                    errors.push(`${channel.name}: ${error.message}`);
                }
            }

            // Message de résultat
            let resultMessage = `✅ **Accès accordé à ${targetUser.username}**\n\n`;
            resultMessage += `📊 **Statistiques:**\n`;
            resultMessage += `• Salons modifiés avec succès: **${successCount}**\n`;
            
            if (errorCount > 0) {
                resultMessage += `• Erreurs rencontrées: **${errorCount}**\n\n`;
                
                if (errors.length <= 5) {
                    resultMessage += `❌ **Erreurs:**\n`;
                    errors.forEach(error => {
                        resultMessage += `• ${error}\n`;
                    });
                } else {
                    resultMessage += `❌ **Premières erreurs:**\n`;
                    errors.slice(0, 5).forEach(error => {
                        resultMessage += `• ${error}\n`;
                    });
                    resultMessage += `... et ${errors.length - 5} autres erreurs.`;
                }
            }

            await interaction.editReply({
                content: resultMessage
            });
    },

    async handleCreateRole(interaction) {
        const roleName = interaction.options.getString('nom');
        const roleColor = interaction.options.getString('couleur') || '#5865F2';

        try {
            await interaction.deferReply({ ephemeral: true });

            // Vérifier si le rôle existe déjà
            const existingRole = interaction.guild.roles.cache.find(role => 
                role.name.toLowerCase() === roleName.toLowerCase()
            );

            if (existingRole) {
                return interaction.editReply({
                    content: `❌ Le rôle "${roleName}" existe déjà sur ce serveur.`
                });
            }

            // Créer le rôle avec toutes les permissions nécessaires
            const newRole = await interaction.guild.roles.create({
                name: roleName,
                color: roleColor,
                permissions: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.Connect,
                    PermissionFlagsBits.Speak,
                    PermissionFlagsBits.UseVAD,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.AddReactions,
                    PermissionFlagsBits.UseExternalEmojis,
                    PermissionFlagsBits.UseSlashCommands
                ],
                reason: `Rôle créé par ${interaction.user.username} avec la commande /staff-access`
            });

            // Donner accès à tous les salons pour ce rôle
            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            const channels = interaction.guild.channels.cache.filter(channel => 
                channel.isTextBased() || channel.type === 2
            );

            for (const [channelId, channel] of channels) {
                try {
                    await channel.permissionOverwrites.edit(newRole, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true,
                        Connect: true,
                        Speak: true
                    });
                    successCount++;
                } catch (error) {
                    errorCount++;
                    errors.push(`${channel.name}: ${error.message}`);
                }
            }

            let resultMessage = `✅ **Rôle "${roleName}" créé avec succès !**\n\n`;
            resultMessage += `🎨 **Couleur:** ${roleColor}\n`;
            resultMessage += `📊 **Statistiques:**\n`;
            resultMessage += `• Salons configurés avec succès: **${successCount}**\n`;
            
            if (errorCount > 0) {
                resultMessage += `• Erreurs rencontrées: **${errorCount}**\n`;
            }

            resultMessage += `\n🔧 **Permissions accordées:**\n`;
            resultMessage += `• Voir les salons\n`;
            resultMessage += `• Envoyer des messages\n`;
            resultMessage += `• Lire l'historique\n`;
            resultMessage += `• Se connecter aux salons vocaux\n`;
            resultMessage += `• Parler dans les salons vocaux\n`;
            resultMessage += `• Utiliser les commandes slash\n`;

            await interaction.editReply({
                content: resultMessage
            });

        } catch (error) {
            console.error('Erreur création rôle:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ Une erreur est survenue lors de la création du rôle.'
                });
            } else {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors de la création du rôle.',
                    ephemeral: true
                });
            }
        }
    }
};
