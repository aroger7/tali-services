const { subMonths, startOfMonth, getYear, getMonth, format } = require('date-fns');

module.exports = async ({ sequelize }) => {  
  const now = new Date();
  const sqlNow = format(now, 'yyyy-MM-dd HH:mm:ss');
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(thisMonthStart, 1));
  const thisMonthYear = getYear(thisMonthStart);
  const thisMonthMonth = getMonth(thisMonthStart) + 1;
  const lastMonthYear = getYear(lastMonthStart);
  const lastMonthMonth = getMonth(lastMonthStart) + 1;
  
  console.log('updating monthly stats');
  await sequelize.query(`
    INSERT INTO app_months (app_id, year, month, average, peak, gain, percent_gain, created_at, updated_at)
      SELECT
        app_days.app_id AS app_id,
        ${thisMonthYear} AS year,
        ${thisMonthMonth} AS month,
        COALESCE(AVG(app_days.average), 0) AS average,
        COALESCE(MAX(app_days.peak), 0) AS peak,
        COALESCE(AVG(app_days.average), 0) - COALESCE(app_months.average, 0) AS gain,
        CASE WHEN COALESCE(app_months.average, 0) < 1 THEN NULL ELSE 100 * (COALESCE(AVG(app_days.average), 0) - app_months.average) / app_months.average END AS percent_gain,
        '${sqlNow}' AS created_at,
        '${sqlNow}' AS updated_at
      FROM app_days
      FULL JOIN app_months
        ON app_months.app_id=app_days.app_id AND app_months.year=${lastMonthYear} AND app_months.month=${lastMonthMonth}
      WHERE app_days.year=${thisMonthYear} AND app_days.month=${thisMonthMonth}
      GROUP BY app_days.app_id, app_months.average
    ON CONFLICT (app_id, year, month) DO UPDATE SET
      average=EXCLUDED.average,
      peak=EXCLUDED.peak,
      gain=EXCLUDED.gain,
      percent_gain=EXCLUDED.percent_gain,
      updated_at='${sqlNow}'
  `);
  console.log('monthly stats successfully updated');
}