const local = require('./local.js');
const development = require('./development.js');

const getConfig = () => {
  if (process.env.IS_OFFLINE || process.env.IS_LOCAL) {
    return local;
  }

  return development;
}

module.exports = getConfig();