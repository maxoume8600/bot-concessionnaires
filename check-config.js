// Script de vérification de la configuration
require('dotenv').config();

console.log('🔍 Vérification de la configuration du Bot Concessionnaire\n');

// Vérifications des variables d'environnement
const requiredEnvVars = [
    'DISCORD_TOKEN',
    'CLIENT_ID', 
    'GUILD_ID'
];

const optionalEnvVars = [
    'FIVEM_SERVER_IP',
    'FIVEM_SERVER_PORT',
    'SERVER_NAME',
    'DEVISE',
    'TVA'
];

let errors = 0;
let warnings = 0;

console.log('📋 Variables d\'environnement requises:');
requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value === `TON_${varName}_ICI` || value.includes('TON_')) {
        console.log(`   ❌ ${varName}: Manquant ou non configuré`);
        errors++;
    } else {
        // Masquer le token pour la sécurité
        const displayValue = varName === 'DISCORD_TOKEN' ? 
            value.substring(0, 10) + '...' : value;
        console.log(`   ✅ ${varName}: ${displayValue}`);
    }
});

console.log('\n📋 Variables d\'environnement optionnelles:');
optionalEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
        console.log(`   ⚠️ ${varName}: Non configuré (optionnel)`);
        warnings++;
    } else {
        console.log(`   ✅ ${varName}: ${value}`);
    }
});

// Vérifier la structure des fichiers
console.log('\n📁 Structure des fichiers:');
const fs = require('fs');
const requiredFiles = [
    'package.json',
    'index.js', 
    'deploy-commands.js',
    '.env',
    'commands/catalogue.js',
    'commands/vendre.js',
    'commands/setup.js',
    'commands/sync.js',
    'events/ready.js',
    'events/interactionCreate.js',
    'utils/embeds.js',
    'utils/serverSetup.js',
    'utils/fivemSync.js'
];

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`   ✅ ${file}`);
    } else {
        console.log(`   ❌ ${file}: Manquant`);
        errors++;
    }
});

// Vérifier les dépendances
console.log('\n📦 Dépendances Node.js:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['discord.js', 'dotenv'];
    
    requiredDeps.forEach(dep => {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
            console.log(`   ✅ ${dep}: ${packageJson.dependencies[dep]}`);
        } else {
            console.log(`   ❌ ${dep}: Manquant dans package.json`);
            errors++;
        }
    });
    
    if (fs.existsSync('node_modules')) {
        console.log('   ✅ node_modules: Installé');
    } else {
        console.log('   ❌ node_modules: Lancer "npm install"');
        errors++;
    }
} catch (error) {
    console.log('   ❌ Erreur lecture package.json:', error.message);
    errors++;
}

// Test de connexion Discord (basique)
console.log('\n🔗 Test de validation Discord:');
if (process.env.DISCORD_TOKEN && !process.env.DISCORD_TOKEN.includes('TON_')) {
    // Vérifier le format du token Discord
    const tokenRegex = /^[A-Za-z0-9\.\-_]{70,}$/;
    if (tokenRegex.test(process.env.DISCORD_TOKEN)) {
        console.log('   ✅ Format du token Discord valide');
    } else {
        console.log('   ❌ Format du token Discord invalide');
        errors++;
    }
} else {
    console.log('   ❌ Token Discord manquant');
    errors++;
}

// Test de l'ID client
if (process.env.CLIENT_ID && !process.env.CLIENT_ID.includes('TON_')) {
    const idRegex = /^\d{17,19}$/;
    if (idRegex.test(process.env.CLIENT_ID)) {
        console.log('   ✅ Format du CLIENT_ID valide');
    } else {
        console.log('   ❌ Format du CLIENT_ID invalide (doit être un nombre de 17-19 chiffres)');
        errors++;
    }
}

// Test de l'ID du serveur
if (process.env.GUILD_ID && !process.env.GUILD_ID.includes('TON_')) {
    const idRegex = /^\d{17,19}$/;
    if (idRegex.test(process.env.GUILD_ID)) {
        console.log('   ✅ Format du GUILD_ID valide');
    } else {
        console.log('   ❌ Format du GUILD_ID invalide (doit être un nombre de 17-19 chiffres)');
        errors++;
    }
}

// Test de connexion FiveM (si configuré)
if (process.env.FIVEM_SERVER_IP) {
    console.log('\n🎮 Test de connexion FiveM:');
    console.log(`   ℹ️ Serveur configuré: ${process.env.FIVEM_SERVER_IP}:${process.env.FIVEM_SERVER_PORT || '30120'}`);
    console.log('   💡 Utilisez "node test-sync.js" pour tester la connexion FiveM');
}

// Résumé final
console.log('\n' + '='.repeat(50));
console.log('📊 RÉSUMÉ DE LA CONFIGURATION');
console.log('='.repeat(50));

if (errors === 0) {
    console.log('🎉 CONFIGURATION PARFAITE !');
    console.log('✅ Toutes les vérifications sont passées');
    console.log('🚀 Vous pouvez démarrer le bot avec: npm start');
    if (warnings > 0) {
        console.log(`⚠️ ${warnings} avertissement(s) (fonctionnalités optionnelles)`);
    }
} else {
    console.log(`❌ ${errors} ERREUR(S) DÉTECTÉE(S)`);
    console.log('🔧 Corrigez les erreurs ci-dessus avant de démarrer le bot');
    
    console.log('\n💡 SOLUTIONS RAPIDES:');
    if (process.env.DISCORD_TOKEN?.includes('TON_')) {
        console.log('   • Remplacez DISCORD_TOKEN par votre vrai token Discord');
    }
    if (process.env.CLIENT_ID?.includes('TON_')) {
        console.log('   • Remplacez CLIENT_ID par l\'ID de votre application Discord');
    }
    if (process.env.GUILD_ID?.includes('TON_')) {
        console.log('   • Remplacez GUILD_ID par l\'ID de votre serveur Discord');
    }
    if (!fs.existsSync('node_modules')) {
        console.log('   • Lancez "npm install" pour installer les dépendances');
    }
}

console.log('\n📚 GUIDES DISPONIBLES:');
console.log('   • DEMARRAGE_RAPIDE.md - Configuration en 5 minutes');
console.log('   • SYNC_GUIDE.md - Configuration FiveM'); 
console.log('   • README.md - Documentation complète');

console.log('\n🆘 BESOIN D\'AIDE?');
console.log('   • Vérifiez que le bot a les permissions Administrator');
console.log('   • Activez le mode développeur dans Discord'); 
console.log('   • Consultez les guides de configuration');

process.exit(errors > 0 ? 1 : 0);
