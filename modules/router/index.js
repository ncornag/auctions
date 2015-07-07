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
    var full = req.query.full==='true';
    app.auctionsService.getRunningAuctions(first, page, full).then(function(auctions){
      res.send(200, auctions);
    });
  });

  expressApp.post('/auction/:id/bid', function (req, res) {
    app.auctionsService.enqueueBid({
      id: req.body.auctionId,
      bid: req.body.bid,
      owner: req.body.owner,
      auto: false
    }).then(function(data){
      return res.send(200, {msg: 'Bid queued for processing'});
    }).catch(function(err){
      return res.send(400, err);
    })
  });

  expressApp.post('/auction/:id/maxbid', function (req, res) {
    app.auctionsService.enqueueBid({
      id: req.body.auctionId,
      bid: req.body.bid,
      owner: req.body.owner,
      auto: true
    }).then(function(data){
      return res.send(200, {msg: 'Bid queued for processing'});
    }).catch(function(err){
      return res.send(400, err);
    })
  });

  return expressApp;
}

