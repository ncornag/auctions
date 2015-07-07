
module.exports = function(app) {

  var as = app.auctionsService;

  // Fresh start
  app.store.wipeAllYesImSure();

  var products = [
    {pid: 100, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 101, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 102, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 103, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 104, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 105, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 106, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 107, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 108, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 109, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 110, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 111, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 112, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 113, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 114, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 115, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 116, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 117, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 118, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 119, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()},
    {pid: 120, img:'http://lorempixel.com/350/350/?rnd=' + Math.random()}
  ];

  // Create long auctions
  for(var i=0; i<10000; i++) {
    var doIt = function(i) {
      var id = 'test-' + i;
      as.create({
        id: id,
        productId: products[i - Math.floor(i/20)*20].pid,
        productImg: products[i - Math.floor(i/20)*20].img
      }).then(function (auction) {
        var start = Math.floor((new Date()).getTime() / 1000) * 1000;
        var stop = start + 1 * 60 * 1000  + (i*10*1000);
        var data = {
          id: auction.id,
          startTime: new Date(start),
          stopTime: new Date(stop),
          startingPrice: 1,
          increment: 1
        }
        as.schedule(auction.id, data, function (err, auction) {if(err) console.log(err)});
      });
    }
    doIt(i);
  }

  return {};
}