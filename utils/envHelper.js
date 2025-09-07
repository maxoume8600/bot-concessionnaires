function getDiscordId(envVar) {
    if (!envVar) return null;
    try {
        // Nettoyage de la valeur
        const cleaned = envVar.toString().trim();
        if (!cleaned) return null;
        
        // Validation que c'est un nombre valide
        if (!/^\d+$/.test(cleaned)) return null;
        
        return cleaned;
    } catch (error) {
        console.error(`Erreur lors de la lecture de l'ID Discord: ${error}`);
        return null;
    }
}

module.exports = {
    getDiscordId
};
