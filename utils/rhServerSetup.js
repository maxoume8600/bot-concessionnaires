const { EmbedBuilder, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

class RHServerSetup {
    constructor(client) {
        this.client = client;
    }

    async setupRHServer(guild) {
        try {
            console.log('🏢 Démarrage de la configuration RH du serveur...');

            // Supprimer toutes les catégories et canaux existants liés au concessionnaire
            await this.cleanExistingChannels(guild);

            // Créer la nouvelle structure RH
            const structure = await this.createRHStructure(guild);

            // Créer les rôles RH
            const roles = await this.createRHRoles(guild);

            // Configurer les permissions
            await this.setupRHPermissions(guild, structure, roles);

            // Envoyer les messages de bienvenue
            await this.sendWelcomeMessages(structure);

            return {
                success: true,
                message: 'Serveur RH configuré avec succès !',
                structure,
                roles
            };

        } catch (error) {
            console.error('❌ Erreur configuration RH:', error);
            return {
                success: false,
                message: `Erreur lors de la configuration: ${error.message}`
            };
        }
    }

    async cleanExistingChannels(guild) {
        console.log('🧹 Suppression de l\'ancienne structure concessionnaire...');

        // Noms des canaux à supprimer
        const channelsToDelete = [
            'catalogue-vehicules',
            'ventes-vehicules', 
            'gestion-stock',
            'statistiques-ventes',
            'commandes-admin',
            'aide-concessionnaire',
            'annonces-importantes'
        ];

        // Noms des catégories à supprimer
        const categoriesToDelete = [
            'CONCESSIONNAIRE',
            'GESTION',
            'SUPPORT'
        ];

        // Supprimer les canaux
        for (const channelName of channelsToDelete) {
            const channel = guild.channels.cache.find(c => 
                c.name.toLowerCase().includes(channelName.toLowerCase())
            );
            if (channel) {
                try {
                    await channel.delete();
                    console.log(`✅ Canal supprimé: ${channelName}`);
                } catch (error) {
                    console.log(`⚠️ Impossible de supprimer: ${channelName}`);
                }
            }
        }

        // Supprimer les catégories
        for (const categoryName of categoriesToDelete) {
            const category = guild.channels.cache.find(c => 
                c.type === ChannelType.GuildCategory && 
                c.name.toUpperCase().includes(categoryName.toUpperCase())
            );
            if (category) {
                try {
                    await category.delete();
                    console.log(`✅ Catégorie supprimée: ${categoryName}`);
                } catch (error) {
                    console.log(`⚠️ Impossible de supprimer: ${categoryName}`);
                }
            }
        }

        console.log('🧹 Nettoyage terminé !');
    }

    async createRHStructure(guild) {
        console.log('🏗️ Création de la structure RH...');

        const structure = {};

        // === CATÉGORIE GESTION RH ===
        structure.categoryRH = await guild.channels.create({
            name: '👥 GESTION RH',
            type: ChannelType.GuildCategory,
            position: 0
        });

        // Canal prise de service
        structure.priseService = await guild.channels.create({
            name: '🟢 prise-de-service',
            type: ChannelType.GuildText,
            parent: structure.categoryRH,
            topic: 'Canal pour signaler votre prise de service'
        });

        // Canal fin de service
        structure.finService = await guild.channels.create({
            name: '🔴 fin-de-service',
            type: ChannelType.GuildText,
            parent: structure.categoryRH,
            topic: 'Canal pour signaler votre fin de service'
        });

        // Canal absences justifiées
        structure.absences = await guild.channels.create({
            name: '📋 absences-justifiees',
            type: ChannelType.GuildText,
            parent: structure.categoryRH,
            topic: 'Canal pour justifier vos absences'
        });

        // === CATÉGORIE MONITORING ===
        structure.categoryMonitoring = await guild.channels.create({
            name: '📊 MONITORING RH',
            type: ChannelType.GuildCategory,
            position: 1
        });

        // Canal monitoring temps réel
        structure.monitoring = await guild.channels.create({
            name: '🔍 monitoring-temps-reel',
            type: ChannelType.GuildText,
            parent: structure.categoryMonitoring,
            topic: 'Surveillance automatique des connexions FiveM'
        });

        // Canal statistiques RH
        structure.statistiques = await guild.channels.create({
            name: '📈 statistiques-presence',
            type: ChannelType.GuildText,
            parent: structure.categoryMonitoring,
            topic: 'Statistiques de présence et performances'
        });

        // Canal logs système
        structure.logs = await guild.channels.create({
            name: '📝 logs-rh',
            type: ChannelType.GuildText,
            parent: structure.categoryMonitoring,
            topic: 'Logs automatiques du système RH'
        });

        // === CATÉGORIE ADMINISTRATION ===
        structure.categoryAdmin = await guild.channels.create({
            name: '⚙️ ADMINISTRATION',
            type: ChannelType.GuildCategory,
            position: 2
        });

        // Canal commandes admin
        structure.admin = await guild.channels.create({
            name: '🔧 commandes-admin',
            type: ChannelType.GuildText,
            parent: structure.categoryAdmin,
            topic: 'Commandes de gestion RH (Admin uniquement)'
        });

        // Canal annonces RH
        structure.annonces = await guild.channels.create({
            name: '📢 annonces-rh',
            type: ChannelType.GuildText,
            parent: structure.categoryAdmin,
            topic: 'Annonces importantes RH'
        });

        console.log('✅ Structure RH créée !');
        return structure;
    }

    async createRHRoles(guild) {
        console.log('👥 Création des rôles RH...');

        const roles = {};

        // Supprimer les anciens rôles concessionnaire
        const oldRoles = [
            'Patron Concessionnaire',
            'Vendeur Auto',
            'Client Concessionnaire',
            'Bot Concessionnaire'
        ];

        for (const roleName of oldRoles) {
            const oldRole = guild.roles.cache.find(r => r.name === roleName);
            if (oldRole && oldRole.name !== '@everyone') {
                try {
                    await oldRole.delete();
                    console.log(`✅ Ancien rôle supprimé: ${roleName}`);
                } catch (error) {
                    console.log(`⚠️ Impossible de supprimer: ${roleName}`);
                }
            }
        }

        // Créer les nouveaux rôles RH
        roles.directeurRH = await guild.roles.create({
            name: '👑 Directeur RH',
            color: 0xFF0000, // Utiliser la notation hexadécimale numérique
            permissions: [
                PermissionFlagsBits.Administrator,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageRoles,
                PermissionFlagsBits.ManageMessages
            ],
            hoist: true,
            mentionable: true
        });

        roles.responsableRH = await guild.roles.create({
            name: '💼 Responsable RH',
            color: 0xFFA500, // Utiliser la notation hexadécimale numérique
            permissions: [
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
            ],
            hoist: true,
            mentionable: true
        });

        roles.employe = await guild.roles.create({
            name: '👤 Employé',
            color: 0x00FF00, // Utiliser la notation hexadécimale numérique
            permissions: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
            ],
            hoist: true,
            mentionable: true
        });

        roles.botRH = await guild.roles.create({
            name: '🤖 Bot RH',
            color: 0x0099FF, // Utiliser la notation hexadécimale numérique
            permissions: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.UseExternalEmojis
            ],
            hoist: false,
            mentionable: false
        });

        // Assigner le rôle bot
        const botMember = guild.members.cache.get(this.client.user.id);
        if (botMember) {
            await botMember.roles.add(roles.botRH);
        }

        console.log('✅ Rôles RH créés !');
        return roles;
    }

    async setupRHPermissions(guild, structure, roles) {
        console.log('🔒 Configuration des permissions RH...');

        // Permissions pour la catégorie GESTION RH
        await structure.categoryRH.permissionOverwrites.create(guild.roles.everyone, {
            ViewChannel: false
        });

        await structure.categoryRH.permissionOverwrites.create(roles.employe, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });

        await structure.categoryRH.permissionOverwrites.create(roles.responsableRH, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true
        });

        await structure.categoryRH.permissionOverwrites.create(roles.directeurRH, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true,
            ManageChannels: true
        });

        // Permissions pour la catégorie MONITORING (Admin uniquement)
        await structure.categoryMonitoring.permissionOverwrites.create(guild.roles.everyone, {
            ViewChannel: false
        });

        await structure.categoryMonitoring.permissionOverwrites.create(roles.responsableRH, {
            ViewChannel: true,
            SendMessages: false,
            ReadMessageHistory: true
        });

        await structure.categoryMonitoring.permissionOverwrites.create(roles.directeurRH, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });

        // Permissions pour la catégorie ADMINISTRATION (Admin uniquement)
        await structure.categoryAdmin.permissionOverwrites.create(guild.roles.everyone, {
            ViewChannel: false
        });

        await structure.categoryAdmin.permissionOverwrites.create(roles.directeurRH, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true
        });

        // Bot permissions partout
        await structure.categoryRH.permissionOverwrites.create(roles.botRH, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true,
            EmbedLinks: true
        });

        await structure.categoryMonitoring.permissionOverwrites.create(roles.botRH, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true,
            EmbedLinks: true
        });

        await structure.categoryAdmin.permissionOverwrites.create(roles.botRH, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true,
            EmbedLinks: true
        });

        console.log('✅ Permissions RH configurées !');
    }

    async sendWelcomeMessages(structure) {
        console.log('📬 Envoi des messages de bienvenue...');

        // Message prise de service
        const priseServiceEmbed = new EmbedBuilder()
            .setTitle('🟢 PRISE DE SERVICE')
            .setDescription('Utilisez ce canal pour signaler votre **prise de service**.')
            .addFields(
                { 
                    name: '📋 Comment faire ?', 
                    value: 'Utilisez la commande `/service prendre` ou cliquez sur le bouton ci-dessous',
                    inline: false 
                },
                { 
                    name: '⏰ Informations enregistrées', 
                    value: '• Heure de prise de service\n• Votre nom et rôle\n• Date automatique',
                    inline: false 
                }
            )
            .setColor('#00FF00')
            .setTimestamp();

        const priseButton = new ButtonBuilder()
            .setCustomId('prise_service')
            .setLabel('🟢 Prendre le service')
            .setStyle(ButtonStyle.Success);

        const priseRow = new ActionRowBuilder().addComponents(priseButton);

        await structure.priseService.send({ 
            embeds: [priseServiceEmbed], 
            components: [priseRow] 
        });

        // Message fin de service
        const finServiceEmbed = new EmbedBuilder()
            .setTitle('🔴 FIN DE SERVICE')
            .setDescription('Utilisez ce canal pour signaler votre **fin de service**.')
            .addFields(
                { 
                    name: '📋 Comment faire ?', 
                    value: 'Utilisez la commande `/service terminer` ou cliquez sur le bouton ci-dessous',
                    inline: false 
                },
                { 
                    name: '📊 Bilan automatique', 
                    value: '• Durée totale de service\n• Heures effectives\n• Statistiques mises à jour',
                    inline: false 
                }
            )
            .setColor('#FF0000')
            .setTimestamp();

        const finButton = new ButtonBuilder()
            .setCustomId('fin_service')
            .setLabel('🔴 Terminer le service')
            .setStyle(ButtonStyle.Danger);

        const finRow = new ActionRowBuilder().addComponents(finButton);

        await structure.finService.send({ 
            embeds: [finServiceEmbed], 
            components: [finRow] 
        });

        // Message absences
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

        const absenceButton = new ButtonBuilder()
            .setCustomId('absence_justifiee')
            .setLabel('📋 Déclarer une absence')
            .setStyle(ButtonStyle.Secondary);

        const absenceRow = new ActionRowBuilder().addComponents(absenceButton);

        await structure.absences.send({ 
            embeds: [absencesEmbed], 
            components: [absenceRow] 
        });

        // Message monitoring
        const monitoringEmbed = new EmbedBuilder()
            .setTitle('🔍 MONITORING TEMPS RÉEL')
            .setDescription('Surveillance automatique des connexions FiveM')
            .addFields(
                { 
                    name: '📊 Fonctionnalités', 
                    value: '• Détection connexions/déconnexions\n• Calcul temps de présence\n• Alertes automatiques\n• Statistiques en temps réel',
                    inline: false 
                }
            )
            .setColor('#0099FF')
            .setTimestamp();

        await structure.monitoring.send({ embeds: [monitoringEmbed] });

        console.log('✅ Messages de bienvenue envoyés !');
    }
}

module.exports = RHServerSetup;
