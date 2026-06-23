const mongoose = require('mongoose');
const { ServerApiVersion } = require('mongodb');
const config = require('../../../config');

mongoose.connection.on('connected', () => {
    console.log('MongoDb connected');
});

mongoose.connection.on('error', (err) => {
    console.log('Error connecting MongoDb', err);
});

/**
 * Options for mongoose/MongoClient. Atlas benefits from Stable API + explicit timeouts.
 * Local mongodb:// URIs skip serverApi (not all standalone setups support it the same way).
 */
function getMongoConnectOptions(uri) {
    const opts = {
        serverSelectionTimeoutMS: 20000,
    };
    if (typeof uri === 'string' && (uri.includes('mongodb.net') || uri.includes('mongodb+srv'))) {
        opts.serverApi = {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        };
    }
    return opts;
}

/*
 * Connect MongoDb.
 */
const connect = async () => {
    await mongoose.connect(config.mongodb.uri, getMongoConnectOptions(config.mongodb.uri));
    return mongoose.connection;
};

module.exports = {
    connect,
    getMongoConnectOptions,
};