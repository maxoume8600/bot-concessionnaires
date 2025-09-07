const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-absence-panel')
        .setDescription('Configure le panneau des absences justifiées dans le salon')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        try {
            // Déférer la réponse
            await interaction.deferReply({ ephemeral: true });

            // Rechercher le canal d'absences
            const channelName = '📋-absences-justifiees';
            const channel = interaction.guild.channels.cache.find(ch => ch.name === channelName);
            
            if (!channel) {
                return await interaction.editReply({
                    content: `❌ Canal \`${channelName}\` introuvable. Veuillez d'abord créer le canal.`,
                    ephemeral: true
                });
            }

            // Vérifier les permissions du bot dans ce canal
            const botPermissions = channel.permissionsFor(interaction.client.user);
            if (!botPermissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
                return await interaction.editReply({
                    content: `❌ Je n'ai pas les permissions nécessaires dans le canal ${channel}.`,
                    ephemeral: true
                });
            }

            // Créer l'embed principal
            const mainEmbed = new EmbedBuilder()
                .setTitle('🏠 ABSENCES JUSTIFIÉES')
                .setDescription('Utilisez ce canal pour **justifier vos absences**.')
                .setColor('#5865F2')
                .addFields([
                    {
                        name: '📝 Comment justifier ?',
                        value: 'Cliquez sur le bouton ci-dessous ou utilisez `/absence justifier [raison] [durée]`',
                        inline: false
                    },
                    {
                        name: '✅ Raisons acceptées',
                        value: '• Maladie\n• Congés\n• Urgence familiale\n• Formation\n• Autre (à préciser)',
                        inline: true
                    },
                    {
                        name: '⚠️ Important',
                        value: 'Prévenez à l\'avance quand c\'est possible',
                        inline: true
                    }
                ])
                .setFooter({ text: `Aujourd'hui à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` })
                .setTimestamp();

            // Créer le bouton "Déclarer une absence"
            const declareButton = new ButtonBuilder()
                .setCustomId('declare_absence')
                .setLabel('Déclarer une absence')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📋');

            // Créer le bouton "Vérifier le statut"
            const checkStatusButton = new ButtonBuilder()
                .setCustomId('check_absence_status')
                .setLabel('Vérifier le statut de mes demandes')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔍');

            const actionRow = new ActionRowBuilder()
                .addComponents(declareButton, checkStatusButton);

            // Supprimer les anciens messages du bot dans ce canal
            const messages = await channel.messages.fetch({ limit: 10 });
            const botMessages = messages.filter(msg => msg.author.id === interaction.client.user.id);
            if (botMessages.size > 0) {
                await channel.bulkDelete(botMessages).catch(() => {
                    // Ignorer les erreurs de suppression (messages trop anciens)
                });
            }

            // Envoyer le message principal
            await channel.send({
                embeds: [mainEmbed],
                components: [actionRow]
            });

            await interaction.editReply({
                content: `✅ Panneau des absences justifiées configuré avec succès dans ${channel} !`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Erreur lors de la configuration du panneau d\'absences:', error);
            
            const errorMessage = '❌ Une erreur est survenue lors de la configuration du panneau.';
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: errorMessage,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: errorMessage,
                    ephemeral: true
                });
            }
        }
    }
};
