const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('absence')
        .setDescription('Gestion des absences justifiées')
        .addSubcommand(subcommand =>
            subcommand
                .setName('justifier')
                .setDescription('Justifier une absence')
                .addStringOption(option =>
                    option
                        .setName('raison')
                        .setDescription('Raison de l\'absence')
                        .setRequired(true)
                        .addChoices(
                            { name: '🤒 Maladie', value: 'maladie' },
                            { name: '🏖️ Congés', value: 'conges' },
                            { name: '👨‍👩‍👧‍👦 Urgence familiale', value: 'urgence_familiale' },
                            { name: '📚 Formation', value: 'formation' },
                            { name: '🏥 Rendez-vous médical', value: 'rdv_medical' },
                            { name: '🚗 Transport', value: 'transport' },
                            { name: '❓ Autre', value: 'autre' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('duree')
                        .setDescription('Durée de l\'absence (ex: 2h, 1jour, 1semaine)')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('details')
                        .setDescription('Détails supplémentaires (optionnel)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('liste')
                .setDescription('Voir les absences déclarées')
                .addUserOption(option =>
                    option
                        .setName('utilisateur')
                        .setDescription('Utilisateur à consulter (admin uniquement)')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('periode')
                        .setDescription('Période à consulter')
                        .addChoices(
                            { name: 'Aujourd\'hui', value: 'today' },
                            { name: 'Cette semaine', value: 'week' },
                            { name: 'Ce mois', value: 'month' },
                            { name: 'Toutes', value: 'all' }
                        )
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('supprimer')
                .setDescription('Supprimer une absence (admin uniquement)')
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription('ID de l\'absence à supprimer')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('statistiques')
                .setDescription('Statistiques des absences (admin uniquement)')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'justifier':
                    await this.handleJustifier(interaction);
                    break;
                case 'liste':
                    await this.handleListe(interaction);
                    break;
                case 'supprimer':
                    await this.handleSupprimer(interaction);
                    break;
                case 'statistiques':
                    await this.handleStatistiques(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Sous-commande non reconnue',
                        flags: MessageFlags.Ephemeral
                    });
            }
        } catch (error) {
            console.error('Erreur commande absence:', error);
            
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Erreur lors de l\'exécution de la commande',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    },

    async handleJustifier(interaction) {
        const userId = interaction.user.id;
        const userName = interaction.user.displayName || interaction.user.username;
        const raison = interaction.options.getString('raison');
        const duree = interaction.options.getString('duree');
        const details = interaction.options.getString('details') || '';
        const timestamp = Date.now();

        // Générer un ID unique pour l'absence
        const absenceId = `ABS-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        // Charger les données d'absences
        const absenceData = await this.loadAbsenceData();

        // Créer la nouvelle absence
        const newAbsence = {
            id: absenceId,
            userId,
            userName,
            raison,
            duree,
            details,
            timestamp,
            status: 'en_attente', // en_attente, acceptee, refusee
            approvedBy: null,
            approvedAt: null
        };

        // Ajouter à la liste
        absenceData.absences.push(newAbsence);
        await this.saveAbsenceData(absenceData);

        // Mapper les raisons vers des labels lisibles
        const raisonLabels = {
            'maladie': '🤒 Maladie',
            'conges': '🏖️ Congés',
            'urgence_familiale': '👨‍👩‍👧‍👦 Urgence familiale',
            'formation': '📚 Formation',
            'rdv_medical': '🏥 Rendez-vous médical',
            'transport': '🚗 Problème de transport',
            'autre': '❓ Autre raison'
        };

        // Embed de confirmation
        const embed = new EmbedBuilder()
            .setTitle('📋 Absence Justifiée Enregistrée')
            .setDescription(`**${userName}** a déclaré une absence`)
            .addFields(
                { name: '👤 Nom', value: userName, inline: true },
                { name: '📝 Raison', value: raisonLabels[raison] || raison, inline: true },
                { name: '⏱️ Durée', value: duree, inline: true },
                { name: '🆔 ID Absence', value: absenceId, inline: true },
                { name: '🕐 Déclarée le', value: new Date(timestamp).toLocaleString('fr-FR'), inline: true },
                { name: '📊 Statut', value: '⏳ En attente de validation', inline: true }
            )
            .setColor('#FFA500')
            .setTimestamp()
            .setFooter({ text: `Conservez cet ID: ${absenceId}` });

        if (details) {
            embed.addFields({
                name: '📄 Détails supplémentaires',
                value: details,
                inline: false
            });
        }

        // Répondre à l'utilisateur
        await interaction.reply({ embeds: [embed] });

        // Notifier les admins avec boutons de validation
        const adminChannel = interaction.guild.channels.cache.find(c => 
            c.name === 'commandes-admin' || c.name === 'logs-rh'
        );

        // Chercher le salon de logs d'absences (avec l'émoji)
        const logsAbsenceChannel = interaction.guild.channels.cache.find(c => 
            c.name.includes('logs-absences-justifiees') || 
            c.name.includes('logs-absence') ||
            c.name === '📋-logs-absences-justifiees'
        );
        
        if (adminChannel || logsAbsenceChannel) {
            const adminEmbed = new EmbedBuilder()
                .setTitle('🚨 Nouvelle Absence à Valider')
                .setDescription(`**${userName}** a déclaré une absence`)
                .addFields(
                    { name: '👤 Employé', value: userName, inline: true },
                    { name: '📝 Raison', value: raisonLabels[raison], inline: true },
                    { name: '⏱️ Durée', value: duree, inline: true },
                    { name: '🆔 ID Absence', value: absenceId, inline: true },
                    { name: '🕐 Déclarée le', value: new Date(timestamp).toLocaleString('fr-FR'), inline: true },
                    { name: '📊 Statut', value: '⏳ En attente de validation', inline: true }
                )
                .setColor('#FFA500')
                .setTimestamp();

            if (details) {
                adminEmbed.addFields({
                    name: '📄 Détails supplémentaires',
                    value: details,
                    inline: false
                });
            }

            // Boutons de validation
            const approveButton = new ButtonBuilder()
                .setCustomId(`approve_absence_${absenceId}`)
                .setLabel('✅ Approuver')
                .setStyle(ButtonStyle.Success);

            const rejectButton = new ButtonBuilder()
                .setCustomId(`reject_absence_${absenceId}`)
                .setLabel('❌ Refuser')
                .setStyle(ButtonStyle.Danger);

            const actionRow = new ActionRowBuilder()
                .addComponents(approveButton, rejectButton);

            if (adminChannel) {
                await adminChannel.send({ embeds: [adminEmbed], components: [actionRow] });
            }

            // Envoyer aussi dans le salon de logs s'il existe
            if (logsAbsenceChannel && logsAbsenceChannel.id !== adminChannel?.id) {
                await logsAbsenceChannel.send({ embeds: [adminEmbed], components: [actionRow] });
            }
        }
    },

    async handleListe(interaction) {
        const targetUser = interaction.options.getUser('utilisateur');
        const periode = interaction.options.getString('periode') || 'week';
        
        // Vérifier permissions pour consulter autre utilisateur
        if (targetUser && !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                content: '❌ Vous n\'avez pas la permission de consulter les absences d\'autres utilisateurs',
                flags: MessageFlags.Ephemeral
            });
        }

        const absenceData = await this.loadAbsenceData();
        let absences = absenceData.absences || [];

        // Filtrer par utilisateur si spécifié
        if (targetUser) {
            absences = absences.filter(a => a.userId === targetUser.id);
        } else if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            // Si pas admin, ne voir que ses propres absences
            absences = absences.filter(a => a.userId === interaction.user.id);
        }

        // Filtrer par période
        const now = Date.now();
        const periods = {
            today: now - (24 * 60 * 60 * 1000), // 24h
            week: now - (7 * 24 * 60 * 60 * 1000), // 7 jours
            month: now - (30 * 24 * 60 * 60 * 1000), // 30 jours
            all: 0 // Toutes les absences
        };

        if (periods[periode] > 0) {
            absences = absences.filter(a => a.timestamp >= periods[periode]);
        }

        // Trier par date (plus récent en premier)
        absences.sort((a, b) => b.timestamp - a.timestamp);

        const embed = new EmbedBuilder()
            .setTitle('📋 Absences Justifiées')
            .setColor('#9B59B6')
            .setTimestamp();

        if (absences.length === 0) {
            embed.setDescription('🚫 Aucune absence trouvée pour cette période')
                .setColor('#FF6B6B');
            return interaction.reply({ embeds: [embed] });
        }

        const periodeLabels = {
            today: 'aujourd\'hui',
            week: 'cette semaine',
            month: 'ce mois',
            all: 'toutes périodes'
        };

        embed.setDescription(`${absences.length} absence(s) pour ${periodeLabels[periode]}`);

        // Grouper par statut
        const grouped = {
            en_attente: absences.filter(a => a.status === 'en_attente'),
            acceptee: absences.filter(a => a.status === 'acceptee'),
            refusee: absences.filter(a => a.status === 'refusee')
        };

        const statusIcons = {
            en_attente: '⏳',
            acceptee: '✅',
            refusee: '❌'
        };

        const statusLabels = {
            en_attente: 'En attente',
            acceptee: 'Acceptées',
            refusee: 'Refusées'
        };

        const raisonLabels = {
            'maladie': '🤒 Maladie',
            'conges': '🏖️ Congés',
            'urgence_familiale': '👨‍👩‍👧‍👦 Urgence familiale',
            'formation': '📚 Formation',
            'rdv_medical': '🏥 RDV médical',
            'transport': '🚗 Transport',
            'autre': '❓ Autre'
        };

        // Afficher par statut
        Object.entries(grouped).forEach(([status, list]) => {
            if (list.length > 0) {
                const absencesList = list.slice(0, 5).map(absence => {
                    const date = new Date(absence.timestamp).toLocaleDateString('fr-FR');
                    const raison = raisonLabels[absence.raison] || absence.raison;
                    
                    return `**${absence.userName}** - ${date}\n` +
                           `└ ${raison} • ${absence.duree} • \`${absence.id}\``;
                }).join('\n\n');

                embed.addFields({
                    name: `${statusIcons[status]} ${statusLabels[status]} (${list.length})`,
                    value: absencesList + (list.length > 5 ? '\n...' : ''),
                    inline: false
                });
            }
        });

        // Statistiques rapides si admin
        if (interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            embed.addFields({
                name: '📊 Résumé',
                value: [
                    `• Total: ${absences.length}`,
                    `• En attente: ${grouped.en_attente.length}`,
                    `• Acceptées: ${grouped.acceptee.length}`,
                    `• Refusées: ${grouped.refusee.length}`
                ].join('\n'),
                inline: true
            });
        }

        await interaction.reply({ embeds: [embed] });
    },

    async handleSupprimer(interaction) {
        // Vérifier permissions admin
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                content: '❌ Vous n\'avez pas la permission de supprimer des absences',
                flags: MessageFlags.Ephemeral
            });
        }

        const absenceId = interaction.options.getString('id');
        const absenceData = await this.loadAbsenceData();
        
        const absenceIndex = absenceData.absences.findIndex(a => a.id === absenceId);
        
        if (absenceIndex === -1) {
            return interaction.reply({
                content: `❌ Absence avec l'ID \`${absenceId}\` non trouvée`,
                flags: MessageFlags.Ephemeral
            });
        }

        const absence = absenceData.absences[absenceIndex];
        absenceData.absences.splice(absenceIndex, 1);
        await this.saveAbsenceData(absenceData);

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Absence Supprimée')
            .setDescription(`Absence de **${absence.userName}** supprimée`)
            .addFields(
                { name: 'ID', value: absence.id, inline: true },
                { name: 'Raison', value: absence.raison, inline: true },
                { name: 'Durée', value: absence.duree, inline: true }
            )
            .setColor('#FF0000')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async handleStatistiques(interaction) {
        // Vérifier permissions admin
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                content: '❌ Vous n\'avez pas la permission de voir les statistiques',
                flags: MessageFlags.Ephemeral
            });
        }

        const absenceData = await this.loadAbsenceData();
        const absences = absenceData.absences || [];

        if (absences.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('📊 Statistiques des Absences')
                .setDescription('🚫 Aucune donnée d\'absence disponible')
                .setColor('#FF6B6B')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed] });
        }

        // Calculer les statistiques
        const total = absences.length;
        const parStatut = {
            en_attente: absences.filter(a => a.status === 'en_attente').length,
            acceptee: absences.filter(a => a.status === 'acceptee').length,
            refusee: absences.filter(a => a.status === 'refusee').length
        };

        // Par raison
        const parRaison = {};
        absences.forEach(a => {
            parRaison[a.raison] = (parRaison[a.raison] || 0) + 1;
        });

        // Top utilisateurs
        const parUtilisateur = {};
        absences.forEach(a => {
            parUtilisateur[a.userName] = (parUtilisateur[a.userName] || 0) + 1;
        });

        const topUtilisateurs = Object.entries(parUtilisateur)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);

        const embed = new EmbedBuilder()
            .setTitle('📊 Statistiques des Absences')
            .setDescription(`Analyse de ${total} absence(s) enregistrée(s)`)
            .setColor('#9B59B6')
            .setTimestamp();

        // Statistiques par statut
        embed.addFields({
            name: '📈 Répartition par statut',
            value: [
                `⏳ En attente: ${parStatut.en_attente} (${Math.round(parStatut.en_attente/total*100)}%)`,
                `✅ Acceptées: ${parStatut.acceptee} (${Math.round(parStatut.acceptee/total*100)}%)`,
                `❌ Refusées: ${parStatut.refusee} (${Math.round(parStatut.refusee/total*100)}%)`
            ].join('\n'),
            inline: true
        });

        // Top raisons
        const topRaisons = Object.entries(parRaison)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([raison, count]) => {
                const raisonLabels = {
                    'maladie': '🤒 Maladie',
                    'conges': '🏖️ Congés',
                    'urgence_familiale': '👨‍👩‍👧‍👦 Urgence familiale',
                    'formation': '📚 Formation',
                    'rdv_medical': '🏥 RDV médical',
                    'transport': '🚗 Transport',
                    'autre': '❓ Autre'
                };
                
                return `${raisonLabels[raison] || raison}: ${count}`;
            });

        embed.addFields({
            name: '📝 Top raisons',
            value: topRaisons.join('\n') || 'Aucune donnée',
            inline: true
        });

        // Top utilisateurs si pertinent
        if (topUtilisateurs.length > 1) {
            embed.addFields({
                name: '👥 Top utilisateurs',
                value: topUtilisateurs.map(([nom, count]) => `${nom}: ${count}`).join('\n'),
                inline: false
            });
        }

        // Évolution récente (derniers 30 jours)
        const derniers30j = absences.filter(a => 
            a.timestamp >= Date.now() - (30 * 24 * 60 * 60 * 1000)
        ).length;

        embed.addFields({
            name: '📅 Période récente',
            value: `${derniers30j} absence(s) dans les 30 derniers jours`,
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
    },

    async loadAbsenceData() {
        const filePath = path.join(__dirname, '..', 'data', 'absences.json');
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // Créer le fichier s'il n'existe pas
            const defaultData = {
                absences: []
            };
            await this.saveAbsenceData(defaultData);
            return defaultData;
        }
    },

    async saveAbsenceData(data) {
        const filePath = path.join(__dirname, '..', 'data', 'absences.json');
        try {
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Erreur sauvegarde absences:', error);
        }
    }
};
