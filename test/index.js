
module.exports = function(app) {

  var as = app.auctionsService;

  // Fresh start
  app.store.wipeAllYesImSure();

  var products = [
    {pid: 2100437, img: '21/0/2100437.jpg'},
    {pid: 2144358, img: '21/4/2144358.jpg'},
    {pid: 1927937, img: '19/2/1927937.jpg'},
    {pid: 2053596, img: '20/5/2053596.jpg'},
    {pid: 1997399, img: '19/9/1997399.jpg'},
    {pid: 1949630, img: '19/4/1949630.jpg'},
    {pid: 2090452, img: '20/9/2090452.jpg'},
    {pid: 2047871, img: '20/4/2047871.jpg'},
    {pid: 1883386, img: '18/8/1883386.jpg'},
    {pid: 1909791, img: '19/0/1909791.jpg'},
    {pid: 1962346, img: '19/6/1962346.jpg'},
    {pid: 2086949, img: '20/8/2086949.jpg'},
    {pid: 1906213, img: '19/0/1906213.jpg'},
    {pid: 2033208, img: '20/3/2033208.jpg'},
    {pid: 2135673, img: '21/3/2135673.jpg'},
    {pid: 2060777, img: '20/6/2060777.jpg'},
    {pid: 2090851, img: '20/9/2090851.jpg'},
    {pid: 2122997, img: '21/2/2122997.jpg'},
    {pid: 2016745, img: '20/1/2016745.jpg'},
    {pid: 2107916, img: '21/0/2107916.jpg'}
  ];


  // Create long auctions
  for(var i=0; i<12; i++) {
    var id = 'test-' + i;
    as.create({
      id: id,
      productId: products[i - Math.floor(i/20)*20].pid,
      productImg: products[i - Math.floor(i/20)*20].img
    }).then(function (auction) {
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