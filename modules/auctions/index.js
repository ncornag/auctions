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
    timeout: 500,
    retries: 0,
    delay: 1000
  }
  var store = app.store;
  var logger = app.logger;
  var startAuctionsRunnerFrequency = app.config.get('scheduler:startAuctionsRunnerFrequencyInSeconds') * 1000;
  var stopAuctionsRunnerFrequency = app.config.get('scheduler:stopAuctionsRunnerFrequencyInSeconds') * 1000;
  var enqueueBids = app.config.get('bids:enqueue');
  var client = new Redis(app.config.get('store:url'));
  var busImpl = app.config.get('bus:default');
  //var bidsQueue = app.bus.queue('srv', 'bids');
  var bidsQueue = 'bidsQ';

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
      if (auctionKeys.length>0) {
        logger.info('[scheduler] starting [%d] auctions', auctionKeys.length);
      }
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
    startAuctions((new Date()).getTime());
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
      if (auctionKeys.length>0) {
        logger.info('[scheduler] stopping [%d] auctions', auctionKeys.length);
      }
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
    stopAuctions((new Date()).getTime());
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

  /* Queue the bid request */
  module.enqueueBid = function(bidReq) {
    if(enqueueBids) {
      return app.bus.send('rmq', bidsQueue, bidReq);
    } else {
      return app.auctionsService.bid(bidReq.id, {
        bid: bidReq.bid,
        owner: bidReq.owner,
        auto: bidReq.auto
      });
    }
  }

  /* Process the bid request */
  app.bus.listen('rmq', bidsQueue, function(message, done){
    var msg = message.data?message.data:message
    app.auctionsService.bid(msg.id, {
      bid: msg.bid,
      owner: msg.owner,
      auto: msg.auto
    }).then(function(){
      if(message.data) done();
    }).catch(function (err) {
      //logger.error('%s', err.toString())
      if(message.data) done(err);
    });

  });

  // Do bids
  module.bid = function(auctionId, bidReq) {
    if (bidsStats) requestedBids++;
    var lock = redislock.createLock(client, lockOptions);
    return new Promise(function(resolve, reject) {
      store.getAuction(auctionId, true).then(function(auction){
        if (auction.st != module.RUNNING) { // Validate bid status
          return reject(new Error('Auction not running'));
        };
        if (bidReq.bid < Number(auction.ini) + Number(auction.inc)) { // Validate bid min ammount
          return reject(new Error('Invalid bid'));
        }
        var lockKey = utils.format('auction:%s:lock', auctionId);
        lock.acquire(lockKey).then(function() {
          var maxBid = auction.bids?auction.bids[auction.bids.length-1]:undefined;
          // TODO: validate bid increment
          if(maxBid && bidReq.bid <= Number(maxBid.bid)) { // Validate bid ammount
            lock.release(function(err) {
              // 'Lock on app:lock has expired'
            });
            app.bus.send(busImpl, userChannel(bidReq.owner), {id: auctionId, error:'Invalid bid'});
            return reject(new Error('Invalid bid'));
          }

          var newBid = {
            ts: (new Date()).getTime(),
            bid: Number(bidReq.bid),
            ow: bidReq.owner,
          };

          if (bidReq.auto) {
            newBid.auto = true;
            newBid.autoBid = Number(bidReq.bid);
            newBid.bid = (maxBid?maxBid.bid:auction.ini) + auction.inc;
          }

          store.storeBid(auctionId, newBid).then(function(){
            //console.log('releasing', lockKey, lock._id);
            lock.release(function(err) {
              if (err) {
                // FIXME: Was the bid placed?
                //return console.log(err.message);
              }
            });
            logger.debug('[bid] New max bid', auctionId, newBid);
            if (bidsStats) acceptedBids++;
            if(maxBid && maxBid.auto && maxBid.autoBid>newBid.bid) {
              module.bid(auctionId, {
                auctionId: auctionId,
                bid: maxBid.autoBid,
                owner: maxBid.ow,
                auto: true
              });
            }
            auction.bids.push(newBid);
            auction.bids.forEach(function(bid){
              delete bid.auto;
              delete bid.autoBid;
            })
            app.bus.send(busImpl, auctionChannel(auctionId), auction);
            return resolve(newBid);
          });

        }).catch(redislock.LockAcquisitionError, function(err) {
          app.bus.send(busImpl, userChannel(bidReq.owner), {id: auctionId, error:'Try again'});
          reject(new Error({msg: 'Try again'}));
        });
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
