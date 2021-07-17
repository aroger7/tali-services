const { subYears, startOfYear, getYear, format } = require('date-fns');

module.exports = async ({ sequelize }) => {  
  const now = new Date();
  const sqlNow = format(now, 'yyyy-MM-dd HH:mm:ss');
  const thisYearStart = startOfYear(now);
  const lastYearStart = startOfYear(subYears(thisYearStart, 1));
  const thisYearYear = getYear(thisYearStart);
  const lastYearYear = getYear(lastYearStart);

  console.log('updating yearly stats');
  await sequelize.query(`
    INSERT INTO app_years (app_id, year, average, peak, gain, percent_gain, created_at, updated_at)
      SELECT
        app_months.app_id AS app_id,
        ${thisYearYear} AS year,
        COALESCE(AVG(app_months.average), 0) AS average,
        COALESCE(MAX(app_months.peak), 0) AS peak,
        COALESCE(AVG(app_months.average), 0) - COALESCE(app_years.average, 0) AS gain,
        CASE WHEN COALESCE(app_years.average, 0) < 1 THEN NULL ELSE ROUND(100 * (COALESCE(AVG(app_months.average), 0) - app_years.average) / app_years.average, 2) END AS percent_gain,
        '${sqlNow}' AS created_at,
        '${sqlNow}' AS updated_at
      FROM app_months
      FULL JOIN app_years
        ON app_years.app_id=app_months.app_id AND app_years.year=${lastYearYear}
      WHERE app_months.year=${thisYearYear}
      GROUP BY app_months.app_id, app_years.average
    ON CONFLICT (app_id, year) DO UPDATE SET
      average=EXCLUDED.average,
      peak=EXCLUDED.peak,
      gain=EXCLUDED.gain,
      percent_gain=EXCLUDED.percent_gain,
      updated_at='${sqlNow}'
  `);
  console.log('yearly stats successfully updated');
}