'use strict';

// TODO: Use https://www.npmjs.com/package/ioredis-lock

var Redis = require('ioredis');
var Promise = require('bluebird');
var async = require('async');
var utils = require('../utils');

module.exports = function(app) {
  app.logger.info('[store] redis')

  var store = app.store = {};
  var client = new Redis(app.config.get('store:url'));
  var queue = {
    'scheduled': 'scheduled',
    'running': 'running'
  }

  var auctionKey = function(auctionId) {
    return utils.format('auction:%s', auctionId);
  }

  var auctionBidsKey = function(auctionId) {
    return utils.format('auction:%s:bids', auctionId);
  }

  store.wipeAllYesImSure = function() {
    client.flushall();
  }

  store.putJSON = function(key, value){
    return client.set(key, JSON.stringify(value));
  };

  store.getJSON = function(key, value){
    return JSON.parse(client.get(key));
  };

  store.getAuction = function(auctionId){
    return client.hgetall(auctionKey(auctionId));
  };

  store.storeAuction = function(auction){
    return new Promise(function (resolve, reject){
      client.hmset(auctionKey(auction.id), auction).then(function(data){
        resolve(auction);
      });
    });
  };

  store.addAuctionToScheduled = function(auction){
    return client.zadd(queue.scheduled, auction.sta, auction.id);
  };

  store.addAuctionToRunning = function(auction){
    // TODO: ZMOVE? LOCK?
    return client.pipeline().zrem(queue.scheduled, auction.id)
        .zadd(queue.running, auction.sto, auction.id).exec();
  };

  store.removeAuctionFromRunning = function(auction){
    return client.zrem(queue.running, auction.id);
  };

  store.getAuctionsAboutToStart = function(time) {
    return client.zrangebyscore(queue.scheduled, 0, time);
  }

  store.getAuctionsAboutToStop = function(time) {
    return client.zrangebyscore(queue.running, 0, time);
  }

  store.scan = function(key, cb){
    // FIXME: Use promises
    client.scan(0, 'match', key, function(err, data){
      if (err) return cb(err);
      // FIXME: iterate acording to data[0], not just the first page
      var dataLen = data[1].length;
      var result = [];
      if (dataLen==0) return cb(null, result);
      data[1].forEach(function(key, index, array){
        store.getAuction(key, function(err, e){
          if (err) return cb(err);
          result.push({key:key, data:e});
          if(index==dataLen-1) return cb(null, result);
        })
      })
    });
  };

  store.getRunningAuctions = function(first, page, full) {
    // TODO: Cache (cache the cache?)
    return new Promise(function (resolve, reject) {
      client.zrange(queue.running, first - 1, first + page - 2).then(function(data){
        // TODO: Fill with auctions data
        if(full==='true') {
          async.map(data, function(auctionId, callback) {
            store.getAuction(auctionId).then(function(data){
              store.getMaxBid(data.id).then(function(maxBid){
                data.maxBid = maxBid?maxBid.bid:Number(data.ini);
                data.winner = maxBid?maxBid.ow:"";
                data.inc = Number(data.inc);
                data.ini = Number(data.ini);
                callback(null, data);
              }).catch(function(err){
                callback(err);
              });;
            }).catch(function(err){
              callback(err);
            });
          }, function(err, result){
            if (err) return reject(err);
            resolve(result);
          });
        } else {
          resolve(data);
        }
      });
    });
  };

  store.getMaxBid = function(auctionId){
    return new Promise(function (resolve, reject) {
      client.zrevrange(auctionBidsKey(auctionId), 0, 0).then(function(data){
        if(data[0]) {
          resolve(JSON.parse(data[0]));
        } else {
          resolve();
        }
      });
    });
  };

  store.storeBid = function(auctionId, bid){
    return client.zadd(auctionBidsKey(auctionId), bid.bid, JSON.stringify(bid));
  };

  return store;
}
