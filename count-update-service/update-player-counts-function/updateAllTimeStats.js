module.exports = async ({ sequelize }) => {  
  console.log('updating all time stats');
  await sequelize.query(`
    UPDATE apps
    SET (average, peak) = (
      SELECT
        AVG(average) AS average,
        MAX(peak) AS peak
      FROM app_years
      WHERE app_years.app_id=apps.id
      GROUP BY app_years.app_id
    )
  `);
  await sequelize.query(`
    UPDATE apps
    SET (average24_hours, peak24_hours) = (
      SELECT
        COALESCE(AVG(player_counts.count), 0) AS average24_hours,
        COALESCE(MAX(player_counts.count), 0) AS peak24_hours
      FROM player_counts
      WHERE player_counts.app_id=apps.id AND player_counts.created_at >= NOW() - INTERVAL '24 HOURS'
      GROUP BY player_counts.app_id
    )
  `);
  console.log('all time stats successfully updated');
}