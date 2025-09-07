@echo off
echo ================================
echo  Bot Concessionnaire FiveM
echo ================================
echo.

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Node.js n'est pas installé ou n'est pas dans le PATH
    echo Veuillez installer Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)

REM Vérifier si les dépendances sont installées
if not exist "node_modules" (
    echo Installation des dépendances...
    npm install
    echo.
)

REM Vérifier la configuration
echo Vérification de la configuration...
node check-config.js
if errorlevel 1 (
    echo.
    echo ERREUR: Configuration incomplète !
    echo Veuillez consulter DEMARRAGE_RAPIDE.md pour configurer le bot.
    echo.
    pause
    exit /b 1
)

REM Déployer les commandes
echo Déploiement des commandes Discord...
node deploy-commands.js
if errorlevel 1 (
    echo.
    echo ERREUR: Impossible de déployer les commandes !
    echo Vérifiez votre token et les IDs dans le fichier .env
    echo.
    pause
    exit /b 1
)
echo.

REM Démarrer le bot
echo Démarrage du bot...
echo ⚡ Le bot va configurer automatiquement votre serveur Discord !
echo 📱 Vérifiez votre serveur Discord dans quelques secondes...
echo.
node index.js
