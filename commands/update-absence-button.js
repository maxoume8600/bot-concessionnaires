const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('update-absence-button')
        .setDescription('Ajouter le bouton d\'absence au canal absences-justifiees')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            // Chercher le canal d'absences
            const absenceChannel = interaction.guild.channels.cache.find(c => 
                c.name.includes('absences') || c.name.includes('absence')
            );

            if (!absenceChannel) {
                return interaction.reply({
                    content: '❌ Canal d\'absences non trouvé ! Cherchez un canal contenant "absence" dans le nom.',
                    flags: [4096] // EPHEMERAL flag
                });
            }

            // Créer l'embed pour les absences avec le bouton
            const absencesEmbed = new EmbedBuilder()
                .setTitle('📋 ABSENCES JUSTIFIÉES')
                .setDescription('Utilisez ce canal pour **justifier vos absences**.')
                .addFields(
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
                        value: 'Prévenez **à l\'avance** quand c\'est possible',
                        inline: true 
                    }
                )
                .setColor('#FFA500')
                .setTimestamp();

            // Créer le bouton d'absence
            const absenceButton = new ButtonBuilder()
                .setCustomId('absence_justifiee')
                .setLabel('📋 Déclarer une absence')
                .setStyle(ButtonStyle.Secondary);

            const absenceRow = new ActionRowBuilder().addComponents(absenceButton);

            // Envoyer le message avec le bouton dans le canal d'absences
            await absenceChannel.send({ 
                embeds: [absencesEmbed], 
                components: [absenceRow] 
            });

            // Confirmer à l'utilisateur
            const confirmEmbed = new EmbedBuilder()
                .setTitle('✅ Bouton d\'Absence Ajouté')
                .setDescription(`Le bouton de déclaration d'absence a été ajouté dans ${absenceChannel}`)
                .addFields(
                    { name: '📍 Canal', value: absenceChannel.name, inline: true },
                    { name: '🔗 ID du canal', value: absenceChannel.id, inline: true },
                    { name: '⚡ Action', value: 'Bouton "📋 Déclarer une absence" disponible', inline: false }
                )
                .setColor('#00FF00')
                .setTimestamp();

            await interaction.reply({ embeds: [confirmEmbed] });

        } catch (error) {
            console.error('Erreur update-absence-button:', error);
            
            await interaction.reply({
                content: `❌ Erreur lors de l'ajout du bouton: ${error.message}`,
                flags: [4096] // EPHEMERAL flag
            });
        }
    }
};
