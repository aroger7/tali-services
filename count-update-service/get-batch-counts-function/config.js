const config = {};

config.steamApiUrl = 'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1';
config.reqsPerSecondMax = parseInt(process.env.REQS_PER_SECOND) || 30;
config.environment = process.env.IS_OFFLINE || process.env.IS_LOCAL 
  ? "local"
  : process.env.NODE_ENV;

module.exports = config;