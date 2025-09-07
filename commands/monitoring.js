const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits , MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('monitoring')
        .setDescription('Système de monitoring des vendeurs sur FiveM')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Démarrer le monitoring des vendeurs')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Arrêter le monitoring des vendeurs')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Voir l\'état du monitoring')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('vendeurs')
                .setDescription('Voir les vendeurs connectés')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('activite')
                .setDescription('Voir l\'activité récente des vendeurs')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('dashboard')
                .setDescription('Dashboard complet du monitoring')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const monitoring = interaction.client.playerMonitoring;

        if (!monitoring) {
            return interaction.reply({
                content: '❌ Le système de monitoring n\'est pas initialisé',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            switch (subcommand) {
                case 'start':
                    await this.handleStart(interaction, monitoring);
                    break;
                case 'stop':
                    await this.handleStop(interaction, monitoring);
                    break;
                case 'status':
                    await this.handleStatus(interaction, monitoring);
                    break;
                case 'vendeurs':
                    await this.handleVendeurs(interaction, monitoring);
                    break;
                case 'activite':
                    await this.handleActivite(interaction, monitoring);
                    break;
                case 'dashboard':
                    await this.handleDashboard(interaction, monitoring);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Sous-commande non reconnue',
                        flags: MessageFlags.Ephemeral
                    });
            }
        } catch (error) {
            console.error('Erreur commande monitoring:', error);
            
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Erreur lors de l\'exécution de la commande',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    },

    async handleStart(interaction, monitoring) {
        const result = await monitoring.startMonitoring();

        const embed = new EmbedBuilder()
            .setTitle(result.success ? '✅ Monitoring Démarré' : '❌ Erreur')
            .setDescription(result.message)
            .setColor(result.success ? '#00FF00' : '#FF0000')
            .setTimestamp();

        if (result.success) {
            embed.addFields(
                { name: '🔍 Intervalle', value: '30 secondes', inline: true },
                { name: '🏢 Job surveillé', value: 'concessionnaire', inline: true },
                { name: '⚠️ Seuil inactivité', value: '5 minutes', inline: true }
            );
        }

        await interaction.reply({ embeds: [embed] });
    },

    async handleStop(interaction, monitoring) {
        const result = monitoring.stopMonitoring();

        const embed = new EmbedBuilder()
            .setTitle(result.success ? '⏹️ Monitoring Arrêté' : '❌ Erreur')
            .setDescription(result.message)
            .setColor(result.success ? '#FFA500' : '#FF0000')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async handleStatus(interaction, monitoring) {
        const dashboard = monitoring.generateDashboard();

        const embed = new EmbedBuilder()
            .setTitle('📊 État du Monitoring')
            .setDescription(`Système ${dashboard.isMonitoring ? '🟢 **ACTIF**' : '🔴 **INACTIF**'}`)
            .addFields(
                { 
                    name: '👥 Vendeurs en ligne', 
                    value: `${dashboard.totalOnline} vendeur(s)`, 
                    inline: true 
                },
                { 
                    name: '📅 Dernière mise à jour', 
                    value: dashboard.lastUpdate, 
                    inline: true 
                },
                { 
                    name: '🚨 Alertes récentes', 
                    value: dashboard.alerts.length > 0 ? `${dashboard.alerts.length} alerte(s)` : 'Aucune', 
                    inline: true 
                }
            )
            .setColor(dashboard.isMonitoring ? '#00FF00' : '#FF0000')
            .setTimestamp();

        // Configuration actuelle
        embed.addFields({
            name: '⚙️ Configuration',
            value: [
                '• Intervalle: 30 secondes',
                '• Job: concessionnaire',
                '• Seuil inactivité: 5 minutes',
                '• Session minimum: 10 minutes'
            ].join('\n'),
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
    },

    async handleVendeurs(interaction, monitoring) {
        const onlineDealers = monitoring.getOnlineDealers();

        const embed = new EmbedBuilder()
            .setTitle('👥 Vendeurs Connectés')
            .setDescription(`${onlineDealers.length} vendeur(s) actuellement en ligne`)
            .setColor('#0099FF')
            .setTimestamp();

        if (onlineDealers.length === 0) {
            embed.setDescription('🚫 Aucun vendeur connecté actuellement');
            embed.setColor('#FF6B6B');
        } else {
            const vendeursList = onlineDealers.map((dealer, index) => {
                const sessionTime = this.formatDuration(Date.now() - dealer.firstSeen);
                const grade = dealer.job.label || 'Vendeur';
                
                return `**${index + 1}.** ${dealer.name}\n` +
                       `   └ 🏢 ${grade} • ⏱️ ${sessionTime}`;
            }).join('\n\n');

            embed.addFields({
                name: '📋 Liste des vendeurs',
                value: vendeursList.length > 1024 ? vendeursList.substring(0, 1020) + '...' : vendeursList,
                inline: false
            });

            // Statistiques
            const totalTime = onlineDealers.reduce((sum, dealer) => 
                sum + (Date.now() - dealer.firstSeen), 0
            );
            const avgTime = totalTime / onlineDealers.length;

            embed.addFields({
                name: '📊 Statistiques',
                value: [
                    `• Temps moyen: ${this.formatDuration(avgTime)}`,
                    `• Plus long: ${this.formatDuration(Math.max(...onlineDealers.map(d => Date.now() - d.firstSeen)))}`,
                    `• Dernière activité: maintenant`
                ].join('\n'),
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    },

    async handleActivite(interaction, monitoring) {
        const activities = monitoring.getRecentActivity(10);

        const embed = new EmbedBuilder()
            .setTitle('📈 Activité Récente')
            .setDescription('Les 10 dernières activités des vendeurs')
            .setColor('#00FF00')
            .setTimestamp();

        if (activities.length === 0) {
            embed.setDescription('🚫 Aucune activité récente');
            embed.setColor('#FF6B6B');
        } else {
            const activitiesList = activities.map((activity, index) => {
                const time = new Date(activity.timestamp).toLocaleTimeString('fr-FR');
                const icon = this.getActivityIcon(activity.type);
                
                let description = '';
                switch (activity.type) {
                    case 'dealer_connect':
                        description = `${activity.data.name} s'est connecté (${activity.data.job.label || 'Vendeur'})`;
                        break;
                    case 'dealer_disconnect':
                        const duration = this.formatDuration(activity.data.sessionDuration);
                        description = `${activity.data.name} s'est déconnecté (session: ${duration})`;
                        break;
                    case 'job_promotion':
                        description = `Promotion grade ${activity.data.oldGrade} → ${activity.data.newGrade}`;
                        break;
                    default:
                        description = activity.data.message || 'Activité inconnue';
                }

                return `${icon} **${time}** - ${description}`;
            }).join('\n');

            embed.addFields({
                name: '📋 Historique',
                value: activitiesList.length > 1024 ? activitiesList.substring(0, 1020) + '...' : activitiesList,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    },

    async handleDashboard(interaction, monitoring) {
        const dashboard = monitoring.generateDashboard();

        const embed = new EmbedBuilder()
            .setTitle('🎯 Dashboard Monitoring Complet')
            .setDescription(`Système ${dashboard.isMonitoring ? '🟢 **ACTIF**' : '🔴 **INACTIF**'}`)
            .setColor('#4B0082')
            .setTimestamp();

        // Section vendeurs
        embed.addFields({
            name: '👥 Vendeurs Connectés',
            value: dashboard.totalOnline > 0 
                ? dashboard.onlineDealers.map(d => 
                    `• ${d.name} (${d.job.label || 'Vendeur'}) - ${this.formatDuration(Date.now() - d.firstSeen)}`
                  ).slice(0, 5).join('\n') + (dashboard.onlineDealers.length > 5 ? '\n...' : '')
                : '🚫 Aucun vendeur connecté',
            inline: false
        });

        // Section activité récente
        if (dashboard.recentActivity.length > 0) {
            const recentList = dashboard.recentActivity.slice(0, 3).map(activity => {
                const time = new Date(activity.timestamp).toLocaleTimeString('fr-FR');
                const icon = this.getActivityIcon(activity.type);
                
                let desc = '';
                if (activity.type === 'dealer_connect') {
                    desc = `${activity.data.name} connecté`;
                } else if (activity.type === 'dealer_disconnect') {
                    desc = `${activity.data.name} déconnecté`;
                }
                
                return `${icon} ${time} - ${desc}`;
            }).join('\n');

            embed.addFields({
                name: '📈 Activité Récente',
                value: recentList,
                inline: false
            });
        }

        // Section alertes
        if (dashboard.alerts.length > 0) {
            const alertsList = dashboard.alerts.slice(0, 3).map(alert => {
                const time = new Date(alert.timestamp).toLocaleTimeString('fr-FR');
                const icon = alert.level === 'error' ? '🔴' : alert.level === 'warning' ? '🟡' : '🔵';
                
                return `${icon} ${time} - ${alert.title}`;
            }).join('\n');

            embed.addFields({
                name: '🚨 Alertes Récentes',
                value: alertsList,
                inline: false
            });
        }

        // Footer avec info
        embed.setFooter({ 
            text: `Dernière mise à jour: ${dashboard.lastUpdate}` 
        });

        await interaction.reply({ embeds: [embed] });
    },

    getActivityIcon(type) {
        switch (type) {
            case 'dealer_connect': return '🟢';
            case 'dealer_disconnect': return '🔴';
            case 'job_promotion': return '⬆️';
            case 'inactivity': return '😴';
            default: return '📋';
        }
    },

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${seconds}s`;
        }
    }
};
