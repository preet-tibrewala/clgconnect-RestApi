const { MongoClient } = require('mongodb');

const mongoHost = 'localhost';
const mongoPort = 27017;
const mongoUser = 'clgconnectuser';
const mongoPassword = 'password';
const mongoDbName = 'clgconnectdb';
const mongoAuthDb = mongoDbName;


const mongoUrl = `mongodb://${mongoUser}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoAuthDb}`

let db = null
exports.connectToDb = async function connectToDb() {
    const client = await MongoClient.connect(mongoUrl)
    db = client.db(mongoDbName)
}

exports.getDb = function getDb() {
    return db
}
