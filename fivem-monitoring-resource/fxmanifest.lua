fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'Concessionnaire Monitoring API'
description 'API pour monitoring des vendeurs concessionnaire'
author 'Bot Concessionnaire'
version '1.0.0'

server_scripts {
    'server.lua'
}

-- Export des fonctions pour autres resources
exports {
    'getDealerPlayers',
    'getPlayerJob',
    'getPlayerData'
}
