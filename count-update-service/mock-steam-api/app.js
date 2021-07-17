const express = require('express');
const app = express();
const port = 3000;

app.get('/playercount', (req, res) => {
  const min = 0;
  const max = 500000;
  const count = Math.floor(Math.random() * (max - min) + min);
  res.json({
    response: {
      player_count: count,
      result: 1
    }
  });
})

module.exports = app;