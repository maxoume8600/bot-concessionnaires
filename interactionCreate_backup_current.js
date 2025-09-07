const { Events, EmbedBuilder, PermissionFlagsBits, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const EmbedUtils = require('../utils/embeds');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Gestion des commandes slash
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Aucune commande correspondant à ${interaction.commandName} n'a été trouvée.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Erreur lors de l\'exécution de la commande:', error);
                
                // Vérifier si l'interaction est encore valide
                if (error.code === 10062 || error.code === 40060) {
                    console.log('⏰ Interaction expirée ou déjà traitée, ignorée');
                    return;
                }
                
                try {
                    const errorMessage = {
                        content: '❌ Une erreur s\'est produite lors de l\'exécution de cette commande !',
                        flags: [4096] // EPHEMERAL flag
                    };

                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorMessage);
                    } else {
                        await interaction.reply(errorMessage);
                    }
                } catch (replyError) {
                    console.log('⚠️ Impossible de répondre à l\'interaction:', replyError.message);
                }
            }
        }
        
        // Gestion des boutons RH
        else if (interaction.isButton()) {
            // Gestion spéciale pour le règlement
            if (interaction.customId === 'validate_reglement') {
                await handleReglementValidation(interaction);
                return;
            }
            
            await handleButtonInteraction(interaction);
        }
        
        // Gestion des menus de sélection
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'vehicule_details') {
                const vehiculeId = interaction.values[0];
                const vehicule = interaction.client.vehicules.get(vehiculeId);
                
                if (!vehicule) {
                    return interaction.reply({
                        embeds: [EmbedUtils.createErrorEmbed('Véhicule introuvable', 'Ce véhicule n\'existe plus.')],
                        flags: [4096] // EPHEMERAL flag
                    });
                }

                const detailEmbed = EmbedUtils.createVehiculeEmbed(vehicule);
                detailEmbed.setTitle(`🚗 ${vehicule.nom} - Détails complets`);
                detailEmbed.addFields(
                    { name: '🆔 ID du véhicule', value: `\`${vehicule.id}\``, inline: true },
                    { name: '📅 Disponibilité', value: vehicule.stock > 0 ? '✅ En stock' : '❌ Rupture', inline: true }
                );

                if (vehicule.stock <= 2 && vehicule.stock > 0) {
                    detailEmbed.addFields({
                        name: '⚠️ Stock faible',
                        value: `Plus que ${vehicule.stock} exemplaire(s) disponible(s) !`,
                        inline: false
                    });
                }

                await interaction.reply({
                    embeds: [detailEmbed],
                    flags: [4096] // EPHEMERAL flag
                });
            }
        }
        
        // Gestion des modals
        else if (interaction.isModalSubmit()) {
            await handleModalSubmit(interaction);
        }
    },
};

async function handleButtonInteraction(interaction) {
    const { customId } = interaction;

    try {
        switch (customId) {
            case 'prise_service':
            case 'prendre_service':
                await handlePrendreServiceButton(interaction);
                break;
            case 'fin_service':
            case 'terminer_service':
                await handleTerminerServiceButton(interaction);
                break;
            case 'dismiss_message':
            case 'fermer_message':
                await handleDismissMessage(interaction);
                break;
            case 'absence_justifiee':
                await handleAbsenceJustifieeButton(interaction);
                break;
            case 'help_service':
                await handleHelpButton(interaction, 'service');
                break;
            case 'help_absences':
                await handleHelpButton(interaction, 'absences');
                break;
            case 'help_monitoring':
                await handleHelpButton(interaction, 'monitoring');
                break;
            case 'help_admin':
                await handleHelpButton(interaction, 'admin');
                break;
            case 'help_stats':
                await handleHelpButton(interaction, 'stats');
                break;
            default:
                await interaction.reply({
                    content: '❌ Bouton non reconnu',
                    flags: [4096] // EPHEMERAL flag
                });
        }
    } catch (error) {
        console.error('Erreur interaction bouton:', error);
        
        // Vérifier si l'interaction est encore valide
        if (error.code === 10062 || error.code === 40060) {
            console.log('⏰ Interaction bouton expirée ou déjà traitée, ignorée');
            return;
        }
        
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Erreur lors du traitement du bouton',
                    flags: [4096] // EPHEMERAL flag
                });
            }
        } catch (replyError) {
            console.log('⚠️ Impossible de répondre à l\'interaction bouton:', replyError.message);
        }
    }
}

async function handlePrendreServiceButton(interaction) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const userId = interaction.user.id;
    const userName = interaction.user.displayName || interaction.user.username;
    const timestamp = Date.now();

    // Charger les données de service
    const filePath = path.join(__dirname, '..', 'data', 'services.json');
    let serviceData;
    
    try {
        const data = await fs.readFile(filePath, 'utf8');
        serviceData = JSON.parse(data);
    } catch (error) {
        serviceData = { activeServices: [], history: [] };
    }

    // Vérifier si déjà en service
    const existingService = serviceData.activeServices.find(s => s.userId === userId);
    
    if (existingService) {
        const embed = new EmbedBuilder()
            .setTitle('⚠️ Déjà en Service')
            .setDescription(`Vous êtes déjà en service sur le poste **${existingService.poste}**`)
            .addFields({
                name: '🕐 Depuis',
                value: new Date(existingService.startTime).toLocaleString('fr-FR'),
                inline: true
            })
            .setColor('#FFA500')
            .setTimestamp();

        // Bouton pour fermer le message
        const closeButton = new ButtonBuilder()
            .setCustomId('fermer_message')
            .setLabel('Fermer')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🗑️');

        const actionRow = new ActionRowBuilder()
            .addComponents(closeButton);

        return interaction.reply({ embeds: [embed], components: [actionRow], flags: [4096] }); // EPHEMERAL flag
    }

    // Récupérer le rôle le plus élevé de l'utilisateur (excluant @everyone)
    let poste = '🏢 Standard';
    
    if (interaction.member?.roles?.cache) {
        // Filtrer les rôles (exclure @everyone) et trier par position (du plus haut au plus bas)
        const userRoles = interaction.member.roles.cache
            .filter(role => role.name !== '@everyone')
            .sort((a, b) => b.position - a.position);
        
        // Prendre le rôle le plus élevé comme poste
        if (userRoles.size > 0) {
            const highestRole = userRoles.first();
            poste = `🏷️ ${highestRole.name}`;
        }
    }

    // Créer le service
    const serviceEntry = {
        userId,
        userName,
        poste,
        startTime: timestamp,
        guildId: interaction.guild.id
    };

    // Ajouter à la liste des services actifs
    if (!serviceData.activeServices) serviceData.activeServices = [];
    serviceData.activeServices.push(serviceEntry);

    try {
        await fs.writeFile(filePath, JSON.stringify(serviceData, null, 2));
    } catch (error) {
        console.error('Erreur sauvegarde prise de service:', error);
    }

    // Réponse éphémère uniquement
    const embed = new EmbedBuilder()
        .setTitle('🟢 Prise de Service Validée')
        .setDescription(`**${userName}** a pris son service`)
        .addFields(
            { name: '👤 Nom', value: userName, inline: true },
            { name: '🏢 Poste', value: poste, inline: true },
            { name: '🕐 Heure de prise', value: new Date(timestamp).toLocaleString('fr-FR'), inline: true },
            { name: '✅ Statut', value: 'En service actif', inline: false }
        )
        .setColor('#00FF00')
        .setTimestamp();

    // Créer le bouton "Fermer"
    const closeButton = new ButtonBuilder()
        .setCustomId('dismiss_message')
        .setLabel('Fermer')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Secondary);
    
    const row = new ActionRowBuilder()
        .addComponents(closeButton);

    try {
        await interaction.reply({ 
            embeds: [embed], 
            components: [row],
            flags: [4096] 
        }); // EPHEMERAL flag
        
        // Envoyer le log dans le salon dédié
        const logChannel = interaction.guild.channels.cache.find(c => 
            c.name.includes('logs🟢-prise-de-service') || 
            c.name.includes('prise-de-service')
        );
        
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('🟢 Nouvelle Prise de Service')
                .setDescription(`${userName} a pris son service`)
                .addFields(
                    { name: '👤 Employé', value: userName, inline: true },
                    { name: '🏢 Poste', value: poste, inline: true },
                    { name: '🕐 Heure', value: new Date(timestamp).toLocaleString('fr-FR'), inline: true },
                    { name: '📍 Canal', value: interaction.channel.toString(), inline: true }
                )
                .setColor('#00FF00')
                .setTimestamp()
                .setFooter({ text: `ID: ${userId}` });
            
            await logChannel.send({ embeds: [logEmbed] });
        }
    } catch (error) {
        // Gérer les erreurs d'interaction expirée
        if (error.code === 10062 || error.code === 40060) {
            console.log('⏰ Interaction bouton prise de service expirée, ignorée');
            return;
        }
        console.error('Erreur bouton prise de service:', error);
        
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Erreur lors de la prise de service',
                    flags: [4096] // EPHEMERAL flag
                });
            }
        } catch (replyError) {
            console.log('⚠️ Impossible de répondre au bouton prise de service:', replyError.message);
        }
    }
}

async function handleTerminerServiceButton(interaction) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const userId = interaction.user.id;
    const userName = interaction.user.displayName || interaction.user.username;
    const timestamp = Date.now();

    // Charger les données de service
    const filePath = path.join(__dirname, '..', 'data', 'services.json');
    let serviceData;
    
    try {
        const data = await fs.readFile(filePath, 'utf8');
        serviceData = JSON.parse(data);
    } catch (error) {
        serviceData = { activeServices: [], history: [] };
    }

    // Vérifier si en service
    const serviceIndex = serviceData.activeServices.findIndex(s => s.userId === userId);

    if (serviceIndex === -1) {
        const embed = new EmbedBuilder()
            .setTitle('⚠️ Pas en Service')
            .setDescription('Vous n\'êtes actuellement pas en service')
            .addFields({
                name: '💡 Astuce',
                value: 'Utilisez le bouton 🟢 ou `/service prendre` pour commencer',
                inline: false
            })
            .setColor('#FFA500')
            .setTimestamp();

        // Bouton pour fermer le message
        const closeButton = new ButtonBuilder()
            .setCustomId('fermer_message')
            .setLabel('Fermer')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🗑️');

        const actionRow = new ActionRowBuilder()
            .addComponents(closeButton);

        return interaction.reply({ embeds: [embed], components: [actionRow], flags: [4096] }); // EPHEMERAL flag
    }

    // Récupérer et supprimer le service actif
    const service = serviceData.activeServices[serviceIndex];
    serviceData.activeServices.splice(serviceIndex, 1);

    // Calculer la durée
    const duration = timestamp - service.startTime;
    service.endTime = timestamp;
    service.duration = duration;

    // Ajouter à l'historique
    if (!serviceData.history) serviceData.history = [];
    serviceData.history.push(service);

    try {
        await fs.writeFile(filePath, JSON.stringify(serviceData, null, 2));
    } catch (error) {
        console.error('Erreur sauvegarde fin de service:', error);
    }

    // Formater la durée
    function formatDuration(ms) {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        
        if (hours > 0) {
            return `${hours}h ${minutes}min ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}min ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    // Réponse éphémère uniquement
    const embed = new EmbedBuilder()
        .setTitle('🔴 Fin de Service Enregistrée')
        .setDescription(`**${userName}** a terminé son service`)
        .addFields(
            { name: '👤 Nom', value: userName, inline: true },
            { name: '🏢 Poste', value: service.poste, inline: true },
            { name: '⏱️ Durée totale', value: formatDuration(duration), inline: true },
            { name: '🕐 Début', value: new Date(service.startTime).toLocaleString('fr-FR'), inline: true },
            { name: '🕐 Fin', value: new Date(timestamp).toLocaleString('fr-FR'), inline: true },
            { name: '📊 Performance', value: duration > 3600000 ? '✅ Bonne session' : '⚠️ Session courte', inline: true }
        )
        .setColor('#FF0000')
        .setTimestamp();

    // Bouton pour fermer le message
    const closeButton = new ButtonBuilder()
        .setCustomId('fermer_message')
        .setLabel('Fermer')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🗑️');

    const actionRow = new ActionRowBuilder()
        .addComponents(closeButton);

    try {
        await interaction.reply({ embeds: [embed], components: [actionRow], flags: [4096] }); // EPHEMERAL flag
        
        // Envoyer le log dans le salon dédié
        const logChannel = interaction.guild.channels.cache.find(c => 
            c.name.includes('logs-🔴-fin-de-service') || 
            c.name.includes('fin-de-service')
        );
        
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('🔴 Fin de Service')
                .setDescription(`${userName} a terminé son service`)
                .addFields(
                    { name: '👤 Employé', value: userName, inline: true },
                    { name: '🏢 Poste', value: service.poste, inline: true },
                    { name: '⏱️ Durée', value: formatDuration(duration), inline: true },
                    { name: '🕐 Début', value: new Date(service.startTime).toLocaleString('fr-FR'), inline: true },
                    { name: '🕐 Fin', value: new Date(timestamp).toLocaleString('fr-FR'), inline: true },
                    { name: '📍 Canal', value: interaction.channel.toString(), inline: true }
                )
                .setColor('#FF0000')
                .setTimestamp()
                .setFooter({ text: `ID: ${userId}` });
            
            await logChannel.send({ embeds: [logEmbed] });
        }
    } catch (error) {
        // Gérer les erreurs d'interaction expirée
        if (error.code === 10062 || error.code === 40060) {
            console.log('⏰ Interaction fin de service expirée, ignorée');
            return;
        }
        console.error('Erreur réponse fin de service:', error);
    }
}

async function handleHelpButton(interaction, section) {
    const helpCommand = interaction.client.commands.get('aide-rh');
    if (!helpCommand) {
        return interaction.reply({
            content: '❌ Commande d\'aide non trouvée',
            flags: [4096] // EPHEMERAL flag
        });
    }

    // Simuler l'option de section
    const mockOptions = {
        getString: (name) => name === 'section' ? section : null
    };

    const mockInteraction = {
        ...interaction,
        options: mockOptions
    };

    await helpCommand.showSpecificSection(mockInteraction, section);
}

async function handleAbsenceJustifieeButton(interaction) {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
    
    // Créer un modal pour saisir les informations de l'absence
    const modal = new ModalBuilder()
        .setCustomId('absence_modal')
        .setTitle('📋 Déclarer une Absence Justifiée');

    // Champ pour la raison
    const raisonInput = new TextInputBuilder()
        .setCustomId('raison_absence')
        .setLabel('Raison de l\'absence')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: Maladie, Congés, Urgence familiale...')
        .setRequired(true)
        .setMaxLength(100);

    // Champ pour la durée
    const dureeInput = new TextInputBuilder()
        .setCustomId('duree_absence')
        .setLabel('Durée de l\'absence')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 2h, 1jour, 1semaine...')
        .setRequired(true)
        .setMaxLength(50);

    // Champ pour les détails (optionnel)
    const detailsInput = new TextInputBuilder()
        .setCustomId('details_absence')
        .setLabel('Détails supplémentaires (optionnel)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Informations complémentaires...')
        .setRequired(false)
        .setMaxLength(500);

    // Créer les lignes d'action
    const raisonRow = new ActionRowBuilder().addComponents(raisonInput);
    const dureeRow = new ActionRowBuilder().addComponents(dureeInput);
    const detailsRow = new ActionRowBuilder().addComponents(detailsInput);

    // Ajouter les composants au modal
    modal.addComponents(raisonRow, dureeRow, detailsRow);

    // Afficher le modal
    await interaction.showModal(modal);
}

async function handleModalSubmit(interaction) {
    if (interaction.customId === 'absence_modal') {
        await handleAbsenceModalSubmit(interaction);
    } else {
        await interaction.reply({
            content: '❌ Modal non reconnu',
            flags: [4096] // EPHEMERAL flag
        });
    }
}

async function handleAbsenceModalSubmit(interaction) {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Récupérer les données du modal
    const raison = interaction.fields.getTextInputValue('raison_absence');
    const duree = interaction.fields.getTextInputValue('duree_absence');
    const details = interaction.fields.getTextInputValue('details_absence') || null;
    
    const userId = interaction.user.id;
    const userName = interaction.user.displayName || interaction.user.username;
    const timestamp = Date.now();
    
    // Générer un ID unique pour l'absence
    const absenceId = `ABS-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // Charger les données d'absences
    const filePath = path.join(__dirname, '..', 'data', 'absences.json');
    let absenceData;
    
    try {
        const data = await fs.readFile(filePath, 'utf8');
        absenceData = JSON.parse(data);
    } catch (error) {
        absenceData = { pending: [], approved: [], rejected: [] };
    }
    
    // Créer l'entrée d'absence
    const absence = {
        id: absenceId,
        userId,
        userName,
        raison,
        duree,
        details,
        timestamp,
        status: 'pending',
        guildId: interaction.guild.id
    };
    
    // Ajouter aux absences en attente
    if (!absenceData.pending) absenceData.pending = [];
    absenceData.pending.push(absence);
    
    // Sauvegarder
    try {
        await fs.writeFile(filePath, JSON.stringify(absenceData, null, 2));
    } catch (error) {
        console.error('Erreur sauvegarde absence:', error);
        return interaction.reply({
            content: '❌ Erreur lors de l\'enregistrement de l\'absence',
            flags: [4096] // EPHEMERAL flag
        });
    }
    
    // Créer l'embed de confirmation
    const embed = new EmbedBuilder()
        .setTitle('📋 Absence Justifiée Déclarée')
        .setDescription(`**${userName}** a déclaré une absence justifiée`)
        .addFields(
            { name: '🆔 ID de la demande', value: `\`${absenceId}\``, inline: true },
            { name: '👤 Utilisateur', value: userName, inline: true },
            { name: '📅 Date de demande', value: new Date(timestamp).toLocaleString('fr-FR'), inline: true },
            { name: '🔍 Raison', value: raison, inline: true },
            { name: '⏱️ Durée', value: duree, inline: true },
            { name: '📊 Statut', value: '⏳ En attente d\'approbation', inline: true }
        )
        .setColor('#FFA500')
        .setTimestamp()
        .setFooter({ text: `ID: ${userId}` });
    
    // Ajouter les détails si fournis
    if (details) {
        embed.addFields({
            name: '📝 Détails',
            value: details,
            inline: false
        });
    }
    
    // Répondre à l'utilisateur
    await interaction.reply({ embeds: [embed] });
    
    // Envoyer dans le canal d'absences si il existe
    const absenceChannel = interaction.guild.channels.cache.find(c => 
        c.name.includes('absences') || c.name.includes('absence')
    );
    
    if (absenceChannel && absenceChannel.id !== interaction.channel.id) {
        const logEmbed = new EmbedBuilder()
            .setTitle('📋 Nouvelle Demande d\'Absence')
            .setDescription(`${userName} a déclaré une absence justifiée`)
            .addFields(
                { name: 'ID', value: `\`${absenceId}\``, inline: true },
                { name: 'Raison', value: raison, inline: true },
                { name: 'Durée', value: duree, inline: true },
                { name: 'Canal', value: interaction.channel.name, inline: true }
            )
            .setColor('#FFA500')
            .setTimestamp();
            
        if (details) {
            logEmbed.addFields({
                name: 'Détails',
                value: details,
                inline: false
            });
        }
        
        await absenceChannel.send({ embeds: [logEmbed] });
    }
}

async function handleReglementValidation(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const member = interaction.member;
        
        // Créer le rôle "Règlement Validé" s'il n'existe pas
        let ruleValidatedRole = guild.roles.cache.find(role => 
            role.name.toLowerCase().includes('validé') || 
            role.name.toLowerCase().includes('certifié') ||
            role.name.toLowerCase().includes('règlement')
        );

        if (!ruleValidatedRole) {
            ruleValidatedRole = await guild.roles.create({
                name: '✅ Règlement Validé',
                color: '#27AE60',
                reason: 'Rôle automatique pour la validation du règlement'
            });
        }

        // Vérifier si l'utilisateur a déjà le rôle
        if (member.roles.cache.has(ruleValidatedRole.id)) {
            const alreadyValidatedEmbed = new EmbedBuilder()
                .setTitle('ℹ️ Déjà validé')
                .setDescription('Vous avez déjà validé le règlement.')
                .setColor('#3498DB')
                .setTimestamp();

            return await interaction.editReply({ embeds: [alreadyValidatedEmbed] });
        }

        // Ajouter le rôle à l'utilisateur
        await member.roles.add(ruleValidatedRole);

        // Message de confirmation pour l'utilisateur
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Règlement validé')
            .setDescription(`Merci ${member.displayName} ! Vous avez accepté le règlement du concessionnaire.`)
            .addFields(
                { name: '🎯 Status', value: 'Règlement accepté', inline: true },
                { name: '📅 Date', value: new Date().toLocaleDateString('fr-FR'), inline: true },
                { name: '🏷️ Rôle attribué', value: `${ruleValidatedRole}`, inline: true }
            )
            .setColor('#27AE60')
            .setTimestamp()
            .setThumbnail(member.displayAvatarURL());

        await interaction.editReply({ embeds: [successEmbed] });

        // Log dans un canal d'administration
        const logChannel = guild.channels.cache.find(c => 
            c.name.includes('logs') || 
            c.name.includes('rh') ||
            c.name.includes('admin')
        );

        if (logChannel && logChannel.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages)) {
            const logEmbed = new EmbedBuilder()
                .setTitle('📋 Validation de règlement')
                .setDescription(`${member} a validé le règlement`)
                .addFields(
                    { name: '👤 Utilisateur', value: `${member} (${member.id})`, inline: true },
                    { name: '📅 Date/Heure', value: new Date().toLocaleString('fr-FR'), inline: true },
                    { name: '🏷️ Rôle attribué', value: `${ruleValidatedRole}`, inline: true }
                )
                .setColor('#27AE60')
                .setTimestamp()
                .setThumbnail(member.displayAvatarURL());

            await logChannel.send({ embeds: [logEmbed] });
        }

        // Message de bienvenue dans un salon général
        const welcomeChannel = guild.channels.cache.find(c => 
            c.name.includes('général') || 
            c.name.includes('bienvenue') ||
            c.name.includes('welcome')
        );

        if (welcomeChannel && welcomeChannel.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages)) {
            const welcomeEmbed = new EmbedBuilder()
                .setTitle('🎉 Nouveau membre certifié')
                .setDescription(`${member} vient de valider le règlement et peut maintenant accéder à tous les services du concessionnaire !`)
                .setColor('#27AE60')
                .setTimestamp()
                .setThumbnail(member.displayAvatarURL());

            await welcomeChannel.send({ embeds: [welcomeEmbed] });
        }

    } catch (error) {
        console.error('Erreur validation règlement:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de la validation du règlement. Contactez un administrateur.')
            .setColor('#E74C3C')
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleDismissMessage(interaction) {
    try {
        await interaction.update({
            content: '✅ Message supprimé',
            embeds: [],
            components: [],
            flags: [4096] // EPHEMERAL flag
        });
        
        // Supprimer le message après 2 secondes
        setTimeout(async () => {
            try {
                await interaction.deleteReply();
            } catch (error) {
                // Ignorer les erreurs si le message est déjà supprimé
            }
        }, 2000);
    } catch (error) {
        console.error('Erreur suppression message:', error);
    }
}
