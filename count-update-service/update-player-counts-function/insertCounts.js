module.exports = async (db, counts) => {
  console.log('inserting counts');
  await db.models.PlayerCount.bulkCreate(counts);
  console.log('successfully inserted counts');
};