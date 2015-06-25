'use strict';

var bus = require('../bus');

module.exports = function(app) {

  var expressApp = app.expressApp;

  //** Web **//

  expressApp.get('/', function (req, res) {
    res.redirect('/index.html');
  });

  //** API **//

  expressApp.get('/auction', function (req, res) {
    var first = Number(req.query.first);
    var page = Number(req.query.page);
    app.auctionsService.getRunningAuctions(first, page, req.query.full).then(function(auctions){
      res.send(200, auctions);
    });
  });

  expressApp.get('/auction/:id', function (req, res) {
    app.auctionsService.getAuction(req.params.id, false).then(function(auction){
      app.auctionsService.getMaxBid(req.params.id).then(function(bid){
        // FIXME: Send correct data
        return res.send({
          id: auction.id,
          pid: auction.pid,
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
    app.bus.send('srv', 'bids', {
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

