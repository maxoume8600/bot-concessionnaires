const { ChannelType, PermissionFlagsBits } = require('discord.js');
const EmbedUtils = require('./embeds');

class ServerSetup {
    constructor(client) {
        this.client = client;
        this.isSetupComplete = false;
        this.createdChannels = new Map();
        this.createdRoles = new Map();
    }

    /**
     * Configuration complète du serveur Discord
     */
    async setupServer(guild) {
        console.log(`🏗️ Configuration du serveur "${guild.name}" pour le concessionnaire...`);
        
        try {
            // 1. Créer les rôles
            await this.createRoles(guild);
            
            // 2. Créer les catégories et canaux
            await this.createChannels(guild);
            
            // 3. Configurer les permissions
            await this.setupPermissions(guild);
            
            // 4. Créer le message de bienvenue
            await this.createWelcomeMessage(guild);
            
            // 5. Mettre à jour le fichier .env
            await this.updateEnvFile();
            
            this.setupComplete = true;
            console.log('✅ Configuration du serveur terminée !');
            
            return {
                success: true,
                channels: this.createdChannels,
                roles: this.createdRoles,
                message: 'Serveur configuré avec succès !'
            };
            
        } catch (error) {
            console.error('❌ Erreur lors de la configuration:', error);
            throw error;
        }
    }

    /**
     * Créer tous les rôles nécessaires
     */
    async createRoles(guild) {
        console.log('👥 Création des rôles...');
        
        const rolesToCreate = [
            {
                name: '🏢 Patron Concessionnaire',
                key: 'PATRON',
                color: '#FF0000',
                permissions: [
                    PermissionFlagsBits.Administrator
                ],
                hoist: true,
                mentionable: true
            },
            {
                name: '💼 Vendeur Auto',
                key: 'VENDEUR', 
                color: '#00FF00',
                permissions: [
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.UseExternalEmojis
                ],
                hoist: true,
                mentionable: true
            },
            {
                name: '🚗 Client Concessionnaire',
                key: 'CLIENT',
                color: '#3498DB',
                permissions: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.UseExternalEmojis
                ],
                hoist: false,
                mentionable: true
            },
            {
                name: '🤖 Bot Concessionnaire',
                key: 'BOT',
                color: '#FFD700',
                permissions: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.UseExternalEmojis,
                    PermissionFlagsBits.AddReactions
                ],
                hoist: true,
                mentionable: false
            }
        ];

        for (const roleData of rolesToCreate) {
            try {
                // Vérifier si le rôle existe déjà
                let role = guild.roles.cache.find(r => r.name === roleData.name);
                
                if (!role) {
                    role = await guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        permissions: roleData.permissions,
                        hoist: roleData.hoist,
                        mentionable: roleData.mentionable,
                        reason: `Configuration automatique du concessionnaire`
                    });
                    console.log(`   ✅ Rôle créé: ${roleData.name}`);
                } else {
                    console.log(`   ℹ️ Rôle existant: ${roleData.name}`);
                }
                
                this.createdRoles.set(roleData.key, role);
                
            } catch (error) {
                console.error(`   ❌ Erreur création rôle ${roleData.name}:`, error.message);
            }
        }

        // Assigner le rôle bot au bot
        const botRole = this.createdRoles.get('BOT');
        if (botRole) {
            try {
                const botMember = await guild.members.fetch(this.client.user.id);
                await botMember.roles.add(botRole);
                console.log('   🤖 Rôle bot assigné au bot');
            } catch (error) {
                console.error('   ⚠️ Impossible d\'assigner le rôle bot:', error.message);
            }
        }
    }

    /**
     * Créer toutes les catégories et canaux
     */
    async createChannels(guild) {
        console.log('📁 Création des canaux...');

        const channelStructure = [
            {
                name: '🏢 CONCESSIONNAIRE',
                type: 'category',
                channels: [
                    {
                        name: '📋 catalogue-vehicules',
                        type: ChannelType.GuildText,
                        key: 'CATALOGUE',
                        topic: '🚗 Catalogue des véhicules disponibles - Utilisez /catalogue',
                        permissions: {
                            everyone: { ViewChannel: true, SendMessages: false },
                            vendeur: { ViewChannel: true, SendMessages: true },
                            client: { ViewChannel: true, SendMessages: false },
                            bot: { ViewChannel: true, SendMessages: true, ManageMessages: true }
                        }
                    },
                    {
                        name: ' gestion-stock',
                        type: ChannelType.GuildText,
                        key: 'STOCK',
                        topic: '📈 Gestion et alertes de stock des véhicules',
                        permissions: {
                            everyone: { ViewChannel: false },
                            vendeur: { ViewChannel: true, SendMessages: true },
                            patron: { ViewChannel: true, SendMessages: true },
                            bot: { ViewChannel: true, SendMessages: true }
                        }
                    }
                ]
            },
            {
                name: '💼 GESTION',
                type: 'category',
                channels: [
                    {
                        name: '📊 statistiques-ventes',
                        type: ChannelType.GuildText,
                        key: 'STATS',
                        topic: '📈 Statistiques et rapports de ventes',
                        permissions: {
                            everyone: { ViewChannel: false },
                            vendeur: { ViewChannel: true, SendMessages: false },
                            patron: { ViewChannel: true, SendMessages: true },
                            bot: { ViewChannel: true, SendMessages: true }
                        }
                    },
                    {
                        name: '🔧 commandes-admin',
                        type: ChannelType.GuildText,
                        key: 'ADMIN',
                        topic: '⚙️ Commandes d\'administration du concessionnaire',
                        permissions: {
                            everyone: { ViewChannel: false },
                            patron: { ViewChannel: true, SendMessages: true },
                            bot: { ViewChannel: true, SendMessages: true }
                        }
                    },
                    {
                        name: '📝 logs-systeme',
                        type: ChannelType.GuildText,
                        key: 'LOGS',
                        topic: '🔍 Logs système et synchronisation FiveM',
                        permissions: {
                            everyone: { ViewChannel: false },
                            patron: { ViewChannel: true, SendMessages: false },
                            bot: { ViewChannel: true, SendMessages: true }
                        }
                    }
                ]
            },
            {
                name: '🎯 SUPPORT',
                type: 'category',
                channels: [
                    {
                        name: '❓ aide-concessionnaire',
                        type: ChannelType.GuildText,
                        key: 'HELP',
                        topic: '💡 Aide et questions sur le concessionnaire - Tapez /aide',
                        permissions: {
                            everyone: { ViewChannel: true, SendMessages: true },
                            bot: { ViewChannel: true, SendMessages: true }
                        }
                    },
                    {
                        name: '🔔 annonces-importantes',
                        type: ChannelType.GuildText,
                        key: 'ANNONCES',
                        topic: '📢 Annonces importantes du concessionnaire',
                        permissions: {
                            everyone: { ViewChannel: true, SendMessages: false },
                            patron: { ViewChannel: true, SendMessages: true },
                            bot: { ViewChannel: true, SendMessages: true }
                        }
                    }
                ]
            }
        ];

        for (const categoryData of channelStructure) {
            let category;
            
            // Créer la catégorie
            const existingCategory = guild.channels.cache.find(c => 
                c.type === ChannelType.GuildCategory && c.name === categoryData.name
            );
            
            if (!existingCategory) {
                category = await guild.channels.create({
                    name: categoryData.name,
                    type: ChannelType.GuildCategory,
                    reason: 'Configuration automatique du concessionnaire'
                });
                console.log(`   📁 Catégorie créée: ${categoryData.name}`);
            } else {
                category = existingCategory;
                console.log(`   📁 Catégorie existante: ${categoryData.name}`);
            }

            // Créer les canaux dans la catégorie
            for (const channelData of categoryData.channels) {
                try {
                    const existingChannel = guild.channels.cache.find(c => 
                        c.name === channelData.name && c.type === channelData.type
                    );

                    let channel;
                    if (!existingChannel) {
                        channel = await guild.channels.create({
                            name: channelData.name,
                            type: channelData.type,
                            parent: category,
                            topic: channelData.topic,
                            reason: 'Configuration automatique du concessionnaire'
                        });
                        console.log(`     ✅ Canal créé: #${channelData.name}`);
                    } else {
                        channel = existingChannel;
                        console.log(`     ℹ️ Canal existant: #${channelData.name}`);
                    }

                    // Configurer les permissions
                    await this.setupChannelPermissions(channel, channelData.permissions);
                    
                    this.createdChannels.set(channelData.key, channel);
                    
                } catch (error) {
                    console.error(`     ❌ Erreur création canal ${channelData.name}:`, error.message);
                }
            }
        }
    }

    /**
     * Configurer les permissions d'un canal
     */
    async setupChannelPermissions(channel, permissions) {
        for (const [roleKey, perms] of Object.entries(permissions)) {
            try {
                let target;
                
                if (roleKey === 'everyone') {
                    target = channel.guild.roles.everyone;
                } else if (roleKey === 'bot') {
                    target = this.createdRoles.get('BOT');
                } else {
                    target = this.createdRoles.get(roleKey.toUpperCase());
                }

                if (target) {
                    await channel.permissionOverwrites.edit(target, perms);
                }
            } catch (error) {
                console.error(`   ⚠️ Erreur permission ${roleKey} pour #${channel.name}:`, error.message);
            }
        }
    }

    /**
     * Configurer les permissions globales
     */
    async setupPermissions(guild) {
        console.log('🔒 Configuration des permissions...');
        
        // Permissions générales déjà configurées lors de la création des rôles
        console.log('   ✅ Permissions configurées');
    }

    /**
     * Créer le message de bienvenue dans le canal catalogue
     */
    async createWelcomeMessage(guild) {
        console.log('💬 Création du message de bienvenue...');
        
        const catalogueChannel = this.createdChannels.get('CATALOGUE');
        if (!catalogueChannel) return;

        try {
            const embed = EmbedUtils.createInfoEmbed(
                `🏪 Bienvenue au Concessionnaire ${process.env.SERVER_NAME || 'NEW LIFE RP'}`,
                `**Votre concessionnaire automobile de confiance !**\n\n` +
                `🚗 **Catalogue interactif** - Tapez \`/catalogue\` pour voir tous nos véhicules\n` +
                `💰 **Prix compétitifs** - Les meilleurs prix du marché\n` +
                `📦 **Stock en temps réel** - Synchronisé avec notre serveur\n` +
                `💼 **Service professionnel** - Équipe de vendeurs qualifiés\n\n` +
                `**🎯 Comment acheter un véhicule :**\n` +
                `1️⃣ Utilisez \`/catalogue\` pour voir nos véhicules\n` +
                `2️⃣ Contactez un <@&${this.createdRoles.get('VENDEUR')?.id || 'vendeur'}>\n` +
                `3️⃣ Finalisez votre achat\n` +
                `4️⃣ Récupérez votre véhicule en jeu !\n\n` +
                `*Bot développé avec ❤️ pour la communauté ${process.env.SERVER_NAME || 'NEW LIFE RP'}*`
            );

            embed.setThumbnail('https://cdn-icons-png.flaticon.com/512/3774/3774299.png');
            embed.setImage('https://i.imgur.com/placeholder.png'); // Tu peux remplacer par une image de ton concessionnaire

            await catalogueChannel.send({ 
                embeds: [embed]
            });

            console.log('   ✅ Message de bienvenue créé');
            
        } catch (error) {
            console.error('   ❌ Erreur création message de bienvenue:', error.message);
        }
    }

    /**
     * Mettre à jour le fichier .env avec les IDs des canaux et rôles
     */
    async updateEnvFile() {
        console.log('📝 Mise à jour du fichier .env...');
        
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const envPath = path.join(process.cwd(), '.env');
            
            let envContent = await fs.readFile(envPath, 'utf8');
            
            // Mettre à jour les IDs des canaux
            const channelUpdates = {
                'CHANNEL_CATALOGUE': this.createdChannels.get('CATALOGUE')?.id || '',
                'CHANNEL_LOGS': this.createdChannels.get('LOGS')?.id || '',
                'CHANNEL_STOCK': this.createdChannels.get('STOCK')?.id || ''
            };
            
            // Mettre à jour les IDs des rôles  
            const roleUpdates = {
                'ROLE_VENDEUR': this.createdRoles.get('VENDEUR')?.id || '',
                'ROLE_PATRON': this.createdRoles.get('PATRON')?.id || '',
                'ROLE_CLIENT': this.createdRoles.get('CLIENT')?.id || ''
            };
            
            const allUpdates = { ...channelUpdates, ...roleUpdates };
            
            for (const [key, value] of Object.entries(allUpdates)) {
                const regex = new RegExp(`^${key}=.*$`, 'm');
                if (regex.test(envContent)) {
                    envContent = envContent.replace(regex, `${key}=${value}`);
                } else {
                    envContent += `\n${key}=${value}`;
                }
            }
            
            await fs.writeFile(envPath, envContent);
            console.log('   ✅ Fichier .env mis à jour');
            
        } catch (error) {
            console.error('   ❌ Erreur mise à jour .env:', error.message);
        }
    }

    /**
     * Obtenir un résumé de la configuration
     */
    getSummary() {
        return {
            setupComplete: this.setupComplete,
            channelsCreated: this.createdChannels.size,
            rolesCreated: this.createdRoles.size,
            channels: Array.from(this.createdChannels.entries()).map(([key, channel]) => ({
                key,
                name: channel.name,
                id: channel.id
            })),
            roles: Array.from(this.createdRoles.entries()).map(([key, role]) => ({
                key,
                name: role.name,
                id: role.id
            }))
        };
    }
}

module.exports = ServerSetup;
