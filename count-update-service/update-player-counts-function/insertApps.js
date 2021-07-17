module.exports = async (db, apps) => {
  console.log('inserting apps');
  await db.models.App.bulkCreate(apps, {
    ignoreDuplicate: false, 
    updateOnDuplicate: ['current'] 
  });
  console.log('successfully inserted apps');
};