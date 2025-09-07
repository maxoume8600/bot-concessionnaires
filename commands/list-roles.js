const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list-roles')
        .setDescription('📋 Affiche tous les rôles existants sur le serveur avec leurs permissions'),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({
                content: '❌ Vous devez avoir la permission "Gérer les rôles" pour utiliser cette commande.',
                flags: [4096] // EPHEMERAL
            });
        }

        try {
            const guild = interaction.guild;
            const roles = Array.from(guild.roles.cache.values())
                .filter(role => role.name !== '@everyone')
                .sort((a, b) => b.position - a.position); // Trier par position (plus haut en premier)

            const embed = new EmbedBuilder()
                .setTitle('📋 Rôles du Serveur')
                .setDescription(`Liste complète des ${roles.length} rôles sur **${guild.name}**`)
                .setColor('#3498DB')
                .setTimestamp();

            // Grouper les rôles par catégories
            const roleCategories = {
                administration: [],
                direction: [],
                staff: [],
                membres: [],
                bots: [],
                autres: []
            };

            roles.forEach(role => {
                const roleName = role.name.toLowerCase();
                const roleInfo = {
                    name: role.name,
                    id: role.id,
                    color: role.hexColor,
                    members: role.members.size,
                    permissions: this.getMainPermissions(role),
                    managed: role.managed,
                    position: role.position
                };

                if (role.managed) {
                    roleCategories.bots.push(roleInfo);
                } else if (role.permissions.has(PermissionFlagsBits.Administrator)) {
                    roleCategories.administration.push(roleInfo);
                } else if (roleName.includes('patron') || roleName.includes('directeur') || 
                          roleName.includes('gérant') || roleName.includes('boss')) {
                    roleCategories.direction.push(roleInfo);
                } else if (roleName.includes('vendeur') || roleName.includes('staff') || 
                          roleName.includes('modérateur') || roleName.includes('helper')) {
                    roleCategories.staff.push(roleInfo);
                } else if (roleName.includes('client') || roleName.includes('membre') || 
                          roleName.includes('visiteur')) {
                    roleCategories.membres.push(roleInfo);
                } else {
                    roleCategories.autres.push(roleInfo);
                }
            });

            // Ajouter les catégories à l'embed
            this.addRoleCategory(embed, '👑 Administration', roleCategories.administration);
            this.addRoleCategory(embed, '🏢 Direction', roleCategories.direction);
            this.addRoleCategory(embed, '💼 Staff', roleCategories.staff);
            this.addRoleCategory(embed, '👥 Membres', roleCategories.membres);
            this.addRoleCategory(embed, '🤖 Bots', roleCategories.bots);
            this.addRoleCategory(embed, '🎭 Autres', roleCategories.autres);

            // Ajouter un résumé
            embed.addFields({
                name: '📊 Résumé',
                value: `**Total:** ${roles.length} rôles\n**Membres:** ${roles.reduce((sum, r) => sum + r.members.size, 0)} attributions`,
                inline: false
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur liste rôles:', error);
            await interaction.reply({
                content: '❌ Erreur lors de la récupération des rôles: ' + error.message,
                flags: [4096]
            });
        }
    },

    addRoleCategory(embed, title, roles) {
        if (roles.length === 0) return;

        const roleList = roles
            .slice(0, 10) // Limiter à 10 pour éviter la limite Discord
            .map(role => {
                const colorIndicator = role.color !== '#000000' ? `🎨` : '';
                const memberCount = role.members > 0 ? `(${role.members})` : '';
                const permissions = role.permissions.length > 0 ? ` • ${role.permissions.slice(0, 2).join(', ')}` : '';
                
                return `${colorIndicator} **${role.name}** ${memberCount}${permissions}`;
            })
            .join('\n');

        if (roles.length > 10) {
            embed.addFields({
                name: title,
                value: roleList + `\n... et ${roles.length - 10} autres rôles`,
                inline: false
            });
        } else {
            embed.addFields({
                name: title,
                value: roleList,
                inline: false
            });
        }
    },

    getMainPermissions(role) {
        const permissions = [];
        
        if (role.permissions.has(PermissionFlagsBits.Administrator)) {
            permissions.push('Admin');
        } else {
            if (role.permissions.has(PermissionFlagsBits.ManageGuild)) permissions.push('Gérer Serveur');
            if (role.permissions.has(PermissionFlagsBits.ManageChannels)) permissions.push('Gérer Canaux');
            if (role.permissions.has(PermissionFlagsBits.ManageRoles)) permissions.push('Gérer Rôles');
            if (role.permissions.has(PermissionFlagsBits.ManageMessages)) permissions.push('Gérer Messages');
            if (role.permissions.has(PermissionFlagsBits.KickMembers)) permissions.push('Exclure');
            if (role.permissions.has(PermissionFlagsBits.BanMembers)) permissions.push('Bannir');
        }

        return permissions;
    }
};
