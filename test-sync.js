// Script de test pour la synchronisation FiveM
const FiveMSync = require('./utils/fivemSync');
require('dotenv').config();

// Mock client pour les tests
const mockClient = {
    vehicules: new Map(),
    channels: {
        cache: new Map()
    }
};

async function testSync() {
    console.log('🧪 Test de synchronisation FiveM\n');
    
    // Vérifier la configuration
    console.log('📋 Configuration:');
    console.log(`   IP: ${process.env.FIVEM_SERVER_IP || 'Non configurée'}`);
    console.log(`   Port: ${process.env.FIVEM_SERVER_PORT || '30120'}`);
    console.log(`   Endpoint: ${process.env.FIVEM_API_ENDPOINT || '/vehicles'}`);
    console.log(`   Intervalle: ${(process.env.SYNC_INTERVAL || 300000) / 1000}s\n`);
    
    if (!process.env.FIVEM_SERVER_IP) {
        console.log('❌ Veuillez configurer FIVEM_SERVER_IP dans le fichier .env');
        console.log('   Exemple: FIVEM_SERVER_IP=192.168.1.100\n');
        return;
    }
    
    // Créer l'instance de synchronisation
    const sync = new FiveMSync(mockClient);
    
    try {
        console.log('🔄 Test de connexion au serveur...\n');
        
        // Test de récupération des données
        const vehicules = await sync.fetchVehiclesFromServer();
        
        console.log(`✅ Connexion réussie !`);
        console.log(`📊 ${vehicules.length} véhicule(s) récupéré(s):\n`);
        
        vehicules.forEach((vehicule, index) => {
            console.log(`   ${index + 1}. ${vehicule.nom}`);
            console.log(`      ID: ${vehicule.id}`);
            console.log(`      Prix: ${vehicule.prix.toLocaleString('fr-FR')} ${process.env.DEVISE || '€'}`);
            console.log(`      Stock: ${vehicule.stock}`);
            console.log(`      Catégorie: ${vehicule.categorie}\n`);
        });
        
        console.log('🎉 Test de synchronisation réussi !');
        console.log('   Tu peux maintenant démarrer le bot Discord avec ces paramètres.\n');
        
    } catch (error) {
        console.log('❌ Erreur de connexion:');
        console.log(`   ${error.message}\n`);
        
        console.log('🔧 Solutions possibles:');
        console.log('   1. Vérifie que ton serveur FiveM est démarré');
        console.log('   2. Vérifie l\'IP et le port dans le fichier .env');
        console.log('   3. Teste manuellement: http://TON_IP:30120/vehicles');
        console.log('   4. Assure-toi que la resource API est installée\n');
        
        // Test de ping simple
        console.log('🔍 Test de connectivité basique...');
        const http = require('http');
        const url = `http://${process.env.FIVEM_SERVER_IP}:${process.env.FIVEM_SERVER_PORT || '30120'}`;
        
        const req = http.get(url, { timeout: 5000 }, (res) => {
            console.log(`✅ Serveur accessible (Status: ${res.statusCode})`);
        });
        
        req.on('timeout', () => {
            console.log('❌ Timeout - Le serveur ne répond pas');
            req.destroy();
        });
        
        req.on('error', (err) => {
            console.log(`❌ Erreur de connexion: ${err.message}`);
        });
    }
}

// Exécuter le test
testSync().catch(console.error);
