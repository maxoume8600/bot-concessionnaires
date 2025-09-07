const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-logs-absence')
        .setDescription('🏥 Créer le salon de logs pour les absences justifiées')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;

            // Créer le salon de logs absences
            const logChannel = await guild.channels.create({
                name: '📋-logs-absences-justifiees',
                type: ChannelType.GuildText,
                topic: '🏥 Logs des demandes d\'absences justifiées avec validation/refus',
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interaction.client.user.id,
                        allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages]
                    }
                ]
            });

            // Chercher les rôles d'administration et responsable
            const adminRoles = guild.roles.cache.filter(role => 
                role.name.toLowerCase().includes('admin') || 
                role.name.toLowerCase().includes('patron') || 
                role.name.toLowerCase().includes('directeur') ||
                role.name.toLowerCase().includes('gérant') ||
                role.name.toLowerCase().includes('manager') ||
                role.name.toLowerCase().includes('responsable')
            );

            // Donner accès aux rôles administratifs et responsable
            for (const role of adminRoles.values()) {
                await logChannel.permissionOverwrites.create(role, {
                    ViewChannel: true,
                    SendMessages: true,
                    ManageMessages: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ Configuration des Logs d\'Absences Terminée')
                .setDescription('Le système de validation des absences a été configuré avec succès !')
                .addFields(
                    { name: '📋 Salon créé', value: `<#${logChannel.id}>`, inline: true },
                    { name: '🔧 Fonctionnalités', value: '• Validation/Refus des demandes\n• Logs complets\n• Notifications automatiques', inline: true },
                    { name: '👥 Accès', value: `${adminRoles.size} rôle(s) administratif(s)`, inline: true }
                )
                .setColor('#00FF00')
                .setTimestamp();

            // Envoyer un message d'exemple dans le salon de logs
            const welcomeEmbed = new EmbedBuilder()
                .setTitle('🏥 Salon de Logs - Absences Justifiées')
                .setDescription('Ce salon enregistre toutes les demandes d\'absences avec leur statut de validation.')
                .addFields(
                    { name: '✅ Approuvées', value: 'Absences validées par l\'administration', inline: true },
                    { name: '❌ Refusées', value: 'Absences refusées avec raison', inline: true },
                    { name: '⏳ En attente', value: 'Demandes en cours de traitement', inline: true }
                )
                .setColor('#3498DB')
                .setTimestamp();

            await logChannel.send({ embeds: [welcomeEmbed] });

            await interaction.editReply({ embeds: [embed] });

            // Sauvegarder la configuration
            const fs = require('fs').promises;
            const path = require('path');
            const configPath = path.join(__dirname, '..', '.env');
            
            try {
                let envContent = await fs.readFile(configPath, 'utf8');
                if (envContent.includes('LOGS_ABSENCE_CHANNEL_ID=')) {
                    envContent = envContent.replace(/LOGS_ABSENCE_CHANNEL_ID=.*/, `LOGS_ABSENCE_CHANNEL_ID=${logChannel.id}`);
                } else {
                    envContent += `\nLOGS_ABSENCE_CHANNEL_ID=${logChannel.id}`;
                }
                await fs.writeFile(configPath, envContent);
            } catch (error) {
                console.log('⚠️ Impossible de sauvegarder dans .env:', error.message);
            }

        } catch (error) {
            console.error('Erreur lors de la configuration des logs d\'absences:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Erreur de Configuration')
                .setDescription(`Impossible de créer le salon de logs des absences: ${error.message}`)
                .setColor('#FF0000');

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
