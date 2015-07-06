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

  store.getAuction = function(auctionId, full){
    return new Promise(function (resolve, reject) {
      var result = {};
      client
         .hgetall(auctionKey(auctionId))
         .then(function(auction){
           result = auction;
           if(result.inc) result.inc = Number(auction.inc);
           if(result.ini) result.ini = Number(auction.ini);
           if(full) {
             return store.getBids(auction.id);
           } else {
             resolve(result);
           }
         })
         .then(function(bids){
           result.bids = bids;
           resolve(result);
         }).catch(function(err){
           reject(err);
         });
    });
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

  store.getRunningAuctions = function(first, page, full) {
    // TODO: Cache (cache the cache?)
    return new Promise(function (resolve, reject) {
      client.zrange(queue.running, first - 1, first + page - 2).then(function(data){
        if(full) {
          async.map(data, function(auctionId, callback) {
            store.getAuction(auctionId, full).then(function(data){
              callback(null, data);
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

  store.getBidsCount = function(auctionId){
    return client.zcount(auctionBidsKey(auctionId), "-inf", "+inf");
  };

  store.getBids = function(auctionId){
    return new Promise(function (resolve, reject) {
      client.zrange(auctionBidsKey(auctionId), 0, -1).then(function(data){
        var bids = [];
        data.forEach(function(bid){
          bids.push(JSON.parse(bid));
        });
        resolve(bids);
      });
    });
  };

  store.storeBid = function(auctionId, bid){
    return client.zadd(auctionBidsKey(auctionId), bid.bid, JSON.stringify(bid));
  };

  return store;
}
