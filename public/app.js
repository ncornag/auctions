var app = angular.module('auctions', ['ngRoute', 'pubnub.angular.service', 'btford.socket-io', 'ui.bootstrap']);


app.constant('PUBNUBC', {
  subscribe_key: 'sub-c-9020543c-0e79-11e5-a3e7-02ee2ddab7fe'
})
.constant('BUSIMPL', 'ioBusService');

app.config([ '$routeProvider', function($routeProvider) {
  $routeProvider
     .when('/', {
       templateUrl: '/index.html',
       controller: 'MainCtrl'
       //,resolve: {
       // auctions: function() {
       //   return $http.get('/auction?first=0&page=5&full=true').then(function auctionServiceResponse(response) {
       //     return response.data;
       //   });
       // }
       //}
     })
     .otherwise({
       redirectTo:'/'
     });

}
]);

app.service('pnBusService', ['$rootScope', 'PubNub', 'PUBNUBC', function pnFactory($rootScope, PubNub, PUBNUBC) {

  this.name = 'PubNub';
  $rootScope.connected = false;

  PubNub.init({
    windowing: 1000, // MILLISECONDS
    keepalive: 60,   // SECONDS
    subscribe_key: PUBNUBC.subscribe_key
  });

  var connectFn = function() {
    console.info('[pnBusService] connected');
    $rootScope.connected = true;
    $rootScope.$apply();
  };

  var disconnectFn = function() {
    console.info('[pnBusService] disconnected');
    $rootScope.connected = false;
    $rootScope.$apply();
  };

  PubNub.ngSubscribe({
    channel: 'lobby',
    connect: connectFn,
    reconnect: connectFn,
    disconnect: disconnectFn
  });

  this.subscribe = function(channel) {
    console.debug('[bus] Suscribing to channel', channel);
    PubNub.ngSubscribe({
      channel: channel,
      message: function (event) {
        console.debug('[bus] Message received on', channel);
        $rootScope.$broadcast(event[2], event[0]);
      }
    });
  };

  this.send = function (eventName, data) {
    console.debug('[bus] sending message to', channel);
    PubNub.ngPublish({
      channel: channel,
      message: data
    })
  };

}])

app.service('ioBusService', ['$rootScope', 'socketFactory', function pnFactory($rootScope, socketFactory) {
  this.name = 'ioSocket';
  var socket = socketFactory();
  var listeners = {};

  $rootScope.connected = false;
  socket.on('connect', function(){
    console.info('[ioBusService] connected');
    socket.on('disconnect', function(){
      console.info('[ioBusService] disconnected');
      $rootScope.connected = false;
    });
    $rootScope.connected = true;
  });

  this.subscribe = function (channel) {
    this.unsubscribe(channel);
    console.debug('[bus] Suscribing to channel', channel);
    var subscribeFunction = function (message) {
      console.debug('[bus] Message received on', channel);
      $rootScope.$broadcast(channel, message);
    }
    socket.on(channel, subscribeFunction);
    listeners[channel] = subscribeFunction;
  };

  this.unsubscribe = function (channel) {
    if (listeners[channel]) {
      console.debug('[bus] Unsuscribing to channel', channel);
      socket.removeListener(channel, listeners[channel]);
      delete listeners[channel];
    }
  };

  this.send = function (eventName, data, callback) {
    console.debug('[bus] sending message to', channel);
    socket.emit(eventName, data, function () {
      var args = arguments;
      $rootScope.$apply(function () {
        if (callback) {
          callback.apply(socket, args);
        }
      });
    })
  };

}])

app.factory('busService', ['BUSIMPL', '$injector', function(BUSIMPL, $injector) {
  return $injector.get(BUSIMPL);
}]);

app.controller('MainCtrl', ['$scope', '$rootScope', '$http', '$route', '$timeout', 'busService', '$modal',
  function($scope, $rootScope, $http, $route, $timeout, busService, $modal){


  $scope.auctions = [];
  $scope.auctionsKeys = [];
  $scope.busImpl = busService.name;
  $scope.userName = 'testUser';

  var userChannel = 'user:' + $scope.userName;

  var calcClocks = function(auctions){
    var now = (new Date()).getTime();
    auctions.forEach(function(auction){
      var msec = auction.sto - now;
      if (msec>999) {
        var hh = Math.floor(msec / 1000 / 60 / 60);
        msec -= hh * 1000 * 60 * 60;
        var mm = Math.floor(msec / 1000 / 60);
        msec -= mm * 1000 * 60;
        var ss = Math.floor(msec / 1000);
        auction.timer = ('0'+hh).substr(-2,2) + ' : ' + ('0'+mm).substr(-2,2) + ' : ' + ('0'+ss).substr(-2,2);
      } else {
        auction.timer = '00 : 00 : 00';
        auction.running = false;
      }
    })
  }

  $scope.onTimeout = function(){
    calcClocks($scope.auctions);
    mytimeout = $timeout($scope.onTimeout, 1000);
  }
  var mytimeout = $timeout($scope.onTimeout, 0);

  $scope.stop = function(){
    $timeout.cancel(mytimeout);
  }

  var subscribeToAuctionChannels = function(auctions){
    // TODO: Unsubscribe to all auction channels first
    $scope.auctions.forEach(function(auction){
      var channelName = 'auction:' + auction.id;
      busService.subscribe(channelName);
      $rootScope.$on(channelName, function (event, message) {
        updateAuction(message);
      });
    })
  }
  var subscribeToUserChannel = function(auctions){
    busService.subscribe(userChannel);
    $rootScope.$on(userChannel, function (event, message) {
      updateAuction(message);
    });
  }

  var updateAuction = function(message){
    if($scope.auctionsKeys[message.id]!=undefined) {
      var auction = $scope.auctions[$scope.auctionsKeys[message.id]];
      if (message.error) {
        auction.error = message.error;
        setTimeout(function(){
          auction.error = '';
        }, 1000)
      } else {
        var count = message.bids.length -1;
        auction.maxBid = message.bids[count].bid;
        auction.winner = message.bids[count].ow;
        auction.cnt = count;
        auction.newBid = auction.maxBid + auction.inc;
        auction.bids = message.bids;
      }
      $scope.$apply();
    }
  }

  $rootScope.$on(userChannel, function (event, message) {
    updateAuction(message);
  });

  $scope.doBid = function(id, newBid){
    $http.post('/auction/' + id + '/bid', {auctionId:id, bid:newBid, owner: $scope.userName}).then(function bidServiceResponse(response) {
    });
  };

  $scope.doMaxBid = function(id, newBid){
    $http.post('/auction/' + id + '/maxbid', {auctionId:id, bid:newBid, owner: $scope.userName}).then(function bidServiceResponse(response) {
    });
  };

  $scope.doRefresh = function(){
    $http.get('/auction?first=1&page=120&full=true').then(function auctionServiceResponse(response) {
      response.data.forEach(function(auction, index){
        auction.maxBid = auction.bids.length>0?auction.bids[auction.bids.length-1].bid:Number(auction.ini);
        auction.winner = auction.bids.length>0?auction.bids[auction.bids.length-1].ow:'';
        auction.newBid = auction.maxBid + auction.inc;
        auction.cnt = auction.bids.length;
        auction.running = true;
        $scope.auctionsKeys[auction.id] = index;
      })
      $scope.auctions = response.data;
      calcClocks($scope.auctions);
    });
  };

  $scope.$watch('auctions', function(newValue, oldValue){
    if ($scope.connected===true) {
      subscribeToAuctionChannels($scope.auctions);
    }
  });

  $rootScope.$watch('connected', function(newValue, oldValue){
    if(newValue===true) {
      subscribeToUserChannel();
      subscribeToAuctionChannels($scope.auctions);
    }
  })


  $scope.bidsPopup = function (auction) {

    var modalInstance = $modal.open({
      animation: $scope.animationsEnabled,
      templateUrl: 'myModalContent.html',
      controller: 'ModalInstanceCtrl',
      size: 'lg',
      resolve: {
        items: function () {
          return auction.bids;
        }
      }
    });
  };

  $scope.getRandomSpan = function(){
    return Math.floor((Math.random()*6)+1);
  }

  $scope.doRefresh();

}]);


angular.module('auctions').controller('ModalInstanceCtrl', function ($scope, $modalInstance, items) {

  $scope.items = items;
  $scope.selected = {
    item: $scope.items[0]
  };

  $scope.ok = function () {
    $modalInstance.close($scope.selected.item);
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
});