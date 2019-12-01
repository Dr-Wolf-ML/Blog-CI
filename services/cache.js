const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const keys = require('../config/keys');

const client = redis.createClient(keys.redisUrl); // Might have to delete keys.redisUrl
client.hget = util.promisify(client.hget);

const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options = {}) {
  this.useCache = true;

  // options.key must be a String or a Number hence the use of stringify, and
  // to avoid this.hashKey to return 'undefined', we're adding || ''
  this.hashKey = JSON.stringify(options.key || 'default'); // 'default' or '' or whatever

  return this; // now it's a chainable function
};

mongoose.Query.prototype.exec = async function() {
  if (!this.cache) {
    return exec.apply(this, arguments);
  }

  const key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name
    })
  );

  // See if we have a value for 'hashKey' in Redis (nested hash)
  const cachedValue = await client.hget(this.hashKey, key);

  // If we do, return that
  if (cachedValue) {
    const doc = JSON.parse(cachedValue);

    return Array.isArray(doc)
      ? doc.map(d => new this.model(d))
      : new this.model(doc);
  }

  // Otherwise issue the query and store the result in Redis
  const result = await exec.apply(this, arguments);

  // setting the nested hash in Redis
  client.hset(this.hashKey, key, JSON.stringify(result));

  return result;
};

module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  }
};
