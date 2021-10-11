'use strict';
const axios = require('axios');
const getArrayChunks = require('../util/getArrayChunks');

module.exports.handler = async (event, context) => {
  const { apps, reqsPerSecond = 20 } = event;
  const queued = apps.concat();
  try { 
    const tasks = getArrayChunks(queued, reqsPerSecond)
      .map((appGroup, i) => new Promise((resolve) => {
        setTimeout(async () => {
          const groupCounts = await getCountsForAppGroup(appGroup);
          resolve(groupCounts);
        }, 1000 * i);
      }));

    const playerCounts = (await Promise.all(tasks)).flat();
    return {
      statusCode: 200,
      body: JSON.stringify({ playerCounts })
    }
  }
  catch (err) {
    console.error('batch count function error: ', err);
    return {
      statusCode: 500,
      body: JSON.stringify(err)
    }
  }
};

const getCountsForAppGroup = async (appGroup) => {
  const tasks = appGroup.map(async app => {
    try {
      const count = await getPlayerCount;
      return { ...app, count };
    } catch (err) {
      return { ...app, errorStatus: err?.response?.status };
    }
  });
  return Promise.all(tasks);
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
    const res = await axios.get(url, { params, timeout: 2000 });
    return res.data?.response?.player_count >= 0
      ? res.data.response.player_count
      : null;
  }
};
