
module.exports = function(app) {

  var as = app.auctionsService;

  // Fresh start
  app.store.wipeAllYesImSure();

  var products = [
    2100264, 1782128, 1940828, 1940824, 2004757,
    1576283, 1576280, 2019022, 1367937, 1924182
  ];

  // Create long auctions
  for(var i=0; i<50; i++) {
    var id = 'test-' + i;
    as.create({id: id, productId: products[i - Math.floor(i/10)*10]}).then(function (auction) {
      var start = Math.floor((new Date()).getTime() / 1000) * 1000;
      var data = {
        id: auction.id,
        startTime: new Date(start),
        stopTime: new Date(start + 60 * 60 * 1000),
        startingPrice: 1,
        increment: 1
      }
      as.schedule(auction.id, data, function (err, auction) {});
    });
  }

  //// create test auctions
  //var auctions = [];
  //
  //console.log('Creating test auctions')
  //for(var i=0;i<products.length;i++) {
  //  as.create({productId: products[i]}).then(function(auction){
  //    auctions.push(auction);
  //  });
  //}
  //
  //setTimeout(function(){
  //  console.log('Scheduling test auctions')
  //  var start = Math.floor((new Date()).getTime() / 1000)*1000 + 2000;
  //  for(var i=0;i<auctions.length;i++) {
  //    var data = {
  //      startTime: new Date(start),
  //      stopTime: new Date(start + 7000),
  //      startingPrice: 1,
  //      increment: 1
  //    }
  //    as.schedule(auctions[i].id, data, function(err, auction){
  //      //
  //    });
  //    start = start + 1000;
  //  }
  //}, 1000);
  //
  //// Bid a little
  //setInterval(function(){
  //  as.getRunningAuctions(1, 5).then(function(data) {
  //    if (data.length>0) {
  //      as.bid(data[0], {
  //        bid: Math.floor((Math.random() * 10) + 1),
  //        owner: 'Nico'
  //      }).catch(function(err){
  //        //console.log(err)
  //      });
  //    }
  //  });
  //}, 50);

  return {};
}