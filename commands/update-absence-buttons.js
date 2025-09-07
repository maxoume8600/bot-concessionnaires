const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('update-absence-buttons')
        .setDescription('🔄 Remet les boutons pour toutes les absences en attente dans le salon logs'),

    async execute(interaction) {
        // Vérifier les permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Charger les données d'absences
            const filePath = path.join(__dirname, '..', 'data', 'absences.json');
            let absenceData;
            
            try {
                const data = await fs.readFile(filePath, 'utf8');
                absenceData = JSON.parse(data);
            } catch (error) {
                return interaction.editReply('❌ Aucune donnée d\'absence trouvée.');
            }

            const absences = absenceData.absences || [];
            const absencesEnAttente = absences.filter(a => a.status === 'en_attente');

            if (absencesEnAttente.length === 0) {
                return interaction.editReply('✅ Aucune absence en attente à traiter.');
            }

            // Chercher le salon de logs d'absences
            const logsAbsenceChannel = interaction.guild.channels.cache.find(c => 
                c.name.includes('logs-absences-justifiees') || 
                c.name.includes('logs-absence') ||
                c.name === '📋-logs-absences-justifiees'
            );

            if (!logsAbsenceChannel) {
                return interaction.editReply('❌ Salon de logs d\'absences non trouvé. Utilisez `/setup-logs-absence` pour le créer.');
            }

            // Mapper les raisons vers des labels lisibles
            const raisonLabels = {
                'maladie': '🏥 Maladie',
                'conges_payes': '🏖️ Congés payés',
                'conges_sans_solde': '📋 Congés sans solde',
                'formation': '📚 Formation',
                'familial': '👨‍👩‍👧‍👦 Raison familiale',
                'autre': '❓ Autre raison'
            };

            let messagesEnvoyes = 0;

            for (const absence of absencesEnAttente) {
                const embed = new EmbedBuilder()
                    .setTitle('🚨 Absence en Attente de Validation')
                    .setDescription(`**${absence.userName}** a déclaré une absence`)
                    .addFields(
                        { name: '👤 Employé', value: absence.userName, inline: true },
                        { name: '📝 Raison', value: raisonLabels[absence.raison] || absence.raison, inline: true },
                        { name: '⏱️ Durée', value: absence.duree, inline: true },
                        { name: '🆔 ID Absence', value: absence.id, inline: true },
                        { name: '🕐 Déclarée le', value: new Date(absence.timestamp).toLocaleString('fr-FR'), inline: true },
                        { name: '📊 Statut', value: '⏳ En attente de validation', inline: true }
                    )
                    .setColor('#FFA500')
                    .setTimestamp();

                if (absence.details) {
                    embed.addFields({
                        name: '📄 Détails supplémentaires',
                        value: absence.details,
                        inline: false
                    });
                }

                // Boutons de validation
                const approveButton = new ButtonBuilder()
                    .setCustomId(`approve_absence_${absence.id}`)
                    .setLabel('✅ Approuver')
                    .setStyle(ButtonStyle.Success);

                const rejectButton = new ButtonBuilder()
                    .setCustomId(`reject_absence_${absence.id}`)
                    .setLabel('❌ Refuser')
                    .setStyle(ButtonStyle.Danger);

                const actionRow = new ActionRowBuilder()
                    .addComponents(approveButton, rejectButton);

                await logsAbsenceChannel.send({ embeds: [embed], components: [actionRow] });
                messagesEnvoyes++;
            }

            await interaction.editReply(`✅ ${messagesEnvoyes} message(s) d'absence avec boutons envoyé(s) dans ${logsAbsenceChannel.name}`);

        } catch (error) {
            console.error('Erreur update-absence-buttons:', error);
            await interaction.editReply('❌ Une erreur est survenue lors de la mise à jour des boutons d\'absence.');
        }
    }
};
