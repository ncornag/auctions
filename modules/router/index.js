'use strict';

var bus = require('../bus');

module.exports = function(app) {

  var expressApp = app.expressApp;

  expressApp.get('/auction', function (req, res) {
    app.auctionsService.getRunningAuctions(req.query.first, req.query.page).then(function(auctions){
      res.send(200, auctions);
    });
  });

  expressApp.get('/auction/:id', function (req, res) {
    app.auctionsService.getAuction(req.params.id).then(function(auction){
      app.auctionsService.getMaxBid(req.params.id).then(function(bid){
        // FIXME: Send correct data
        return res.send({
          id: auction.id,
          pId: auction.pId,
          sta: auction.sta,
          sto: auction.sto,
          ini: Number(auction.ini),
          inc: Number(auction.inc),
          maxBid: Number((bid&&bid.bid)?bid.bid:auction.ini),
          winner: (bid&&bid.ow)?bid.ow:''
        });
      });
    });
  });

  // accept POST request on the homepage
  expressApp.post('/auction/:id/bid', function (req, res) {
    app.bus.send('bids', {
      id: req.body.auctionId,
      bid: req.body.bid,
      owner: req.body.owner
    })
    return res.send(200, {msg: 'Bid queued for processing'});

    //app.auctionsService.bid(req.body.auctionId, {
    //  bid: req.body.bid,
    //  owner: req.body.owner
    //}).then(function(data){
    //  res.send(data);
    //}).catch(function(err){
    //  res.send(400, err)
    //})

  });

  return expressApp;
}

