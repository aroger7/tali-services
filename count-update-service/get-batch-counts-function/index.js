/* Amplify Params - DO NOT EDIT
	ENV
	REGION
Amplify Params - DO NOT EDIT */
'use strict';
const axios = require('axios');

module.exports.handler = (event, context, callback) => {
  console.log(`reqs per second: ${event.reqsPerSecond}`)
  const { apps, reqsPerSecond = 20 } = event;
  const queued = apps.concat();
  console.log('queued: ', queued.length);
  const inProgress = [];
  const completed = [];
  const intervalId = setInterval(() => {
    if (queued.length === 0 && inProgress.length === 0) {
      clearInterval(intervalId);
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({ playerCounts: completed })
      });
    }

    if (queued.length > 0) {
      const newGroup = queued.splice(0, reqsPerSecond);
      inProgress.push(...newGroup);

      newGroup.map(app => {
        return getPlayerCount(app.appid)
          .then((count) => {
            inProgress.splice(inProgress.findIndex(ip => ip.appid === app.appid), 1)
            completed.push({ ...app, count });
          })
          .catch((err) => {
            console.log(`Couldn't get ${app.appid} player count: ${err.message}`);
            inProgress.splice(inProgress.findIndex(ip => ip.appid === app.appid), 1)
            completed.push({ ...app, error: err, errorStatus: err.response.status });
          })
      });

    }
  }, 1000);
};

const getPlayerCount = async (appid) => {
  if (process.env.IS_OFFLINE) {
    const min = 0;
    const max = 500000;
    const count = await new Promise((resolve) => {
      setTimeout(() => resolve(Math.floor(Math.random() * (max - min) + min), 500));
    });
    return count;
  } else {
    const url = 'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1';
    const params = { appid };
    const res = await axios.get(url, { params });
    return res.data.response.player_count >= 0
      ? res.data.response.player_count
      : null;
  }
};
