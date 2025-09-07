const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('service')
        .setDescription('Gestion des prises et fins de service')
        .addSubcommand(subcommand =>
            subcommand
                .setName('prendre')
                .setDescription('Signaler votre prise de service')
                .addStringOption(option =>
                    option
                        .setName('poste')
                        .setDescription('Votre poste de travail (optionnel)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('terminer')
                .setDescription('Signaler votre fin de service')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('statut')
                .setDescription('Consulter votre statut de service actuel')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('liste')
                .setDescription('Voir la liste du personnel en service')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('historique')
                .setDescription('Consulter l\'historique des services')
                .addUserOption(option =>
                    option
                        .setName('utilisateur')
                        .setDescription('Utilisateur à consulter (admin uniquement)')
                        .setRequired(false)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            
            console.log(`🔄 Commande service reçue: ${subcommand} par ${interaction.user.username}`);

            switch (subcommand) {
                case 'prendre':
                    await this.handlePrendreService(interaction);
                    break;
                case 'terminer':
                    await this.handleTerminerService(interaction);
                    break;
                case 'statut':
                    await this.handleStatus(interaction);
                    break;
                case 'liste':
                    await this.handleListe(interaction);
                    break;
                case 'historique':
                    await this.handleHistorique(interaction);
                    break;
                default:
                    throw new Error(`Sous-commande inconnue: ${subcommand}`);
            }
        } catch (error) {
            console.error('❌ Erreur commande service:', error);
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Erreur lors de l\'exécution de la commande',
                        flags: [4096] // EPHEMERAL flag
                    });
                } else if (interaction.deferred) {
                    await interaction.editReply({
                        content: '❌ Erreur lors de l\'exécution de la commande'
                    });
                } else {
                    await interaction.followUp({
                        content: '❌ Erreur lors de l\'exécution de la commande',
                        flags: [4096] // EPHEMERAL flag
                    });
                }
            } catch (replyError) {
                console.log('⚠️ Impossible de répondre à l\'interaction service:', replyError.message);
            }
        }
    },

    async handlePrendreService(interaction) {
        const userId = interaction.user.id;
        const userName = interaction.user.displayName || interaction.user.username;
        let poste = interaction.options.getString('poste');
        const timestamp = Date.now();
        
        // Si aucun poste spécifié, essayer de détecter à partir des rôles Discord existants
        if (!poste || poste.toLowerCase() === 'non spécifié') {
            console.log(`🔍 Aucun poste spécifié, détection automatique des rôles...`);
            const member = interaction.guild.members.cache.get(userId);
            if (member) {
                const detectedRole = this.detectRoleFromMember(member);
                if (detectedRole) {
                    poste = detectedRole.poste;
                    console.log(`✅ Poste détecté automatiquement: "${poste}" à partir du rôle "${detectedRole.roleName}"`);
                } else {
                    poste = 'Non spécifié';
                    console.log(`⚠️ Aucun rôle de service détecté, utilisation de "Non spécifié"`);
                }
            }
        }

        // Vérifier si déjà en service
        const serviceData = await this.loadServiceData();
        const currentService = serviceData.activeServices.find(s => s.userId === userId);

        if (currentService) {
            const startTime = new Date(currentService.startTime).toLocaleString('fr-FR');
            const embed = new EmbedBuilder()
                .setTitle('⚠️ Déjà en Service')
                .setDescription(`Vous êtes déjà en service depuis **${startTime}**`)
                .addFields(
                    { name: '🏢 Poste actuel', value: currentService.poste, inline: true },
                    { name: '🎭 Rôle Discord', value: currentService.discordRole || 'Aucun', inline: true },
                    { name: '⏱️ Durée', value: this.formatDuration(timestamp - currentService.startTime), inline: true }
                )
                .setColor('#FFA500')
                .setTimestamp();

            return interaction.reply({ embeds: [embed], flags: [4096] }); // EPHEMERAL flag
        }

        // Déterminer le rôle Discord en fonction du poste
        console.log(`🔍 Analyse du poste: "${poste}"`);
        
        let assignedRole = null;
        let roleError = null;
        let roleId = null;

        // D'abord, vérifier si l'utilisateur a déjà un rôle de service actif
        const member = interaction.guild.members.cache.get(userId);
        console.log(`👤 Membre trouvé: ${!!member}`);
        
        if (member) {
            // Chercher un rôle de service existant
            const existingServiceRole = this.findExistingServiceRole(member);
            
            if (existingServiceRole) {
                console.log(`✅ Rôle de service existant détecté: ${existingServiceRole.name}`);
                assignedRole = existingServiceRole.name;
                roleId = existingServiceRole.id;
            } else {
                // Aucun rôle existant, procéder à la détection/création
                console.log(`🔄 Aucun rôle de service existant, analyse du poste...`);
                
                const roleMapping = this.getPosteRoleMapping(poste, interaction.guild);
                console.log(`🔍 Résultat mapping:`, {
                    roleName: roleMapping.roleName,
                    roleFound: !!roleMapping.role,
                    roleId: roleMapping.role?.id,
                    wasMatched: roleMapping.wasMatched,
                    priority: roleMapping.priority
                });
                
                try {
                    if (roleMapping.role) {
                        console.log(`🔄 Attribution du rôle existant: ${roleMapping.role.name}`);
                        await member.roles.add(roleMapping.role);
                        assignedRole = roleMapping.role.name;
                        roleId = roleMapping.role.id;
                        console.log(`✅ Rôle "${assignedRole}" assigné à ${userName}`);
                    } else {
                        console.log(`🔄 Création du nouveau rôle: ${roleMapping.roleName}`);
                        const newRole = await this.createServiceRole(interaction.guild, roleMapping.roleName, roleMapping.color);
                        if (newRole) {
                            console.log(`🔄 Attribution du nouveau rôle créé: ${newRole.name}`);
                            await member.roles.add(newRole);
                            assignedRole = newRole.name;
                            roleId = newRole.id;
                            console.log(`✅ Rôle "${assignedRole}" créé et assigné à ${userName}`);
                        } else {
                            console.log(`❌ Échec création rôle: ${roleMapping.roleName}`);
                            roleError = `Impossible de créer le rôle ${roleMapping.roleName}`;
                        }
                    }
                } catch (error) {
                    console.error('❌ Erreur attribution rôle:', error);
                    roleError = `Impossible d'assigner le rôle`;
                }
            }
        } else {
            roleError = 'Membre introuvable dans le serveur';
        }

        // Enregistrer la prise de service
        const newService = {
            userId,
            userName,
            poste,
            startTime: timestamp,
            endTime: null,
            duration: null,
            discordRole: assignedRole,
            roleId: roleId
        };

        serviceData.activeServices.push(newService);
        await this.saveServiceData(serviceData);

        // Embed de confirmation
        const embed = new EmbedBuilder()
            .setTitle('🟢 Prise de Service Enregistrée')
            .setDescription(`**${userName}** a pris le service`)
            .addFields(
                { name: '👤 Nom', value: userName, inline: true },
                { name: '🏢 Poste', value: poste, inline: true },
                { name: '🕐 Heure', value: new Date(timestamp).toLocaleString('fr-FR'), inline: true }
            )
            .setColor('#00FF00')
            .setTimestamp()
            .setFooter({ text: `ID: ${userId}` });

        // Ajouter info sur le rôle Discord
        if (assignedRole) {
            embed.addFields({
                name: '🎭 Rôle Discord',
                value: `✅ **${assignedRole}** assigné automatiquement`,
                inline: false
            });
        } else if (roleError) {
            embed.addFields({
                name: '⚠️ Rôle Discord',
                value: roleError,
                inline: false
            });
        } else {
            embed.addFields({
                name: '🎭 Rôle Discord',
                value: '➖ Aucun rôle spécifique pour ce poste',
                inline: false
            });
        }

        // Répondre à l'utilisateur
        await interaction.reply({ embeds: [embed] });

        // Envoyer dans le canal de logs si différent
        if (interaction.channel.name !== 'logs-rh') {
            const logChannel = interaction.guild.channels.cache.find(c => c.name === 'logs-rh');
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📝 Log: Prise de Service')
                    .setDescription(`${userName} a pris le service`)
                    .addFields(
                        { name: 'Poste', value: poste, inline: true },
                        { name: 'Rôle assigné', value: assignedRole || 'Aucun', inline: true },
                        { name: 'Canal', value: interaction.channel.name, inline: true }
                    )
                    .setColor('#00FF00')
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        }
    },

    async handleTerminerService(interaction) {
        const userId = interaction.user.id;
        const userName = interaction.user.displayName || interaction.user.username;
        const timestamp = Date.now();

        // Vérifier si en service
        const serviceData = await this.loadServiceData();
        const serviceIndex = serviceData.activeServices.findIndex(s => s.userId === userId);

        if (serviceIndex === -1) {
            const embed = new EmbedBuilder()
                .setTitle('⚠️ Pas en Service')
                .setDescription('Vous n\'êtes actuellement pas en service')
                .addFields({
                    name: '💡 Astuce',
                    value: 'Utilisez `/service prendre` pour commencer votre service',
                    inline: false
                })
                .setColor('#FFA500')
                .setTimestamp();

            return interaction.reply({ embeds: [embed], flags: [4096] }); // EPHEMERAL flag
        }

        // Récupérer et supprimer le service actif
        const service = serviceData.activeServices[serviceIndex];
        serviceData.activeServices.splice(serviceIndex, 1);

        // Retirer le rôle Discord si il avait été assigné
        let roleRemoved = false;
        let roleError = null;

        try {
            const member = interaction.guild.members.cache.get(userId);
            if (member && service.roleId) {
                const role = interaction.guild.roles.cache.get(service.roleId);
                if (role) {
                    await member.roles.remove(role);
                    roleRemoved = true;
                    console.log(`✅ Rôle "${role.name}" retiré de ${userName}`);
                }
            }
        } catch (error) {
            console.error('❌ Erreur retrait rôle:', error);
            roleError = 'Impossible de retirer le rôle Discord';
        }

        // Calculer la durée
        const duration = timestamp - service.startTime;
        service.endTime = timestamp;
        service.duration = duration;

        // Ajouter à l'historique
        if (!serviceData.history) serviceData.history = [];
        serviceData.history.push(service);

        await this.saveServiceData(serviceData);

        // Embed de confirmation
        const embed = new EmbedBuilder()
            .setTitle('🔴 Fin de Service Enregistrée')
            .setDescription(`**${userName}** a terminé son service`)
            .addFields(
                { name: '👤 Nom', value: userName, inline: true },
                { name: '🏢 Poste', value: service.poste, inline: true },
                { name: '⏱️ Durée totale', value: this.formatDuration(duration), inline: true },
                { name: '🕐 Début', value: new Date(service.startTime).toLocaleString('fr-FR'), inline: true },
                { name: '🕐 Fin', value: new Date(timestamp).toLocaleString('fr-FR'), inline: true },
                { name: '📊 Performance', value: duration > 3600000 ? '✅ Bonne session' : '⚠️ Session courte', inline: true }
            )
            .setColor('#FF0000')
            .setTimestamp()
            .setFooter({ text: `ID: ${userId}` });

        // Ajouter info sur le rôle Discord
        if (roleRemoved && service.discordRole) {
            embed.addFields({
                name: '🎭 Rôle Discord',
                value: `✅ **${service.discordRole}** retiré automatiquement`,
                inline: false
            });
        } else if (roleError) {
            embed.addFields({
                name: '⚠️ Rôle Discord',
                value: roleError,
                inline: false
            });
        } else if (service.discordRole) {
            embed.addFields({
                name: '🎭 Rôle Discord',
                value: `➖ Aucun rôle à retirer`,
                inline: false
            });
        }

        // Répondre à l'utilisateur
        await interaction.reply({ embeds: [embed] });

        // Log
        const logChannel = interaction.guild.channels.cache.find(c => c.name === 'logs-rh');
        if (logChannel && interaction.channel.name !== 'logs-rh') {
            const logEmbed = new EmbedBuilder()
                .setTitle('📝 Log: Fin de Service')
                .setDescription(`${userName} a terminé son service`)
                .addFields(
                    { name: 'Durée', value: this.formatDuration(duration), inline: true },
                    { name: 'Rôle retiré', value: service.discordRole || 'Aucun', inline: true },
                    { name: 'Performance', value: duration > 3600000 ? 'Bonne' : 'Courte', inline: true }
                )
                .setColor('#FF0000')
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
        }
    },

    async handleStatus(interaction) {
        const userId = interaction.user.id;
        const userName = interaction.user.displayName || interaction.user.username;

        const serviceData = await this.loadServiceData();
        const currentService = serviceData.activeServices.find(s => s.userId === userId);

        const embed = new EmbedBuilder()
            .setTitle('📊 Votre Statut de Service')
            .setTimestamp();

        if (currentService) {
            const duration = Date.now() - currentService.startTime;
            embed.setDescription('🟢 **Vous êtes actuellement EN SERVICE**')
                .addFields(
                    { name: '🕐 Début de service', value: new Date(currentService.startTime).toLocaleString('fr-FR'), inline: true },
                    { name: '🏢 Poste', value: currentService.poste, inline: true },
                    { name: '🎭 Rôle Discord', value: currentService.discordRole || 'Aucun', inline: true },
                    { name: '⏱️ Durée actuelle', value: this.formatDuration(duration), inline: false }
                )
                .setColor('#00FF00');
        } else {
            embed.setDescription('🔴 **Vous n\'êtes pas en service**')
                .addFields({
                    name: '💡 Pour commencer',
                    value: 'Utilisez `/service prendre [poste]`',
                    inline: false
                })
                .setColor('#FF0000');
        }

        // Statistiques de la journée
        if (serviceData.history) {
            const today = new Date().toDateString();
            const todayServices = serviceData.history.filter(s => 
                s.userId === userId && new Date(s.startTime).toDateString() === today
            );

            if (todayServices.length > 0) {
                const totalToday = todayServices.reduce((sum, s) => sum + (s.duration || 0), 0);
                embed.addFields({
                    name: '📈 Aujourd\'hui',
                    value: `${todayServices.length} session(s) - ${this.formatDuration(totalToday)}`,
                    inline: false
                });
            }
        }

        await interaction.reply({ embeds: [embed], flags: [4096] }); // EPHEMERAL flag
    },

    async handleListe(interaction) {
        const serviceData = await this.loadServiceData();
        const activeServices = serviceData.activeServices || [];

        const embed = new EmbedBuilder()
            .setTitle('👥 Personnel en Service')
            .setDescription(`${activeServices.length} personne(s) actuellement en service`)
            .setColor('#0099FF')
            .setTimestamp();

        if (activeServices.length === 0) {
            embed.setDescription('🚫 Aucune personne en service actuellement')
                .setColor('#FF6B6B');
        } else {
            const servicesList = activeServices.map((service, index) => {
                const duration = Date.now() - service.startTime;
                const startTime = new Date(service.startTime).toLocaleTimeString('fr-FR');
                const roleInfo = service.discordRole ? ` • 🎭 ${service.discordRole}` : '';
                
                return `**${index + 1}.** ${service.userName}\n` +
                       `   └ 🏢 ${service.poste} • 🕐 ${startTime} • ⏱️ ${this.formatDuration(duration)}${roleInfo}`;
            }).join('\n\n');

            embed.addFields({
                name: '📋 Liste du personnel',
                value: servicesList.length > 1024 ? servicesList.substring(0, 1020) + '...' : servicesList,
                inline: false
            });

            // Statistiques
            const totalTime = activeServices.reduce((sum, service) => 
                sum + (Date.now() - service.startTime), 0
            );
            const avgTime = totalTime / activeServices.length;

            // Compter les rôles actifs
            const rolesActifs = {};
            activeServices.forEach(service => {
                if (service.discordRole) {
                    rolesActifs[service.discordRole] = (rolesActifs[service.discordRole] || 0) + 1;
                }
            });

            embed.addFields({
                name: '📊 Statistiques actuelles',
                value: [
                    `• Temps moyen: ${this.formatDuration(avgTime)}`,
                    `• Plus longue session: ${this.formatDuration(Math.max(...activeServices.map(s => Date.now() - s.startTime)))}`,
                    `• Rôles actifs: ${Object.keys(rolesActifs).length}`,
                    `• Dernière prise: ${new Date(Math.max(...activeServices.map(s => s.startTime))).toLocaleTimeString('fr-FR')}`
                ].join('\n'),
                inline: false
            });

            if (Object.keys(rolesActifs).length > 0) {
                const rolesText = Object.entries(rolesActifs)
                    .map(([role, count]) => `${role}: ${count}`)
                    .join('\n');
                
                embed.addFields({
                    name: '🎭 Répartition des rôles',
                    value: rolesText,
                    inline: false
                });
            }
        }

        await interaction.reply({ embeds: [embed] });
    },

    async handleHistorique(interaction) {
        const targetUser = interaction.options.getUser('utilisateur');
        const userId = targetUser ? targetUser.id : interaction.user.id;
        const userName = targetUser ? (targetUser.displayName || targetUser.username) : (interaction.user.displayName || interaction.user.username);

        // Vérifier permissions pour consulter autre utilisateur
        if (targetUser && !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                content: '❌ Vous n\'avez pas la permission de consulter l\'historique d\'autres utilisateurs',
                flags: [4096] // EPHEMERAL flag
            });
        }

        const serviceData = await this.loadServiceData();
        const userHistory = (serviceData.history || []).filter(s => s.userId === userId);

        const embed = new EmbedBuilder()
            .setTitle(`📚 Historique de Service - ${userName}`)
            .setColor('#9B59B6')
            .setTimestamp();

        if (userHistory.length === 0) {
            embed.setDescription('🚫 Aucun historique de service trouvé')
                .setColor('#FF6B6B');
            return interaction.reply({ embeds: [embed], ephemeral: !targetUser });
        }

        // Statistiques générales
        const totalSessions = userHistory.length;
        const totalTime = userHistory.reduce((sum, s) => sum + (s.duration || 0), 0);
        const avgTime = totalTime / totalSessions;

        embed.setDescription(`${totalSessions} session(s) de service enregistrée(s)`)
            .addFields({
                name: '📊 Statistiques générales',
                value: [
                    `• Total sessions: ${totalSessions}`,
                    `• Temps total: ${this.formatDuration(totalTime)}`,
                    `• Temps moyen: ${this.formatDuration(avgTime)}`,
                    `• Plus longue session: ${this.formatDuration(Math.max(...userHistory.map(s => s.duration || 0)))}`
                ].join('\n'),
                inline: false
            });

        // Dernières sessions (5 max)
        const recentSessions = userHistory.slice(-5).reverse();
        const historyList = recentSessions.map((session, index) => {
            const start = new Date(session.startTime).toLocaleDateString('fr-FR');
            const duration = this.formatDuration(session.duration || 0);
            const roleInfo = session.discordRole ? ` • 🎭 ${session.discordRole}` : '';
            
            return `**${index + 1}.** ${start}\n` +
                   `   └ 🏢 ${session.poste} • ⏱️ ${duration}${roleInfo}`;
        }).join('\n\n');

        embed.addFields({
            name: '🕒 Dernières sessions',
            value: historyList,
            inline: false
        });

        await interaction.reply({ embeds: [embed], ephemeral: !targetUser });
    },

    async loadServiceData() {
        const filePath = path.join(__dirname, '..', 'data', 'services.json');
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // Créer le fichier s'il n'existe pas
            const defaultData = {
                activeServices: [],
                history: []
            };
            await this.saveServiceData(defaultData);
            return defaultData;
        }
    },

    async saveServiceData(data) {
        const filePath = path.join(__dirname, '..', 'data', 'services.json');
        try {
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Erreur sauvegarde services:', error);
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
    },

    findExistingServiceRole(member) {
        console.log(`🔍 Recherche rôle de service existant pour ${member.displayName}:`);
        
        // Patterns des rôles de service reconnus
        const serviceRolePatterns = [
            '🟢 En Service', '📞 Réception', '🛒 Vente', '🔧 Technique', 
            '🚚 Livraison', '📚 Formation', '🎧 Support', '👔 Management', 
            '👑 Direction', '👤 Employé', 'service', 'vendeur', 'technicien',
            'réception', 'livraison', 'formation', 'support', 'responsable', 'directeur'
        ];

        for (const role of member.roles.cache.values()) {
            const roleName = role.name.toLowerCase();
            console.log(`🔍 Vérification du rôle: "${role.name}"`);
            
            // Vérifier si c'est un rôle de service
            const isServiceRole = serviceRolePatterns.some(pattern => 
                roleName.includes(pattern.toLowerCase()) || 
                role.name === pattern
            );
            
            if (isServiceRole) {
                console.log(`✅ Rôle de service trouvé: "${role.name}"`);
                return role;
            }
        }

        console.log(`❌ Aucun rôle de service existant trouvé`);
        return null;
    },

    detectRoleFromMember(member) {
        console.log(`🔍 Analyse des rôles de ${member.displayName}:`);
        
        // Définir les rôles de service reconnus et leurs postes correspondants (FRANÇAIS UNIQUEMENT)
        const roleMapping = [
            { patterns: ['recrue', 'nouveau', 'débutant'], poste: 'Recrue' },
            { patterns: ['exposition', 'présentation', 'démonstration'], poste: 'Exposition' },
            { patterns: ['vente', 'vendeur', 'commercial'], poste: 'Vendeur' },
            { patterns: ['affaires', 'commerce', 'négociation'], poste: 'Commercial' },
            { patterns: ['financier', 'comptable', 'crédit'], poste: 'Financier' },
            { patterns: ['chef', 'responsable', 'management'], poste: 'Responsable' }
        ];

        // Examiner tous les rôles du membre
        const memberRoles = member.roles.cache.map(role => role.name);
        console.log(`👤 Rôles du membre:`, memberRoles);

        for (const role of member.roles.cache.values()) {
            const roleName = role.name.toLowerCase();
            console.log(`🔍 Analyse du rôle: "${role.name}"`);
            
            // Vérifier chaque mapping
            for (const mapping of roleMapping) {
                for (const pattern of mapping.patterns) {
                    if (roleName.includes(pattern)) {
                        console.log(`✅ Pattern "${pattern}" trouvé dans "${role.name}" -> Poste: ${mapping.poste}`);
                        return {
                            poste: mapping.poste,
                            roleName: role.name,
                            roleId: role.id
                        };
                    }
                }
            }
        }

        console.log(`❌ Aucun rôle de service détecté`);
        return null;
    },

    getPosteRoleMapping(poste, guild) {
        // Mapping des postes vers les rôles Discord
        const posteLower = poste.toLowerCase();
        console.log(`🔍 Analyse poste: "${poste}" -> "${posteLower}"`);
        
        // Définir les correspondances poste -> rôle (FRANÇAIS UNIQUEMENT)
        const mappings = [
            // Rôle générique par défaut
            {
                keywords: ['service', 'travail', 'boulot'],
                roleName: '🟢 En Service',
                color: '#00FF00',
                priority: 1
            },
            // Rôles spécifiques métiers
            {
                keywords: ['recrue', 'nouveau', 'débutant'],
                roleName: '👤 Recrue',
                color: '#87CEEB',
                priority: 2
            },
            {
                keywords: ['exposition', 'présentation', 'démonstration'],
                roleName: '🚗 Exposition',
                color: '#FF4500',
                priority: 3
            },
            {
                keywords: ['vendeur', 'vente'],
                roleName: '💰 Vendeur',
                color: '#32CD32',
                priority: 3
            },
            {
                keywords: ['affaires', 'commerce', 'négociation', 'commercial'],
                roleName: '💼 Commercial',
                color: '#4169E1',
                priority: 3
            },
            {
                keywords: ['financier', 'comptable', 'crédit', 'finance'],
                roleName: '💳 Financier',
                color: '#FFD700',
                priority: 3
            },
            {
                keywords: ['chef', 'responsable', 'management'],
                roleName: '👔 Responsable',
                color: '#800080',
                priority: 4
            }
        ];

        // Chercher la meilleure correspondance
        let bestMatch = null;
        let highestPriority = 0;

        console.log(`🔍 Recherche correspondances pour: "${posteLower}"`);
        for (const mapping of mappings) {
            for (const keyword of mapping.keywords) {
                if (posteLower.includes(keyword)) {
                    console.log(`✅ Match trouvé: "${keyword}" -> ${mapping.roleName} (priorité: ${mapping.priority})`);
                    if (mapping.priority > highestPriority) {
                        bestMatch = mapping;
                        highestPriority = mapping.priority;
                    }
                }
            }
        }

        // Si aucune correspondance, utiliser le mapping par défaut
        if (!bestMatch) {
            console.log(`⚠️ Aucune correspondance trouvée, utilisation du rôle par défaut`);
            bestMatch = mappings[0]; // '🟢 En Service'
        }

        // Chercher si le rôle existe déjà dans le serveur
        const existingRole = guild.roles.cache.find(role => role.name === bestMatch.roleName);
        
        console.log(`🎭 Rôle sélectionné: "${bestMatch.roleName}"`);
        console.log(`🔍 Rôle existant trouvé: ${!!existingRole}`);

        return {
            roleName: bestMatch.roleName,
            color: bestMatch.color,
            priority: bestMatch.priority,
            role: existingRole,
            wasMatched: !!bestMatch
        };
    },

    async createServiceRole(guild, roleName, color) {
        try {
            console.log(`🔄 Création du rôle: "${roleName}" avec couleur: ${color}`);
            
            const role = await guild.roles.create({
                name: roleName,
                color: color,
                hoist: false,
                mentionable: false,
                reason: 'Rôle de service créé automatiquement'
            });

            console.log(`✅ Rôle "${roleName}" créé avec succès (ID: ${role.id})`);
            return role;
        } catch (error) {
            console.error(`❌ Erreur création rôle "${roleName}":`, error);
            return null;
        }
    }
};
