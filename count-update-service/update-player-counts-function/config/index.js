const getConfig = () => {
  if (process.env.IS_OFFLINE || process.env.IS_LOCAL) {
    return require('./local.js');
  }

  return require('./development.js');
}

module.exports = getConfig();