const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const RHServerSetup = require('../utils/rhServerSetup');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-rh')
        .setDescription('Configuration automatique du serveur pour la gestion RH')
        .addSubcommand(subcommand =>
            subcommand
                .setName('auto')
                .setDescription('Configuration automatique complète du serveur RH')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clean')
                .setDescription('Nettoyer l\'ancienne structure concessionnaire')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Vérifier l\'état de la configuration RH')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'auto':
                    await this.handleAutoSetup(interaction);
                    break;
                case 'clean':
                    await this.handleClean(interaction);
                    break;
                case 'status':
                    await this.handleStatus(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Sous-commande non reconnue',
                        flags: [4096] // EPHEMERAL flag
                    });
            }
        } catch (error) {
            console.error('Erreur setup-rh:', error);
            
            // Vérifier si l'interaction est encore valide
            if (error.code === 10062 || error.code === 40060) {
                console.log('⏰ Interaction setup-rh expirée ou déjà traitée, ignorée');
                return;
            }
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Erreur lors de l\'exécution de la commande',
                        flags: [4096] // EPHEMERAL flag
                    });
                }
            } catch (replyError) {
                console.log('⚠️ Impossible de répondre à l\'interaction setup-rh:', replyError.message);
            }
        }
    },

    async handleAutoSetup(interaction) {
        await interaction.deferReply();

        const guild = interaction.guild;
        if (!guild) {
            return interaction.editReply('❌ Cette commande doit être utilisée dans un serveur');
        }

        const rhSetup = new RHServerSetup(interaction.client);
        const result = await rhSetup.setupRHServer(guild);

        const embed = new EmbedBuilder()
            .setTitle(result.success ? '✅ Configuration RH Terminée' : '❌ Erreur de Configuration')
            .setDescription(result.message)
            .setColor(result.success ? '#00FF00' : '#FF0000')
            .setTimestamp();

        if (result.success) {
            embed.addFields(
                { 
                    name: '👥 Structure RH créée', 
                    value: [
                        '• 🟢 Canal prise de service',
                        '• 🔴 Canal fin de service', 
                        '• 📋 Canal absences justifiées',
                        '• 🔍 Monitoring temps réel',
                        '• 📈 Statistiques de présence',
                        '• 🔧 Administration RH'
                    ].join('\n'),
                    inline: true 
                },
                { 
                    name: '🎭 Rôles créés', 
                    value: [
                        '• 👑 Directeur RH',
                        '• 💼 Responsable RH', 
                        '• 👤 Employé',
                        '• 🤖 Bot RH'
                    ].join('\n'),
                    inline: true 
                },
                { 
                    name: '🎯 Prochaines étapes', 
                    value: [
                        '1. Assignez les rôles à votre équipe',
                        '2. Testez `/service prendre`',
                        '3. Activez `/monitoring start`',
                        '4. Consultez `/aide-rh`'
                    ].join('\n'),
                    inline: false 
                }
            );

            // Footer avec informations importantes
            embed.setFooter({ 
                text: '🎉 Votre serveur RH est prêt ! Utilisez /aide-rh pour commencer.' 
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleClean(interaction) {
        await interaction.deferReply();

        const guild = interaction.guild;
        if (!guild) {
            return interaction.editReply('❌ Cette commande doit être utilisée dans un serveur');
        }

        const rhSetup = new RHServerSetup(interaction.client);
        
        try {
            await rhSetup.cleanExistingChannels(guild);

            const embed = new EmbedBuilder()
                .setTitle('🧹 Nettoyage Terminé')
                .setDescription('Ancienne structure concessionnaire supprimée avec succès')
                .addFields(
                    { 
                        name: '🗑️ Éléments supprimés', 
                        value: [
                            '• Canaux concessionnaire',
                            '• Catégories de vente',
                            '• Anciens rôles',
                            '• Messages obsolètes'
                        ].join('\n'),
                        inline: false 
                    },
                    { 
                        name: '➡️ Prochaine étape', 
                        value: 'Utilisez `/setup-rh auto` pour créer la nouvelle structure RH',
                        inline: false 
                    }
                )
                .setColor('#FFA500')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Erreur de Nettoyage')
                .setDescription(`Erreur: ${error.message}`)
                .setColor('#FF0000')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    },

    async handleStatus(interaction) {
        const guild = interaction.guild;
        if (!guild) {
            return interaction.reply({ 
                content: '❌ Cette commande doit être utilisée dans un serveur',
                flags: [4096] // EPHEMERAL flag
            });
        }

        // Vérifier l'existence des canaux RH
        const rhChannels = {
            priseService: guild.channels.cache.find(c => c.name.includes('prise-de-service')),
            finService: guild.channels.cache.find(c => c.name.includes('fin-de-service')),
            absences: guild.channels.cache.find(c => c.name.includes('absences-justifiees')),
            monitoring: guild.channels.cache.find(c => c.name.includes('monitoring-temps-reel')),
            statistiques: guild.channels.cache.find(c => c.name.includes('statistiques-presence'))
        };

        // Vérifier l'existence des rôles RH
        const rhRoles = {
            directeur: guild.roles.cache.find(r => r.name.includes('Directeur RH')),
            responsable: guild.roles.cache.find(r => r.name.includes('Responsable RH')),
            employe: guild.roles.cache.find(r => r.name.includes('Employé')),
            bot: guild.roles.cache.find(r => r.name.includes('Bot RH'))
        };

        const channelsCount = Object.values(rhChannels).filter(c => c).length;
        const rolesCount = Object.values(rhRoles).filter(r => r).length;
        const isConfigured = channelsCount >= 4 && rolesCount >= 3;

        const embed = new EmbedBuilder()
            .setTitle('📊 État de la Configuration RH')
            .setDescription(isConfigured ? 
                '✅ **Serveur RH correctement configuré**' : 
                '⚠️ **Configuration RH incomplète**'
            )
            .setColor(isConfigured ? '#00FF00' : '#FFA500')
            .setTimestamp();

        // Status des canaux
        const channelsStatus = Object.entries(rhChannels).map(([name, channel]) => {
            const icon = channel ? '✅' : '❌';
            const channelName = {
                priseService: 'Prise de service',
                finService: 'Fin de service',
                absences: 'Absences justifiées',
                monitoring: 'Monitoring temps réel',
                statistiques: 'Statistiques présence'
            }[name];
            
            return `${icon} ${channelName}`;
        }).join('\n');

        // Status des rôles
        const rolesStatus = Object.entries(rhRoles).map(([name, role]) => {
            const icon = role ? '✅' : '❌';
            const roleName = {
                directeur: 'Directeur RH',
                responsable: 'Responsable RH', 
                employe: 'Employé',
                bot: 'Bot RH'
            }[name];
            
            return `${icon} ${roleName}`;
        }).join('\n');

        embed.addFields(
            { 
                name: '📋 Canaux RH', 
                value: channelsStatus, 
                inline: true 
            },
            { 
                name: '🎭 Rôles RH', 
                value: rolesStatus, 
                inline: true 
            }
        );

        if (!isConfigured) {
            embed.addFields({
                name: '🔧 Action recommandée',
                value: 'Utilisez `/setup-rh auto` pour configurer automatiquement',
                inline: false
            });
        } else {
            embed.addFields({
                name: '🎯 Commandes disponibles',
                value: [
                    '• `/service prendre` - Prendre le service',
                    '• `/service terminer` - Terminer le service',
                    '• `/absence justifier` - Justifier absence',
                    '• `/monitoring start` - Démarrer surveillance'
                ].join('\n'),
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    }
};
