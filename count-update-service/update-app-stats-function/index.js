const config = require('./config');

const middy = require('@middy/core');
const secretsManager = require('@middy/secrets-manager');

const updateAllTimeStats = require('./updateAllTimeStats');
const updateDailyStats = require('./updateDailyStats');
const updateMonthlyStats = require('./updateMonthlyStats');
const updateYearlyStats = require('./updateYearlyStats');

const initDb = require(config.aws.ormLayerPath);
let db = null;

const start = async (event, context) => {
  let sequelize = null;
  try {
    const { 
      host = 'localhost', 
      username = 'postgres', 
      password = 'password12345' 
    } = context.DB_CREDENTIALS || {};
    db = await initDb('postgres', username, password, { host });
    sequelize = db?.sequelize;

    await updateDailyStats(sequelize);
    await updateMonthlyStats(sequelize);
    await updateYearlyStats(sequelize);
    await updateAllTimeStats(sequelize);
  } catch (err) {
    console.error(err);
  } finally {
    sequelize?.close();
    return { statusCode: 200 };
  }
}

const fetchData = {};
if (config.db.secretName && config.environment !== 'local') {
  fetchData.DB_CREDENTIALS = config.db.secretName;
}

const handler = middy(start)
  .use(secretsManager({
    awsClientOptions: {
      region: 'us-east-1'
    },
    fetchData,
    setToContext: true
  }));

exports.handler = handler;