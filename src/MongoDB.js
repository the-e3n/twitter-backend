const { MongoClient } = require("mongodb");

module.exports.setupDatabase = async ({ uri, dbName, projectDir }) => {
  const connect = async () => {
    const client = new MongoClient(uri);
    await client.connect();
    return client.db(dbName);
  };

  let db = await connect();
  console.log("connected to database");

  const collection = (coll) => {
    return db.collection(coll);
  };
  const find = async ({ coll, filter, options }) => {
    let collection = db.collection(coll); //db.collection('posts)
    let cursor = await collection.find(filter, options); //posts.find
    return cursor.toArray();
  };
  const findOne = async ({ coll, filter, options }) => {
    let collection = db.collection(coll);
    return await collection.findOne(filter, options);
  };
  const insertOne = async ({ coll, doc }) => {
    let collection = db.collection(coll);
    return await collection.insertOne(doc);
  };
  const insertMany = async ({ coll, docs, options }) => {
    let collection = db.collection(coll);
    return await collection.insertMany(docs, options);
  };
  const update = async ({ coll, filter, updateDoc }) => {
    let collection = db.collection(coll);
    return await collection.updateMany(filter, updateDoc);
  };
  const deleteMany = async ({ coll, filter }) => {
    let collection = db.collection(coll);
    return await collection.deleteMany(filter);
  };
  const deleteOne = async ({ coll, filter }) => {
    let collection = db.collection(coll);
    return await collection.deleteOne(filter);
  };

  return {
    find,
    findOne,
    insertOne,
    insertMany,
    update,
    deleteMany,
    deleteOne,
    collection,
  };
};
