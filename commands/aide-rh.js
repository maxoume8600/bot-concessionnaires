const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aide-rh')
        .setDescription('Guide d\'utilisation du système de gestion RH')
        .addStringOption(option =>
            option
                .setName('section')
                .setDescription('Section spécifique du guide')
                .addChoices(
                    { name: '🟢 Prise de service', value: 'service' },
                    { name: '📋 Absences justifiées', value: 'absences' },
                    { name: '🔍 Monitoring', value: 'monitoring' },
                    { name: '⚙️ Administration', value: 'admin' },
                    { name: '📊 Statistiques', value: 'stats' }
                )
                .setRequired(false)
        ),

    async execute(interaction) {
        const section = interaction.options.getString('section');

        if (section) {
            await this.showSpecificSection(interaction, section);
        } else {
            await this.showMainHelp(interaction);
        }
    },

    async showMainHelp(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📚 GUIDE SYSTÈME DE GESTION RH')
            .setDescription('Système complet de gestion des ressources humaines via Discord')
            .setColor('#4B0082')
            .setTimestamp();

        // Vue d'ensemble
        embed.addFields({
            name: '🎯 Vue d\'ensemble',
            value: [
                '• **Prise de service** - Signaler début/fin de travail',
                '• **Absences justifiées** - Déclarer vos absences',
                '• **Monitoring temps réel** - Surveillance automatique FiveM',
                '• **Statistiques** - Suivi des performances',
                '• **Administration** - Gestion par les responsables'
            ].join('\n'),
            inline: false
        });

        // Commandes principales
        embed.addFields({
            name: '🎮 Commandes principales',
            value: [
                '`/service prendre [poste]` - Prendre le service',
                '`/service terminer` - Terminer le service',
                '`/service liste` - Voir qui est en service',
                '`/absence justifier [raison] [durée]` - Justifier absence',
                '`/monitoring start` - Démarrer surveillance FiveM'
            ].join('\n'),
            inline: false
        });

        // Structure du serveur
        embed.addFields({
            name: '🏗️ Structure du serveur',
            value: [
                '**👥 GESTION RH**',
                '• 🟢 prise-de-service',
                '• 🔴 fin-de-service',
                '• 📋 absences-justifiees',
                '',
                '**📊 MONITORING RH**',
                '• 🔍 monitoring-temps-reel',
                '• 📈 statistiques-presence',
                '• 📝 logs-rh'
            ].join('\n'),
            inline: true
        });

        embed.addFields({
            name: '👥 Rôles et permissions',
            value: [
                '**👑 Directeur RH**',
                '• Accès complet',
                '• Gestion des absences',
                '• Statistiques avancées',
                '',
                '**💼 Responsable RH**',
                '• Consultation monitoring',
                '• Validation absences',
                '',
                '**👤 Employé**',
                '• Prise de service',
                '• Déclaration absences'
            ].join('\n'),
            inline: true
        });

        // Boutons pour sections détaillées
        const buttons = [
            new ButtonBuilder()
                .setCustomId('help_service')
                .setLabel('🟢 Service')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('help_absences')
                .setLabel('📋 Absences')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('help_monitoring')
                .setLabel('🔍 Monitoring')
                .setStyle(ButtonStyle.Success)
        ];

        const buttons2 = [
            new ButtonBuilder()
                .setCustomId('help_admin')
                .setLabel('⚙️ Admin')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('help_stats')
                .setLabel('📊 Stats')
                .setStyle(ButtonStyle.Primary)
        ];

        const row1 = new ActionRowBuilder().addComponents(buttons);
        const row2 = new ActionRowBuilder().addComponents(buttons2);

        embed.setFooter({ 
            text: '💡 Cliquez sur les boutons pour des guides détaillés' 
        });

        await interaction.reply({ 
            embeds: [embed], 
            components: [row1, row2] 
        });
    },

    async showSpecificSection(interaction, section) {
        let embed;

        switch (section) {
            case 'service':
                embed = this.createServiceHelp();
                break;
            case 'absences':
                embed = this.createAbsencesHelp();
                break;
            case 'monitoring':
                embed = this.createMonitoringHelp();
                break;
            case 'admin':
                embed = this.createAdminHelp();
                break;
            case 'stats':
                embed = this.createStatsHelp();
                break;
            default:
                return this.showMainHelp(interaction);
        }

        await interaction.reply({ embeds: [embed] });
    },

    createServiceHelp() {
        return new EmbedBuilder()
            .setTitle('🟢 GUIDE PRISE DE SERVICE')
            .setDescription('Système de pointage et suivi du temps de travail')
            .setColor('#00FF00')
            .addFields(
                {
                    name: '🎯 Comment prendre le service',
                    value: [
                        '**Commande:** `/service prendre [poste]`',
                        '**Exemple:** `/service prendre Réception`',
                        '**Canal:** #prise-de-service ou bouton 🟢',
                        '',
                        '✅ **Enregistré automatiquement:**',
                        '• Heure de début',
                        '• Votre nom et rôle',
                        '• Poste de travail',
                        '• Notification dans les logs'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🔴 Comment terminer le service',
                    value: [
                        '**Commande:** `/service terminer`',
                        '**Canal:** #fin-de-service ou bouton 🔴',
                        '',
                        '📊 **Bilan automatique:**',
                        '• Durée totale calculée',
                        '• Évaluation de performance',
                        '• Historique mis à jour',
                        '• Statistiques personnelles'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📋 Autres commandes utiles',
                    value: [
                        '`/service status` - Votre statut actuel',
                        '`/service liste` - Qui est en service maintenant',
                        '`/service historique` - Vos sessions passées',
                        '`/service historique @utilisateur` - Historique d\'un autre (admin)'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💡 Bonnes pratiques',
                    value: [
                        '• Prenez le service dès votre arrivée',
                        '• Spécifiez votre poste de travail',
                        '• Terminez le service avant de partir',
                        '• Sessions minimum 10 minutes recommandées',
                        '• Consultez vos statistiques régulièrement'
                    ].join('\n'),
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({ text: '🟢 N\'oubliez pas de pointer !' });
    },

    createAbsencesHelp() {
        return new EmbedBuilder()
            .setTitle('📋 GUIDE ABSENCES JUSTIFIÉES')
            .setDescription('Système de déclaration et gestion des absences')
            .setColor('#FFA500')
            .addFields(
                {
                    name: '📝 Comment justifier une absence',
                    value: [
                        '**Commande:** `/absence justifier [raison] [durée] [détails]`',
                        '**Exemple:** `/absence justifier maladie 2jours Grippe saisonnière`',
                        '**Canal:** #absences-justifiees',
                        '',
                        '**Raisons disponibles:**',
                        '🤒 Maladie • 🏖️ Congés • 👨‍👩‍👧‍👦 Urgence familiale',
                        '📚 Formation • 🏥 RDV médical • 🚗 Transport • ❓ Autre'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⚙️ Processus de validation',
                    value: [
                        '1. **Déclaration** - Vous remplissez le formulaire',
                        '2. **Enregistrement** - ID unique généré automatiquement',
                        '3. **Notification** - Les admins sont prévenus',
                        '4. **Validation** - Acceptée/refusée par un responsable',
                        '5. **Confirmation** - Vous êtes notifié du résultat'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📊 Statuts des absences',
                    value: [
                        '⏳ **En attente** - Déclarée, pas encore validée',
                        '✅ **Acceptée** - Validée par un responsable',
                        '❌ **Refusée** - Non approuvée (raison fournie)'
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🔍 Consultation des absences',
                    value: [
                        '`/absence liste` - Vos absences',
                        '`/absence liste @user` - Absences d\'un autre (admin)',
                        '`/absence liste periode:semaine` - Filtrer par période'
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '⚠️ Important à savoir',
                    value: [
                        '• **Prévenez à l\'avance** quand c\'est possible',
                        '• **Gardez votre ID d\'absence** pour le suivi',
                        '• **Soyez précis** dans vos détails',
                        '• **Respectez les délais** de déclaration',
                        '• **Consultez régulièrement** le statut'
                    ].join('\n'),
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({ text: '📋 Transparence et communication avant tout !' });
    },

    createMonitoringHelp() {
        return new EmbedBuilder()
            .setTitle('🔍 GUIDE MONITORING TEMPS RÉEL')
            .setDescription('Surveillance automatique des connexions FiveM')
            .setColor('#0099FF')
            .addFields(
                {
                    name: '🎯 Qu\'est-ce que le monitoring ?',
                    value: [
                        'Le monitoring surveille automatiquement :',
                        '• **Qui se connecte** sur le serveur FiveM',
                        '• **Avec quel job** (vendeur, patron, etc.)',
                        '• **Combien de temps** ils restent connectés',
                        '• **Leur activité** en temps réel',
                        '• **Alertes automatiques** en cas de problème'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🚀 Commandes de monitoring',
                    value: [
                        '`/monitoring start` - Démarrer la surveillance',
                        '`/monitoring stop` - Arrêter la surveillance',
                        '`/monitoring status` - État du système',
                        '`/monitoring vendeurs` - Qui est connecté maintenant',
                        '`/monitoring activite` - Historique récent',
                        '`/monitoring dashboard` - Vue d\'ensemble complète'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📊 Informations surveillées',
                    value: [
                        '**Pour chaque connexion:**',
                        '• Nom du joueur',
                        '• Job et grade actuel',  
                        '• Heure de connexion',
                        '• Durée de la session',
                        '• Dernière activité',
                        '• Position sur la map (si disponible)'
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🚨 Alertes automatiques',
                    value: [
                        '🟢 **Connexion** - Vendeur arrive',
                        '🔴 **Déconnexion** - Vendeur part',
                        '⚠️ **Inactivité** - Plus de 5 minutes',
                        '📊 **Session courte** - Moins de 10 minutes',
                        '🔄 **Changement grade** - Promotion/rétrogradation'
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '⚙️ Configuration FiveM',
                    value: [
                        'Pour activer le monitoring complet :',
                        '1. **Installer** la resource sur votre serveur',
                        '2. **Ajouter** `ensure concessionnaire-monitoring`',
                        '3. **Redémarrer** le serveur FiveM',
                        '4. **Tester** avec `/monitoring start`',
                        '',
                        '📁 Resource fournie dans le dossier du bot'
                    ].join('\n'),
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({ text: '🔍 Surveillance 24/7 pour une gestion optimale !' });
    },

    createAdminHelp() {
        return new EmbedBuilder()
            .setTitle('⚙️ GUIDE ADMINISTRATION RH')
            .setDescription('Outils de gestion pour les responsables RH')
            .setColor('#FF0000')
            .addFields(
                {
                    name: '👑 Permissions administrateur',
                    value: [
                        '**Directeur RH :**',
                        '• Accès complet à tous les systèmes',
                        '• Gestion des absences (validation/refus)',
                        '• Consultation historiques complets',
                        '• Configuration du monitoring',
                        '• Statistiques avancées et exports',
                        '',
                        '**Responsable RH :**',
                        '• Consultation des données',
                        '• Validation des absences',
                        '• Accès au monitoring (lecture seule)'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🏗️ Configuration initiale',
                    value: [
                        '`/setup-rh auto` - Configuration automatique complète',
                        '`/setup-rh clean` - Nettoyer ancienne structure',
                        '`/setup-rh status` - Vérifier la configuration',
                        '',
                        '**Étapes recommandées :**',
                        '1. Nettoyer l\'ancien système',
                        '2. Configuration automatique',
                        '3. Assigner les rôles',
                        '4. Tester les fonctionnalités'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📋 Gestion des absences',
                    value: [
                        '`/absence liste` - Toutes les absences',
                        '`/absence liste @utilisateur` - Absences d\'une personne',
                        '`/absence supprimer [ID]` - Supprimer une absence',
                        '`/absence statistiques` - Analytics complètes',
                        '',
                        '**Workflow de validation :**',
                        '1. Notification automatique',
                        '2. Examen de la demande', 
                        '3. Décision (accepter/refuser)',
                        '4. Notification au demandeur'
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🔍 Supervision du personnel',
                    value: [
                        '`/service liste` - Personnel actuellement en service',
                        '`/service historique @user` - Historique d\'un employé',
                        '`/monitoring dashboard` - Vue d\'ensemble temps réel',
                        '`/monitoring vendeurs` - Surveillance FiveM',
                        '',
                        '**Indicateurs clés :**',
                        '• Temps de présence moyen',
                        '• Taux d\'assiduité',
                        '• Sessions courtes fréquentes',
                        '• Absences répétées'
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📊 Rapports et statistiques',
                    value: [
                        '`/absence statistiques` - Analytics absences',
                        '`/monitoring dashboard` - Surveillance temps réel',
                        '',
                        '**Types de rapports disponibles :**',
                        '• Répartition des absences par raison',
                        '• Top utilisateurs (absences/présence)',
                        '• Évolution temporelle',
                        '• Comparaisons période sur période',
                        '• Alertes et anomalies détectées'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🚨 Gestion des alertes',
                    value: [
                        '**Types d\'alertes automatiques :**',
                        '• Absence non justifiée détectée',
                        '• Session de travail anormalement courte',
                        '• Inactivité prolongée sur FiveM',
                        '• Accumulation d\'absences suspecte',
                        '',
                        '**Canaux d\'alerte :**',
                        '• #logs-rh - Tous les événements',
                        '• #commandes-admin - Alertes importantes',
                        '• Messages privés aux responsables'
                    ].join('\n'),
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({ text: '⚙️ Gestion RH professionnelle et automatisée !' });
    },

    createStatsHelp() {
        return new EmbedBuilder()
            .setTitle('📊 GUIDE STATISTIQUES RH')
            .setDescription('Analytics et reporting avancés')
            .setColor('#9B59B6')
            .addFields(
                {
                    name: '📈 Types de statistiques disponibles',
                    value: [
                        '**📋 Absences :**',
                        '• Répartition par raison (maladie, congés, etc.)',
                        '• Évolution temporelle des absences',
                        '• Top employés par nombre d\'absences',
                        '• Taux d\'acceptation/refus des demandes',
                        '• Comparaisons période sur période',
                        '',
                        '**⏱️ Présence :**',
                        '• Temps de travail total par employé',
                        '• Moyenne des sessions de travail',
                        '• Ponctualité et régularité',
                        '• Sessions courtes vs longues',
                        '• Heures d\'affluence et creuses'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🔍 Accès aux statistiques',
                    value: [
                        '**Pour les employés :**',
                        '• `/service status` - Statut personnel',
                        '• `/service historique` - Votre historique',
                        '• `/absence liste` - Vos absences',
                        '',
                        '**Pour les responsables :**',
                        '• `/absence statistiques` - Analytics absences',
                        '• `/monitoring dashboard` - Vue temps réel',
                        '• `/service historique @user` - N\'importe qui',
                        '• Accès aux canaux statistiques'
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📊 Indicateurs clés (KPI)',
                    value: [
                        '**Performance individuelle :**',
                        '• Taux de présence mensuel',
                        '• Durée moyenne des sessions',
                        '• Nombre d\'absences justifiées',
                        '• Ponctualité (heures d\'arrivée)',
                        '',
                        '**Performance d\'équipe :**',
                        '• Couverture des créneaux',
                        '• Personnel simultané moyen',
                        '• Pics et creux d\'activité',
                        '• Efficacité des remplacements'
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📅 Périodes d\'analyse',
                    value: [
                        '**Filtres temporels disponibles :**',
                        '• Aujourd\'hui - Vue instantanée',
                        '• Cette semaine - Tendances courtes',
                        '• Ce mois - Performances mensuelles', 
                        '• Toutes périodes - Historique complet',
                        '',
                        '**Comparaisons possibles :**',
                        '• Semaine vs semaine précédente',
                        '• Mois vs mois précédent',
                        '• Évolution sur plusieurs mois'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🎯 Utilisation optimale',
                    value: [
                        '**Pour les managers :**',
                        '1. **Consultez quotidiennement** le dashboard',
                        '2. **Analysez les tendances** hebdomadaires',
                        '3. **Identifiez les problèmes** récurrents',
                        '4. **Planifiez les ressources** selon les stats',
                        '5. **Communiquez** avec l\'équipe sur les résultats',
                        '',
                        '**Pour les employés :**',
                        '• Suivez vos propres performances',
                        '• Améliorez votre régularité',
                        '• Anticipez vos absences'
                    ].join('\n'),
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({ text: '📊 Des données pour des décisions éclairées !' });
    }
};
