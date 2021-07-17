const { subDays, startOfDay, getYear, getMonth, getDate, format } = require('date-fns');

module.exports = async ({ sequelize }) => {
  const now = new Date();
  const sqlNow = format(now, 'yyyy-MM-dd HH:mm:ss');
  const today = startOfDay(now);
  const sqlToday = format(today, 'yyyy-MM-dd HH:mm:ss');
  const yesterday = subDays(today, 1);
  const year = getYear(today);
  const month = getMonth(today) + 1;
  const day = getDate(today);
  const yesterdayYear = getYear(yesterday);
  const yesterdayMonth = getMonth(yesterday) + 1;
  const yesterdayDay = getDate(yesterday);

  console.log('updating daily stats');
  await sequelize.query(`
    INSERT INTO app_days (app_id, year, month, day, average, peak, gain, percent_gain, created_at, updated_at)
      SELECT
        player_counts.app_id AS app_id, 
        ${year} AS year, 
        ${month} AS month,
        ${day} AS day, 
        COALESCE(AVG(player_counts.count), 0) AS average,
        COALESCE(MAX(player_counts.count), 0) AS peak,
        COALESCE(AVG(player_counts.count), 0) - COALESCE(app_days.average, 0) AS gain,
        CASE app_days.average WHEN 0 THEN NULL ELSE 100 * (COALESCE(AVG(count), 0) - app_days.average) / app_days.average END AS percent_gain,
        '${sqlNow}' AS created_at,
        '${sqlNow}' AS updated_at
      FROM player_counts
      FULL JOIN app_days
        ON app_days.app_id=player_counts.app_id AND app_days.year=${yesterdayYear} AND app_days.month=${yesterdayMonth} AND app_days.day=${yesterdayDay}
      WHERE player_counts.created_at >= '${sqlToday}'
      GROUP BY player_counts.app_id, app_days.average
    ON CONFLICT (app_id, year, month, day) DO UPDATE SET
      average=EXCLUDED.average,
      peak=EXCLUDED.peak,
      gain=EXCLUDED.gain,
      percent_gain=EXCLUDED.percent_gain,
      updated_at='${sqlNow}'
  `);
  console.log('daily stats successfully updated');
}