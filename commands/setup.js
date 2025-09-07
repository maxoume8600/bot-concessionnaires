const { SlashCommandBuilder, PermissionFlagsBits , MessageFlags } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const ServerSetup = require('../utils/serverSetup');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configuration automatique du serveur Discord pour le concessionnaire')
        .addSubcommand(subcommand =>
            subcommand
                .setName('init')
                .setDescription('Initialiser le serveur avec tous les canaux et rôles nécessaires'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Voir l\'état de la configuration du serveur'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('repair')
                .setDescription('Réparer les permissions et canaux manquants'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'init':
                await this.initServer(interaction);
                break;
            case 'status':
                await this.showStatus(interaction);
                break;
            case 'repair':
                await this.repairServer(interaction);
                break;
        }
    },

    async initServer(interaction) {
        await interaction.deferReply();

        try {
            const guild = interaction.guild;
            const setupManager = new ServerSetup(interaction.client);

            const setupEmbed = EmbedUtils.createInfoEmbed(
                'Configuration en cours...',
                '🏗️ Création des rôles et canaux pour le concessionnaire\n' +
                '⏳ Cette opération peut prendre quelques minutes...'
            );

            await interaction.editReply({ embeds: [setupEmbed] });

            // Lancer la configuration
            const result = await setupManager.setupServer(guild);

            if (result.success) {
                const successEmbed = EmbedUtils.createSuccessEmbed(
                    '🎉 Serveur configuré avec succès !',
                    `**${process.env.SERVER_NAME || guild.name}** est maintenant prêt pour le concessionnaire !\n\n` +
                    `**📊 Résumé de la configuration :**\n` +
                    `👥 **${result.roles.size}** rôles créés\n` +
                    `📁 **${result.channels.size}** canaux créés\n` +
                    `🔧 Permissions configurées\n` +
                    `📝 Fichier .env mis à jour\n\n` +
                    `**🚀 Prochaines étapes :**\n` +
                    `1️⃣ Assignez les rôles aux membres de votre équipe\n` +
                    `2️⃣ Utilisez \`/catalogue\` dans #📋catalogue-vehicules\n` +
                    `3️⃣ Configurez la synchronisation FiveM avec \`/sync\`\n\n` +
                    `*Le concessionnaire est maintenant opérationnel !* 🚗`
                );

                await interaction.editReply({ embeds: [successEmbed] });

                // Envoyer un message de test dans le canal catalogue
                const catalogueChannel = setupManager.createdChannels.get('CATALOGUE');
                if (catalogueChannel) {
                    setTimeout(async () => {
                        try {
                            const testEmbed = EmbedUtils.createInfoEmbed(
                                '🤖 Test du système',
                                'Configuration terminée ! Le bot est maintenant opérationnel.\n\n' +
                                'Tapez `/catalogue` pour voir les véhicules disponibles ! 🚗'
                            );
                            await catalogueChannel.send({ embeds: [testEmbed] });
                        } catch (error) {
                            console.error('Erreur envoi message test:', error);
                        }
                    }, 2000);
                }

            } else {
                throw new Error('Configuration échouée');
            }

        } catch (error) {
            console.error('Erreur configuration serveur:', error);
            
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Erreur de configuration',
                `Une erreur s'est produite lors de la configuration :\n\`${error.message}\`\n\n` +
                `**Solutions possibles :**\n` +
                `• Vérifiez que le bot a les permissions Administrateur\n` +
                `• Réessayez avec \`/setup repair\`\n` +
                `• Contactez le support si le problème persiste`
            );

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },

    async showStatus(interaction) {
        const guild = interaction.guild;
        const setupManager = new ServerSetup(interaction.client);
        
        // Vérifier l'état actuel
        const existingChannels = [];
        const existingRoles = [];
        const missingChannels = [];
        const missingRoles = [];

        // Canaux attendus
        const expectedChannels = [
            { name: 'catalogue-vehicules', key: 'CATALOGUE' },
            { name: 'ventes-vehicules', key: 'VENTES' },
            { name: 'gestion-stock', key: 'STOCK' },
            { name: 'statistiques-ventes', key: 'STATS' },
            { name: 'commandes-admin', key: 'ADMIN' },
            { name: 'logs-systeme', key: 'LOGS' },
            { name: 'aide-concessionnaire', key: 'HELP' },
            { name: 'annonces-importantes', key: 'ANNONCES' }
        ];

        // Rôles attendus
        const expectedRoles = [
            { name: 'Patron Concessionnaire', key: 'PATRON' },
            { name: 'Vendeur Auto', key: 'VENDEUR' },
            { name: 'Client Concessionnaire', key: 'CLIENT' },
            { name: 'Bot Concessionnaire', key: 'BOT' }
        ];

        // Vérifier les canaux
        for (const expected of expectedChannels) {
            const channel = guild.channels.cache.find(c => c.name.includes(expected.name.split('-')[1]));
            if (channel) {
                existingChannels.push(`✅ #${channel.name}`);
            } else {
                missingChannels.push(`❌ #${expected.name}`);
            }
        }

        // Vérifier les rôles
        for (const expected of expectedRoles) {
            const role = guild.roles.cache.find(r => r.name.includes(expected.name.split(' ')[1]));
            if (role) {
                existingRoles.push(`✅ @${role.name}`);
            } else {
                missingRoles.push(`❌ @${expected.name}`);
            }
        }

        const statusEmbed = EmbedUtils.createInfoEmbed(
            `📊 État de la configuration - ${guild.name}`,
            `**📁 Canaux (${existingChannels.length}/${expectedChannels.length})**\n` +
            `${existingChannels.join('\n') || 'Aucun canal trouvé'}\n` +
            `${missingChannels.length > 0 ? `\n${missingChannels.join('\n')}` : ''}\n\n` +
            `**👥 Rôles (${existingRoles.length}/${expectedRoles.length})**\n` +
            `${existingRoles.join('\n') || 'Aucun rôle trouvé'}\n` +
            `${missingRoles.length > 0 ? `\n${missingRoles.join('\n')}` : ''}\n\n` +
            `**🔧 Actions recommandées :**\n` +
            `${missingChannels.length > 0 || missingRoles.length > 0 ? 
                '• Utilisez `/setup init` pour créer les éléments manquants\n' +
                '• Ou `/setup repair` pour réparer la configuration'
                : '• Configuration complète ! Utilisez `/catalogue` pour tester'
            }`
        );

        await interaction.reply({ embeds: [statusEmbed], flags: MessageFlags.Ephemeral });
    },

    async repairServer(interaction) {
        await interaction.deferReply();

        try {
            const guild = interaction.guild;
            const setupManager = new ServerSetup(interaction.client);

            const repairEmbed = EmbedUtils.createInfoEmbed(
                'Réparation en cours...',
                '🔧 Vérification et réparation de la configuration\n' +
                '⏳ Patientez pendant la réparation...'
            );

            await interaction.editReply({ embeds: [repairEmbed] });

            // Lancer la réparation (même processus que l'init)
            const result = await setupManager.setupServer(guild);

            const successEmbed = EmbedUtils.createSuccessEmbed(
                '🔧 Réparation terminée !',
                `La configuration du serveur a été vérifiée et réparée.\n\n` +
                `**📊 Résultats :**\n` +
                `📁 **${result.channels.size}** canaux vérifiés/créés\n` +
                `👥 **${result.roles.size}** rôles vérifiés/créés\n` +
                `🔒 Permissions mises à jour\n` +
                `📝 Fichier .env synchronisé\n\n` +
                `*Le concessionnaire fonctionne maintenant correctement !*`
            );

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Erreur réparation serveur:', error);
            
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Erreur de réparation',
                `Impossible de réparer la configuration :\n\`${error.message}\`\n\n` +
                `Vérifiez les permissions du bot et réessayez.`
            );

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
