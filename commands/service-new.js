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
                .setName('status')
                .setDescription('Voir votre statut de service actuel')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('liste')
                .setDescription('Voir qui est actuellement en service')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('historique')
                .setDescription('Voir l\'historique de vos services')
                .addUserOption(option =>
                    option
                        .setName('utilisateur')
                        .setDescription('Utilisateur à consulter (admin uniquement)')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'prendre':
                    await this.handlePrendreService(interaction);
                    break;
                case 'terminer':
                    await this.handleTerminerService(interaction);
                    break;
                case 'status':
                    await this.handleStatus(interaction);
                    break;
                case 'liste':
                    await this.handleListe(interaction);
                    break;
                case 'historique':
                    await this.handleHistorique(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Sous-commande non reconnue',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Erreur commande service:', error);
            
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Erreur lors de l\'exécution de la commande',
                    ephemeral: true
                });
            }
        }
    },

    async handlePrendreService(interaction) {
        const userId = interaction.user.id;
        const userName = interaction.user.displayName || interaction.user.username;
        const poste = interaction.options.getString('poste') || 'Non spécifié';
        const timestamp = Date.now();

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

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Déterminer le rôle Discord en fonction du poste
        const roleMapping = this.getPosteRoleMapping(poste, interaction.guild);
        let assignedRole = null;
        let roleError = null;

        // Assigner le rôle Discord si disponible
        try {
            const member = interaction.guild.members.cache.get(userId);
            if (member && roleMapping.role) {
                await member.roles.add(roleMapping.role);
                assignedRole = roleMapping.role.name;
                console.log(`✅ Rôle "${assignedRole}" assigné à ${userName}`);
            } else if (member && !roleMapping.role) {
                // Créer le rôle s'il n'existe pas
                const newRole = await this.createServiceRole(interaction.guild, roleMapping.roleName);
                if (newRole) {
                    await member.roles.add(newRole);
                    assignedRole = newRole.name;
                    roleMapping.role = newRole;
                    console.log(`✅ Rôle "${assignedRole}" créé et assigné à ${userName}`);
                }
            }
        } catch (error) {
            console.error('❌ Erreur attribution rôle:', error);
            roleError = `Impossible d'assigner le rôle ${roleMapping.roleName}`;
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
            roleId: roleMapping.role?.id || null
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

            return interaction.reply({ embeds: [embed], ephemeral: true });
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

        await interaction.reply({ embeds: [embed], ephemeral: true });
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
                ephemeral: true
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

    getPosteRoleMapping(poste, guild) {
        // Mapping des postes vers les rôles Discord
        const posteLower = poste.toLowerCase();
        
        // Définir les correspondances poste -> rôle
        const mappings = [
            // Rôles de service générique
            {
                keywords: ['service', 'travail', 'boulot', 'job'],
                roleName: '🟢 En Service',
                color: '#00FF00',
                priority: 1
            },
            // Rôles spécifiques métiers
            {
                keywords: ['réception', 'reception', 'accueil'],
                roleName: '📞 Réception',
                color: '#FF69B4',
                priority: 3
            },
            {
                keywords: ['vente', 'vendeur', 'commercial', 'conseiller'],
                roleName: '🛒 Vente',
                color: '#FFA500',
                priority: 3
            },
            {
                keywords: ['technique', 'technicien', 'maintenance', 'réparation'],
                roleName: '🔧 Technique',
                color: '#808080',
                priority: 3
            },
            {
                keywords: ['livraison', 'livreur', 'transport', 'chauffeur'],
                roleName: '🚚 Livraison',
                color: '#8B4513',
                priority: 3
            },
            {
                keywords: ['formation', 'formateur', 'trainer'],
                roleName: '📚 Formation',
                color: '#4169E1',
                priority: 3
            },
            {
                keywords: ['support', 'aide', 'assistance'],
                roleName: '🎧 Support',
                color: '#32CD32',
                priority: 3
            },
            {
                keywords: ['management', 'manager', 'chef', 'responsable', 'patron'],
                roleName: '👔 Management',
                color: '#800080',
                priority: 4
            },
            {
                keywords: ['direction', 'directeur', 'boss', 'dirigeant'],
                roleName: '👑 Direction',
                color: '#FFD700',
                priority: 5
            }
        ];

        // Chercher la meilleure correspondance
        let bestMatch = null;
        let highestPriority = 0;

        for (const mapping of mappings) {
            for (const keyword of mapping.keywords) {
                if (posteLower.includes(keyword)) {
                    if (mapping.priority > highestPriority) {
                        bestMatch = mapping;
                        highestPriority = mapping.priority;
                    }
                }
            }
        }

        // Si aucune correspondance spécifique, utiliser le rôle générique
        if (!bestMatch) {
            bestMatch = {
                roleName: '🟢 En Service',
                color: '#00FF00',
                priority: 1
            };
        }

        // Chercher le rôle dans le serveur Discord
        let discordRole = guild.roles.cache.find(role => 
            role.name === bestMatch.roleName ||
            role.name.toLowerCase().includes(bestMatch.roleName.toLowerCase())
        );

        return {
            roleName: bestMatch.roleName,
            color: bestMatch.color,
            role: discordRole,
            priority: bestMatch.priority,
            wasMatched: highestPriority > 1
        };
    },

    async createServiceRole(guild, roleName, color = '#00FF00') {
        try {
            const role = await guild.roles.create({
                name: roleName,
                color: color,
                permissions: [],
                hoist: true, // Afficher séparément dans la liste
                mentionable: false,
                reason: 'Rôle automatique pour prise de service'
            });
            
            console.log(`✅ Rôle "${roleName}" créé automatiquement`);
            return role;
        } catch (error) {
            console.error(`❌ Impossible de créer le rôle "${roleName}":`, error);
            return null;
        }
    }
};
