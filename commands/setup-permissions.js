const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-permissions')
        .setDescription('🔒 Configure automatiquement les permissions des rôles pour tous les canaux')
        .addBooleanOption(option =>
            option.setName('force')
                .setDescription('Force la reconfiguration même si déjà configuré')
                .setRequired(false)
        ),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Vous devez être administrateur pour utiliser cette commande.',
                flags: [4096] // EPHEMERAL
            });
        }

        await interaction.deferReply();

        try {
            const force = interaction.options.getBoolean('force') || false;
            const guild = interaction.guild;
            
            // Structure des permissions par type de canal
            const channelPermissions = {
                // Canaux publics - Tout le monde peut voir
                public: [
                    'général', 'general', 'bienvenue', 'welcome', 'règles', 'rules', 'annonces', 'announcements'
                ],
                
                // Canaux RH - Tout le monde peut voir, direction peut écrire
                rh: [
                    'logs-rs', 'statistique-presence', 'absences-justifiees', 'gestion-rh'
                ],
                
                // Canaux Service - Tout le monde peut voir et interagir (pour prendre service)
                service: [
                    'prise-service', 'service', 'pointage', 'présence', 'presence'
                ],
                
                // Canaux Vendeurs - Patron, Vendeur et Bot
                vendeur: [
                    'catalogue', 'stock-vehicules', 'ventes', 'support-vendeur'
                ],
                
                // Canaux Clients - Tout le monde sauf @everyone en écriture
                client: [
                    'demandes-client', 'support-client', 'réclamations', 'reclamations'
                ],
                
                // Canaux Logs - Seulement Bot et Patron
                logs: [
                    'logs', 'monitoring', 'erreurs', 'debug'
                ]
            };

            // Obtenir les rôles EXISTANTS du serveur
            const roles = this.detectExistingRoles(guild);
            
            console.log('🔍 Rôles détectés sur le serveur:', roles);

            const embed = new EmbedBuilder()
                .setTitle('🔒 Configuration des Permissions')
                .setDescription('Configuration automatique des permissions avec les rôles existants...')
                .setColor('#3498DB')
                .setTimestamp();

            let configurationsCount = 0;
            let errorsCount = 0;
            const results = [];

            // Parcourir tous les canaux
            for (const [channelId, channel] of guild.channels.cache) {
                if (!channel.isTextBased()) continue;

                const channelName = channel.name.toLowerCase();
                let permissionType = 'default';
                
                // Déterminer le type de permission basé sur le nom du canal
                for (const [type, keywords] of Object.entries(channelPermissions)) {
                    if (keywords.some(keyword => channelName.includes(keyword))) {
                        permissionType = type;
                        break;
                    }
                }

                try {
                    await this.configureChannelPermissions(channel, roles, permissionType);
                    configurationsCount++;
                    results.push(`✅ ${channel.name} - ${permissionType}`);
                } catch (error) {
                    errorsCount++;
                    results.push(`❌ ${channel.name} - Erreur: ${error.message}`);
                    console.error(`Erreur permission ${channel.name}:`, error);
                }
            }

            // Créer les canaux manquants si nécessaire
            const requiredChannels = [
                { name: 'logs-rs', category: 'RH', type: 'rh' },
                { name: 'statistique-presence', category: 'RH', type: 'rh' },
                { name: 'catalogue', category: 'VENTE', type: 'vendeur' },
                { name: 'stock-vehicules', category: 'VENTE', type: 'vendeur' }
            ];

            for (const channelInfo of requiredChannels) {
                const exists = guild.channels.cache.find(c => c.name === channelInfo.name);
                if (!exists) {
                    try {
                        const newChannel = await this.createChannelWithPermissions(guild, channelInfo, roles);
                        configurationsCount++;
                        results.push(`🆕 ${newChannel.name} - Créé avec permissions ${channelInfo.type}`);
                    } catch (error) {
                        errorsCount++;
                        results.push(`❌ Création ${channelInfo.name} - Erreur: ${error.message}`);
                    }
                }
            }

            embed.addFields(
                { name: '📊 Résumé', value: `✅ **${configurationsCount}** canaux configurés\n❌ **${errorsCount}** erreurs`, inline: false },
                { name: '🔧 Rôles détectés', value: this.formatRolesStatus(roles), inline: false }
            );

            if (results.length > 0) {
                // Limiter l'affichage pour éviter la limite Discord
                const displayResults = results.slice(0, 20);
                if (results.length > 20) {
                    displayResults.push(`... et ${results.length - 20} autres canaux`);
                }
                embed.addFields({ name: '📝 Détails', value: displayResults.join('\n'), inline: false });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur setup permissions:', error);
            await interaction.editReply({ 
                content: '❌ Erreur lors de la configuration des permissions: ' + error.message 
            });
        }
    },

    async configureChannelPermissions(channel, roles, type) {
        const permissions = this.getPermissionsByType(type, roles);
        
        // Appliquer les permissions
        for (const permission of permissions) {
            await channel.permissionOverwrites.edit(permission.id, permission.permissions);
        }
    },

    getPermissionsByType(type, roles) {
        const fullAccess = {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            UseExternalEmojis: true,
            AddReactions: true,
            AttachFiles: true,
            EmbedLinks: true
        };

        const readOnly = {
            ViewChannel: true,
            SendMessages: false,
            ReadMessageHistory: true,
            UseExternalEmojis: false,
            AddReactions: true,
            AttachFiles: false,
            EmbedLinks: false
        };

        const limitedAccess = {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            UseExternalEmojis: false,
            AddReactions: true,
            AttachFiles: false,
            EmbedLinks: false
        };

        const noAccess = {
            ViewChannel: false,
            SendMessages: false,
            ReadMessageHistory: false,
            AddReactions: false
        };

        const permissions = [];

        switch (type) {
            case 'public':
                permissions.push({ id: roles.everyone.id, permissions: readOnly });
                if (roles.client) permissions.push({ id: roles.client.id, permissions: fullAccess });
                if (roles.vendeur) permissions.push({ id: roles.vendeur.id, permissions: fullAccess });
                if (roles.patron) permissions.push({ id: roles.patron.id, permissions: fullAccess });
                if (roles.admin) permissions.push({ id: roles.admin.id, permissions: fullAccess });
                if (roles.owner) permissions.push({ id: roles.owner.id, permissions: fullAccess });
                if (roles.bot) permissions.push({ id: roles.bot.id, permissions: fullAccess });
                break;

            case 'rh':
                // Canaux RH : Tout le monde peut voir, seuls patrons/admin peuvent écrire
                permissions.push({ id: roles.everyone.id, permissions: readOnly });
                if (roles.client) permissions.push({ id: roles.client.id, permissions: readOnly });
                if (roles.vendeur) permissions.push({ id: roles.vendeur.id, permissions: readOnly });
                if (roles.patron) permissions.push({ id: roles.patron.id, permissions: fullAccess });
                if (roles.admin) permissions.push({ id: roles.admin.id, permissions: fullAccess });
                if (roles.owner) permissions.push({ id: roles.owner.id, permissions: fullAccess });
                if (roles.bot) permissions.push({ id: roles.bot.id, permissions: fullAccess });
                break;

            case 'service':
                // Canaux Service : Tous les employés peuvent interagir (prendre service)
                permissions.push({ id: roles.everyone.id, permissions: limitedAccess });
                if (roles.client) permissions.push({ id: roles.client.id, permissions: limitedAccess });
                if (roles.vendeur) permissions.push({ id: roles.vendeur.id, permissions: fullAccess });
                if (roles.patron) permissions.push({ id: roles.patron.id, permissions: fullAccess });
                if (roles.admin) permissions.push({ id: roles.admin.id, permissions: fullAccess });
                if (roles.owner) permissions.push({ id: roles.owner.id, permissions: fullAccess });
                if (roles.bot) permissions.push({ id: roles.bot.id, permissions: fullAccess });
                break;

            case 'vendeur':
                permissions.push({ id: roles.everyone.id, permissions: noAccess });
                if (roles.client) permissions.push({ id: roles.client.id, permissions: readOnly });
                if (roles.vendeur) permissions.push({ id: roles.vendeur.id, permissions: fullAccess });
                if (roles.patron) permissions.push({ id: roles.patron.id, permissions: fullAccess });
                if (roles.admin) permissions.push({ id: roles.admin.id, permissions: fullAccess });
                if (roles.owner) permissions.push({ id: roles.owner.id, permissions: fullAccess });
                if (roles.bot) permissions.push({ id: roles.bot.id, permissions: fullAccess });
                break;

            case 'client':
                permissions.push({ id: roles.everyone.id, permissions: noAccess });
                if (roles.client) permissions.push({ id: roles.client.id, permissions: limitedAccess });
                if (roles.vendeur) permissions.push({ id: roles.vendeur.id, permissions: fullAccess });
                if (roles.patron) permissions.push({ id: roles.patron.id, permissions: fullAccess });
                if (roles.admin) permissions.push({ id: roles.admin.id, permissions: fullAccess });
                if (roles.owner) permissions.push({ id: roles.owner.id, permissions: fullAccess });
                if (roles.bot) permissions.push({ id: roles.bot.id, permissions: fullAccess });
                break;

            case 'logs':
                permissions.push({ id: roles.everyone.id, permissions: noAccess });
                if (roles.client) permissions.push({ id: roles.client.id, permissions: noAccess });
                if (roles.vendeur) permissions.push({ id: roles.vendeur.id, permissions: noAccess });
                if (roles.patron) permissions.push({ id: roles.patron.id, permissions: readOnly });
                if (roles.admin) permissions.push({ id: roles.admin.id, permissions: readOnly });
                if (roles.owner) permissions.push({ id: roles.owner.id, permissions: fullAccess });
                if (roles.bot) permissions.push({ id: roles.bot.id, permissions: fullAccess });
                break;

            default:
                permissions.push({ id: roles.everyone.id, permissions: readOnly });
                if (roles.bot) permissions.push({ id: roles.bot.id, permissions: fullAccess });
                // Donner accès aux autres rôles détectés
                if (roles.others) {
                    roles.others.forEach(role => {
                        permissions.push({ id: role.id, permissions: limitedAccess });
                    });
                }
                break;
        }

        return permissions.filter(p => p.id);
    },

    async createChannelWithPermissions(guild, channelInfo, roles) {
        // Créer ou trouver la catégorie
        let category = guild.channels.cache.find(c => c.type === 4 && c.name === channelInfo.category);
        if (!category) {
            category = await guild.channels.create({
                name: channelInfo.category,
                type: 4, // Category
                permissionOverwrites: [
                    {
                        id: roles.everyone.id,
                        deny: ['ViewChannel']
                    },
                    {
                        id: roles.patron?.id,
                        allow: ['ViewChannel', 'SendMessages']
                    }
                ].filter(p => p.id)
            });
        }

        // Créer le canal avec permissions
        const permissions = this.getPermissionsByType(channelInfo.type, roles);
        
        const channel = await guild.channels.create({
            name: channelInfo.name,
            type: 0, // Text channel
            parent: category.id,
            permissionOverwrites: permissions.map(p => ({
                id: p.id,
                allow: Object.entries(p.permissions)
                    .filter(([_, value]) => value === true)
                    .map(([key]) => key),
                deny: Object.entries(p.permissions)
                    .filter(([_, value]) => value === false)
                    .map(([key]) => key)
            }))
        });

        return channel;
    },

    formatRolesStatus(roles) {
        const roleList = [];
        
        // Afficher tous les rôles détectés
        if (roles.owner) roleList.push(`👑 Propriétaire: ✅ ${roles.owner.name}`);
        if (roles.admin) roleList.push(`⚡ Admin: ✅ ${roles.admin.name}`);
        if (roles.patron) roleList.push(`🏢 Patron: ✅ ${roles.patron.name}`);
        if (roles.vendeur) roleList.push(`💼 Vendeur: ✅ ${roles.vendeur.name}`);
        if (roles.client) roleList.push(`👤 Client: ✅ ${roles.client.name}`);
        if (roles.bot) roleList.push(`🤖 Bot: ✅ ${roles.bot.name}`);
        
        // Afficher les autres rôles détectés
        if (roles.others && roles.others.length > 0) {
            roleList.push(`🎭 Autres rôles: ${roles.others.map(r => r.name).join(', ')}`);
        }
        
        return roleList.join('\n') || 'Aucun rôle spécifique détecté';
    },

    /**
     * Détecte automatiquement tous les rôles existants sur le serveur
     */
    detectExistingRoles(guild) {
        const roles = {
            everyone: guild.roles.everyone,
            bot: guild.members.me.roles.highest,
            others: []
        };

        // Parcourir tous les rôles du serveur
        guild.roles.cache.forEach(role => {
            if (role.name === '@everyone' || role.managed) return;

            const roleName = role.name.toLowerCase();
            
            // Détecter les rôles d'administration
            if (roleName.includes('owner') || roleName.includes('propriétaire') || 
                roleName.includes('fondateur') || role.permissions.has('Administrator')) {
                roles.owner = role;
            }
            else if (roleName.includes('admin') || roleName.includes('administrateur') ||
                     role.permissions.has('ManageGuild')) {
                roles.admin = role;
            }
            // Détecter les rôles de direction
            else if (roleName.includes('patron') || roleName.includes('directeur') || 
                     roleName.includes('gérant') || roleName.includes('boss') ||
                     roleName.includes('chef') || roleName.includes('responsable')) {
                if (!roles.patron) roles.patron = role;
            }
            // Détecter les rôles de vente
            else if (roleName.includes('vendeur') || roleName.includes('commercial') || 
                     roleName.includes('vente') || roleName.includes('seller')) {
                if (!roles.vendeur) roles.vendeur = role;
            }
            // Détecter les rôles clients
            else if (roleName.includes('client') || roleName.includes('customer') || 
                     roleName.includes('acheteur') || roleName.includes('visiteur')) {
                if (!roles.client) roles.client = role;
            }
            // Autres rôles
            else {
                roles.others.push(role);
            }
        });

        return roles;
    }
};
