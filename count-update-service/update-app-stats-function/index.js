const config = require('./config');

const middy = require('@middy/core');
const secretsManager = require('@middy/secrets-manager');

const updateAllTimeStats = require('./updateAllTimeStats');
const updateDailyStats = require('./updateDailyStats');
const updateMonthlyStats = require('./updateMonthlyStats');
const updateYearlyStats = require('./updateYearlyStats');

const initDb = require(config.ORM_LAYER_PATH);

const start = async (event, context) => {
  try {
    const { 
      host = 'localhost', 
      username = 'postgres', 
      password = 'password12345' 
    } = context.DB_CREDENTIALS || {};
    const { sequelize } = await initDb('postgres', username, password, { host });

    console.log("daily");
    await updateDailyStats(sequelize);
    console.log("monthly");
    await updateMonthlyStats(sequelize);
    console.log("yearly");
    await updateYearlyStats(sequelize);
    console.log("all time");
    await updateAllTimeStats(sequelize);
  } catch (err) {
    console.error(err);
  }
}

const secrets = {};
if (!process.env.IS_OFFLINE) {
  secrets.DB_CREDENTIALS = config.DB_SECRET_NAME;
}

const handler = middy(start)
  .use(secretsManager({
    cache: true,
    region: 'us-east-1',
    secrets
  }));

exports.handler = handler;