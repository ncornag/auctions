var app = angular.module('auctions', ['ngRoute', 'pubnub.angular.service']);


app.constant('PUBNUBC', {
  subscribe_key: 'sub-c-9020543c-0e79-11e5-a3e7-02ee2ddab7fe'
}).constant('USER', 'testuser');

app.service('pnService', ['$rootScope', 'PubNub', 'PUBNUBC', function pnFactory($rootScope, PubNub, PUBNUBC) {
  $rootScope.connected = false;
  $rootScope.connecting = false;
  return {
    subscribe: function(channel) {
      PubNub.ngSubscribe({
        channel: channel,
        message: function (event) {
          $rootScope.$broadcast(event[2], event[0]);
        }
      });
    },
    connect: function (user) {
      var userChannel = 'user:' + user;
      //console.log('about to connect', user.id)
      if (!$rootScope.connected && !$rootScope.connecting) {
        $rootScope.connecting = true;
        var me = this;
        PubNub.init({subscribe_key: PUBNUBC.subscribe_key, uuid: user})

        PubNub.ngSubscribe({
          channel: userChannel,
          message: function (event) {
            $rootScope.$broadcast(event[2], event[0]);
          },
          connect: function () {
            $rootScope.connected = true
            $rootScope.connecting = false
            $rootScope.$apply();
          }
        })
      }
    },

    disconnect: function (user) {
      var userChannel = 'user:' + user;
      PubNub.ngUnsubscribe({channel: userChannel});
      PubNub.destroy();
      $rootScope.connected = false;
    }
  }
}])

app.config([ '$routeProvider', 'USER', function($routeProvider, USER) {
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


app.controller('MainCtrl', ['$scope', '$rootScope', '$http', '$route', 'USER', 'pnService', function($scope, $rootScope, $http, $route, USER, pnService){

  var userChannel = 'user:' + USER;

  pnService.connect(USER);
  $scope.auctionsKeys = [];
  var updateAuction = function(message){
    if($scope.auctionsKeys[message.id]!=undefined) {
      var auction = $scope.auctions[$scope.auctionsKeys[message.id]];
      auction.maxBid = message.bid.bid;
      auction.winner = message.bid.ow;
      auction.newBid = auction.maxBid + auction.inc;
      $scope.$apply();
    }
  }

  $rootScope.$on(userChannel, function (event, message) {
    updateAuction(message);
  });

  $scope.doBid = function(id, newBid){
    $http.post('/auction/' + id + '/bid', {auctionId:id, bid:newBid, owner: USER}).then(function bidServiceResponse(response) {
    });
  };

  $scope.doRefresh = function(){
    $http.get('/auction?first=1&page=5&full=true').then(function auctionServiceResponse(response) {
      response.data.forEach(function(auction, index){
        auction.newBid = auction.maxBid + auction.inc;
        $scope.auctionsKeys[auction.id] = index;
        var channelName = 'auction:' + auction.id;
        pnService.subscribe(channelName);
        $rootScope.$on(channelName, function (event, message) {
          updateAuction(message);
        });
      })
      $scope.auctions = response.data;
    });
  };

  $scope.doRefresh();

}]);