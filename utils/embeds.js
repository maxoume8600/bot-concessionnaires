const { EmbedBuilder } = require('discord.js');

class EmbedUtils {
    static createSuccessEmbed(title, description) {
        return new EmbedBuilder()
            .setTitle(`✅ ${title}`)
            .setDescription(description)
            .setColor('#00FF00')
            .setTimestamp();
    }

    static createErrorEmbed(title, description) {
        return new EmbedBuilder()
            .setTitle(`❌ ${title}`)
            .setDescription(description)
            .setColor('#FF0000')
            .setTimestamp();
    }

    static createInfoEmbed(title, description) {
        const embed = new EmbedBuilder()
            .setTitle(`ℹ️ ${title}`)
            .setColor('#3498DB')
            .setTimestamp();
        
        if (description) {
            embed.setDescription(description);
        }
        
        return embed;
    }

    static createVehiculeEmbed(vehicule) {
        const embed = new EmbedBuilder()
            .setTitle(`🚗 ${vehicule.nom}`)
            .setColor('#FFD700')
            .addFields(
                { name: '🏷️ Marque', value: vehicule.marque, inline: true },
                { name: '💰 Prix', value: `${vehicule.prix.toLocaleString('fr-FR')} ${process.env.DEVISE || '€'}`, inline: true },
                { name: '📂 Catégorie', value: vehicule.categorie, inline: true },
                { name: '📦 Stock', value: `${vehicule.stock} disponible(s)`, inline: true }
            )
            .setTimestamp();

        if (vehicule.image) {
            embed.setImage(vehicule.image);
        }

        return embed;
    }
}

module.exports = EmbedUtils;
