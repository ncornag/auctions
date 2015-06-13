'use strict';

var Redis = require('ioredis');
var Promise = require('bluebird');
var redislock = require('ioredis-lock');
var bus = require('../bus');
var utils = require('../utils');

module.exports = function(app) {

  var module = app.auctionsService = {
    UNSCHEDULED: 1,
    SCHEDULED: 2,
    RUNNING: 3,
    FINISHED: 4
  };
  var lockOptions = {
    timeout: 1000,
    retries: 0,
    delay: 100
  }
  var store = app.store;
  var logger = app.logger;
  var startAuctionsRunnerFrequency = app.config.get('scheduler:startAuctionsRunnerFrequencyInSeconds') * 1000;
  var stopAuctionsRunnerFrequency = app.config.get('scheduler:stopAuctionsRunnerFrequencyInSeconds') * 1000;
  var client = new Redis(app.config.get('store:url'));

  var userChannel = function(userName) {
    return 'user:' + userName;
  }
  var auctionChannel = function(id) {
    return 'auction:' + id;
  }

  var bidsStats = app.config.get('stats:bids:active');
  var bidsStatsFrequency = app.config.get('stats:bids:frequency');
  var requestedBids = 0;
  var acceptedBids = 0;

  if (bidsStats) {
    logger.info('[stats] bids frequency %d', bidsStatsFrequency);
    setInterval(function (argument) {
      logger.info('[stats] bids req:%d/s done:%d/s', 1000*requestedBids/bidsStatsFrequency, 1000*acceptedBids/bidsStatsFrequency);
      requestedBids = 0;
      acceptedBids = 0;
    }, bidsStatsFrequency);
  }

  //** Start Auctions **//
  var startAuctionsTimer;
  var startAuctions = function(time) {
    store.getAuctionsAboutToStart(time).then(function(auctionKeys){
      auctionKeys.forEach(function(key){
        store.getAuction(key, false).then(function(auction){
          auction.st = module.RUNNING;
          store.storeAuction(auction).then(function(data){
            store.addAuctionToRunning(auction).then(function(data){
              logger.debug('[scheduler] Starting auction [%s] %s - %s', auction.id, new Date(Number(auction.sta)), new Date(Number(auction.sto)), '');
              // TODO: Send acutionStarted event
            });
          });
        })
      })
    })
  };
  module.startAuctionsRunner = function() {
    startAuctionsTimer = setInterval(function(){
      startAuctions((new Date()).getTime());
    }, startAuctionsRunnerFrequency);
    logger.info('[scheduler] Started auctions runner');
    // TODO: Send schedulerStarted event
  };
  module.stopAuctionsRunner = function() {
    clearTimeout(startAuctionsTimer);
    logger.info('[scheduler] Stopped auctions runner')
    // TODO: Send schedulerStopped event
  };

  //** Stop Auctions **//
  var stopAuctionsTimer;
  var stopAuctions = function(time) {
    store.getAuctionsAboutToStop(time).then(function(auctionKeys){
      auctionKeys.forEach(function(key){
        store.getAuction(key, false).then(function(auction){
          auction.st = module.FINISHED;
          store.storeAuction(auction).then(function(data){
            store.removeAuctionFromRunning(auction).then(function(data){
              logger.debug('[scheduler] Stopping auction [%s] %s - %s', auction.id, new Date(Number(auction.sta)), new Date(Number(auction.sto)), "");
              // TODO: Send acutionStoped event
            });
          });
        })
      })
    })
  };
  module.startAuctionsCloser = function() {
    stopAuctionsTimer = setInterval(function(){
      stopAuctions((new Date()).getTime());
    }, stopAuctionsRunnerFrequency);
    logger.info('[scheduler] Started auctions closer');
    // TODO: Send schedulerStarted event
  };
  module.stopAuctionsCloser = function() {
    clearTimeout(stopAuctionsTimer);
    logger.info('[scheduler] Stopped auctions closer')
    // TODO: Send schedulerStopped event
  };

  // Create an auction for later schedule
  module.create = function(data) {
    var auction = {
      id: data.id?data.id:utils.newShortId(),
      pid: data.productId,
      img: data.productImg,
      st: module.UNSCHEDULED,
      v: 0
    };

    return new Promise(function (resolve, reject) {
      store.storeAuction(auction).then(function(response) {
        logger.debug('[auctions] created auction', auction);
        // TODO: Send acutionCreated event
        return resolve(auction);
      });
    });
  };

  // Schedule an Auction
  module.schedule = function(auctionId, data, cb) {

    // TODO: Validate parameters
    store.getAuction(auctionId, false).then(function(auction) {

      auction.sta = data.startTime.getTime();
      auction.sto = data.stopTime.getTime();
      auction.ini = data.startingPrice;
      auction.inc = data.increment;
      auction.v = Number(auction.v) + 1;
      auction.st = module.SCHEDULED;
      auction.winner = null;

      store.storeAuction(auction).then(function(result){
        store.addAuctionToScheduled(auction).then(function(data){
          logger.debug('[auctions] scheduled auction [%s] %s - %s', auction.id, new Date(Number(auction.sta)), new Date(Number(auction.sto)), '');
          // TODO: Send acutionScheduled event
          return cb(null, auction);
        });
      });
    });
  }

  // Do bids from the bids queue
  //app.bus.listen('bids', function bidsMessageHandler(message) {
  app.bus.listen('srv', 'bids', function bidsMessageHandler(channel, message) {
    if(channel=='bids') {
      app.auctionsService.bid(message.id, {
        bid: message.bid,
        owner: message.owner
      }).catch(function (err) {
        //app.logger.error('%s', err.toString())
      });
    }
  });

  // Do bids
  module.bid = function(auctionId, bidReq) {
    if (bidsStats) requestedBids++;
    return new Promise(function(resolve, reject) {
      store.getAuction(auctionId, false).then(function(auction){
        if (auction.st != module.RUNNING) {
          return reject(new Error('Auction not running'));
        };
        if (bidReq.bid < Number(auction.ini) + Number(auction.inc)) {
          return reject(new Error('Invalid bid'));
        }
        var lock = redislock.createLock(client, lockOptions);
        var lockKey = utils.format('auction:%s:lock', auctionId);
        lock.acquire(lockKey).then(function() {
          store.getMaxBid(auctionId).then(function(bid){
            // TODO: validate increment
            if(!bid || (bid && bidReq.bid > Number(bid.bid))) {
              var newBid = {
                ts: (new Date()).getTime(),
                bid: bidReq.bid,
                ow: bidReq.owner
              };
              store.storeBid(auctionId, newBid).then(function(){
                store.getBidsCount(auctionId).then(function(count){
                  lock.release();
                  logger.debug('[bid] New max bid', auctionId, newBid);
                  if (bidsStats) acceptedBids++;
                  // TODO Send NewMaxBid event
                  app.bus.send('io', auctionChannel(auctionId), {id: auctionId, count: count, bid: newBid});
                  return resolve(newBid);
                })
              });
            } else {
              lock.release();
              //app.bus.send('pn', userChannel(bidReq.owner), {id: auctionId, bid: newBid});
              return reject(new Error('Invalid bid'));
            }
          })
        }).catch(function(err){
          reject(new Error({msg: 'Try again'}));
        })
      });
    })
  }

  module.getAuction = function(auctionId, full){
    return store.getAuction(auctionId, full);
  };

  module.getMaxBid = function(auctionId) {
    return store.getMaxBid(auctionId);
  }

  module.getRunningAuctions = function(first, page, full) {
    return store.getRunningAuctions(first, page, full);
  }

  return module;
}
