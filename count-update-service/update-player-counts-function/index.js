const config = require('./config');
console.log(config);

const axios = require('axios');
const http = require('http');
const https = require('https');
const AWS = require('aws-sdk');
const middy = require('@middy/core');
const secretsManager = require('@middy/secrets-manager');
const { startOfHour } = require('date-fns');

const insertApps = require('./insertApps');
const insertCounts = require('./insertCounts');

const initDb = require(config.aws.ormLayerPath);
let db = null;

AWS.config.update({ region: 'us-east-1' });

const updateTime = startOfHour(new Date());

// Increase the max sockets so Lambda will fulfill more requests in parallel
const agentConfig = { maxSocket: 1000 };
const agent = process.env.IS_OFFLINE || process.env.IS_LOCAL
  ? new http.Agent(agentConfig)
  : new https.Agent(agentConfig);

const lambdaConfig = { httpOptions: { agent } };
if (config.environment === 'local') {
  console.log('running offline');
  lambdaConfig.endpoint = new AWS.Endpoint(config.aws.lambdaEndpoint);
  lambdaConfig.region = 'us-east-1';
}

const lambda = new AWS.Lambda(lambdaConfig);

const getAppList = async () => {
  try {
    const res = await axios.get(
      'https://api.steampowered.com/ISteamApps/GetAppList/v2/',
      // Adding or removing this format param this to randomly return 
      // an empty list. Unsure why.
      { params: { format: 'json' } }
    );
    const appsById = res.data.applist.apps.reduce((acc, curr) => {
      acc[curr.appid] = curr;
      return acc;
    }, {});
    const apps = Object
      .keys(appsById)
      .map(appId => appsById[appId]);
    return apps;
  } catch (err) {
    console.log(err);
  }
};

const getPlayerCounts = async (apps) => {
  const groupSize = Math.ceil(apps.length / config.numUpdateLambdas);
  let appGroups = [...Array(config.numUpdateLambdas)]
  appGroups = appGroups
    .map((appGroup, index) => apps.slice(index * groupSize, (index * groupSize) + groupSize))
    .filter(group => group && group.length > 0);
  const appCounts = [];
  const errorsByCode = { count: 0 };
  const badAppGroup = appGroups.find(appGroup => appGroup === undefined);
  if (badAppGroup) {
    console.log(badAppGroup);
    throw new Error('Something is undefined');
  }

  const responses = await Promise.all(appGroups.map((appGroup) => 
    invokeLambda({
      functionName: config.aws.getPlayerCountsFunctionName,
      payload: { 
        apps: appGroup,
        reqsPerSecond: config.reqsPerSecondMax
      }
    })
  ));

  responses.forEach(response => {
      const payload = JSON.parse(response.Payload);
      if (payload && payload.body) {
        const body = JSON.parse(payload.body);
        appCounts.push(...body.playerCounts.filter(count => !count.error));
        body.playerCounts
          .filter(count => Boolean(count.error && count.errorStatus))
          .forEach(count => {
            const status = count.errorStatus;
            errorsByCode[status] = errorsByCode[status] 
              ? errorsByCode[status].concat(count) 
              : [count];
            errorsByCode.count++;
          });
      } else {
        console.error('error response: ', response);
      }
    });

  console.log(`total count: ${appCounts.length + errorsByCode.count}`);
  console.log(`total error count: ${errorsByCode.count}`);
  Object.keys(errorsByCode)
    .filter(key => key !== 'count')
    .forEach(key => {
      console.log(`total ${key} error count: ${errorsByCode[key].length}`)
    });

  return { apps: appCounts, errorsByCode };
};

const runUpdate = async (appList, retries = 10) => {
  const playerCounts = await getPlayerCounts(appList);
  const { apps, errorsByCode } = playerCounts;
  const retryCodes = [403, 429];
  const retryErrors = retryCodes
    .map(code => errorsByCode[code] || [])
    .reduce((acc, curr) => acc.concat(curr), []);
  if (retryErrors.length > 0 && retries > 0) {
    const { 
      apps: retryApps, 
      errorsByCode: retryErrorsByCode
    } = await runUpdate(retryErrors.map(e => ({ appid: e.appid, name: e.name })), retries - 1);
    apps.push(...retryApps);
    Object.keys(retryErrorsByCode)
      .filter(code => retryCodes.indexOf(code) === -1 && code !== 'count')
      .forEach(code => {
        if (!errorsByCode[code]) {
          errorsByCode[code] = [];
        }
        errorsByCode[code].push(...retryErrorsByCode[code]);
    });
  }
  return { apps, errorsByCode };
};

const updateDatabaseCounts = async (playerCounts) => {
  try {
    const items = playerCounts.apps.concat(playerCounts.errorsByCode[404] || []);
    const newApps =  items.map(({ appid: id, name, count: current }) => ({ id, name, current }));
    const newCounts = items.map(({ count, appid: appId }) => ({ count, appId, createdAt: updateTime }));

    await insertApps(db, newApps);
    await insertCounts(db, newCounts);
  } catch(err) {
    console.log('could not update apps and counts!', err);
    throw err;
  }
};

const invokeLambda = ({ functionName, payload, invocationType = 'RequestResponse' }) => {
  return lambda.invoke({
    FunctionName: functionName,
    Payload: JSON.stringify(payload),
    InvocationType: invocationType
  }).promise();
}

const start = async (event, context) => {
  const startTime = Date.now();
  try {
    const { 
      host = 'localhost', 
      username = 'postgres', 
      password = 'password12345' 
    } = context.DB_CREDENTIALS || {};
    db = await initDb('postgres', username, password, { host });

    const appList = await getAppList();
    const playerCounts = await runUpdate(appList);
    await updateDatabaseCounts(playerCounts);
    await invokeLambda({
      functionName: 'dev-update-app-stats-function',
      invocationType: 'Event'
    });

    console.info(`done in ${Date.now() - startTime}ms`);
  } catch (e) {
    console.error(e);
  } finally {
    await db.sequelize.close();
    return { statusCode: 200 };
  }
};

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