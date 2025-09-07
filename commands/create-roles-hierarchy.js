const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-roles-hierarchy')
        .setDescription('👑 Crée la hiérarchie complète des rôles avec permissions')
        .addBooleanOption(option =>
            option.setName('reset')
                .setDescription('Supprime tous les rôles existants avant de les recréer')
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
            const reset = interaction.options.getBoolean('reset') || false;
            const guild = interaction.guild;

            // Définir la hiérarchie des rôles
            const roleHierarchy = [
                {
                    name: 'Directeur Général',
                    color: '#FF0000', // Rouge
                    permissions: [
                        PermissionFlagsBits.Administrator
                    ],
                    description: 'Accès complet au serveur'
                },
                {
                    name: 'Patron Concessionnaire',
                    color: '#FF6B35', // Orange-Rouge
                    permissions: [
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.ManageRoles,
                        PermissionFlagsBits.ManageMessages,
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageNicknames,
                        PermissionFlagsBits.KickMembers,
                        PermissionFlagsBits.MuteMembers
                    ],
                    description: 'Gestion complète du concessionnaire'
                },
                {
                    name: 'Chef des Ventes',
                    color: '#FFA500', // Orange
                    permissions: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.UseExternalEmojis,
                        PermissionFlagsBits.AddReactions
                    ],
                    description: 'Supervision des équipes de vente'
                },
                {
                    name: 'Vendeur Senior',
                    color: '#32CD32', // Vert clair
                    permissions: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.UseExternalEmojis,
                        PermissionFlagsBits.AddReactions
                    ],
                    description: 'Vendeur expérimenté avec privilèges étendus'
                },
                {
                    name: 'Vendeur',
                    color: '#00CED1', // Turquoise
                    permissions: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.UseExternalEmojis,
                        PermissionFlagsBits.AddReactions
                    ],
                    description: 'Vendeur standard'
                },
                {
                    name: 'Stagiaire',
                    color: '#87CEEB', // Bleu ciel
                    permissions: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AddReactions
                    ],
                    description: 'Apprenti vendeur en formation'
                },
                {
                    name: 'Responsable RH',
                    color: '#9370DB', // Violet moyen
                    permissions: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageNicknames,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.UseExternalEmojis,
                        PermissionFlagsBits.AddReactions
                    ],
                    description: 'Gestion des ressources humaines'
                },
                {
                    name: 'Client VIP',
                    color: '#FFD700', // Or
                    permissions: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.UseExternalEmojis,
                        PermissionFlagsBits.AddReactions,
                        PermissionFlagsBits.UseExternalStickers
                    ],
                    description: 'Client privilégié avec accès étendu'
                },
                {
                    name: 'Client',
                    color: '#4169E1', // Bleu royal
                    permissions: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AddReactions
                    ],
                    description: 'Client standard'
                },
                {
                    name: 'Visiteur',
                    color: '#808080', // Gris
                    permissions: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AddReactions
                    ],
                    description: 'Accès limité en lecture seule'
                }
            ];

            if (reset) {
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ Suppression des Rôles')
                    .setDescription('Suppression de tous les rôles existants...')
                    .setColor('#FF0000');
                
                await interaction.editReply({ embeds: [embed] });
                
                // Supprimer tous les rôles sauf @everyone et les rôles bot
                for (const [roleId, role] of guild.roles.cache) {
                    if (role.name !== '@everyone' && !role.managed && role.editable) {
                        try {
                            await role.delete('Réinitialisation des rôles');
                        } catch (error) {
                            console.error(`Impossible de supprimer le rôle ${role.name}:`, error);
                        }
                    }
                }
                
                // Attendre un peu pour éviter les rate limits
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            const embed = new EmbedBuilder()
                .setTitle('👑 Création de la Hiérarchie des Rôles')
                .setDescription('Création des rôles avec permissions appropriées...')
                .setColor('#00FF00')
                .setTimestamp();

            const createdRoles = [];
            const errors = [];

            // Créer les rôles dans l'ordre inverse (du plus bas au plus haut)
            for (let i = roleHierarchy.length - 1; i >= 0; i--) {
                const roleData = roleHierarchy[i];
                
                try {
                    // Vérifier si le rôle existe déjà
                    let existingRole = guild.roles.cache.find(r => 
                        r.name === roleData.name || 
                        r.name.toLowerCase().includes(roleData.name.toLowerCase().split(' ')[0])
                    );

                    if (existingRole && !reset) {
                        createdRoles.push(`🔄 **${roleData.name}** - Déjà existant`);
                        continue;
                    }

                    // Créer le nouveau rôle
                    const newRole = await guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        permissions: roleData.permissions,
                        reason: 'Configuration hiérarchie concessionnaire'
                    });

                    createdRoles.push(`✅ **${roleData.name}** - Créé avec succès`);
                    
                    // Attendre un peu pour éviter les rate limits
                    await new Promise(resolve => setTimeout(resolve, 500));

                } catch (error) {
                    console.error(`Erreur création rôle ${roleData.name}:`, error);
                    errors.push(`❌ **${roleData.name}** - ${error.message}`);
                }
            }

            // Mise à jour du fichier .env avec les nouveaux IDs de rôles
            await this.updateEnvWithRoleIds(guild);

            embed.addFields(
                { name: '📊 Résumé', value: `✅ **${createdRoles.length}** rôles traités\n❌ **${errors.length}** erreurs`, inline: false }
            );

            if (createdRoles.length > 0) {
                const rolesText = createdRoles.slice(0, 10).join('\n');
                if (createdRoles.length > 10) {
                    embed.addFields({ name: '🎭 Rôles Créés', value: rolesText + `\n... et ${createdRoles.length - 10} autres`, inline: false });
                } else {
                    embed.addFields({ name: '🎭 Rôles Créés', value: rolesText, inline: false });
                }
            }

            if (errors.length > 0) {
                embed.addFields({ name: '❌ Erreurs', value: errors.slice(0, 5).join('\n'), inline: false });
            }

            embed.addFields({
                name: '📋 Étapes Suivantes',
                value: '1️⃣ Utilisez `/setup-permissions` pour configurer les permissions des canaux\n2️⃣ Assignez manuellement les rôles aux membres\n3️⃣ Vérifiez que tout fonctionne correctement',
                inline: false
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur création rôles:', error);
            await interaction.editReply({
                content: '❌ Erreur lors de la création des rôles: ' + error.message
            });
        }
    },

    async updateEnvWithRoleIds(guild) {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            
            // Trouver les rôles importants
            const roles = {
                ROLE_PATRON: guild.roles.cache.find(r => 
                    r.name.includes('Patron') || r.name.includes('Directeur')
                )?.id,
                ROLE_VENDEUR: guild.roles.cache.find(r => 
                    r.name.includes('Vendeur') && !r.name.includes('Senior')
                )?.id,
                ROLE_CLIENT: guild.roles.cache.find(r => 
                    r.name === 'Client'
                )?.id,
                ROLE_VENDEUR_SENIOR: guild.roles.cache.find(r => 
                    r.name.includes('Vendeur Senior')
                )?.id,
                ROLE_CHEF_VENTES: guild.roles.cache.find(r => 
                    r.name.includes('Chef des Ventes')
                )?.id,
                ROLE_RH: guild.roles.cache.find(r => 
                    r.name.includes('RH')
                )?.id,
                ROLE_CLIENT_VIP: guild.roles.cache.find(r => 
                    r.name.includes('Client VIP')
                )?.id
            };

            const envPath = path.join(__dirname, '..', '.env');
            let envContent = await fs.readFile(envPath, 'utf8');
            
            // Mettre à jour les IDs des rôles dans le fichier .env
            for (const [key, id] of Object.entries(roles)) {
                if (id) {
                    const regex = new RegExp(`^${key}=.*$`, 'm');
                    if (envContent.match(regex)) {
                        envContent = envContent.replace(regex, `${key}=${id}`);
                    } else {
                        // Ajouter la ligne si elle n'existe pas
                        envContent += `\n${key}=${id}`;
                    }
                }
            }
            
            await fs.writeFile(envPath, envContent);
            console.log('✅ Fichier .env mis à jour avec les nouveaux IDs de rôles');

        } catch (error) {
            console.error('❌ Erreur mise à jour .env:', error);
        }
    }
};
