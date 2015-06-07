'use strict';

var Redis = require('ioredis');

module.exports = function(app) {
  app.logger.info('[bus] redis into [%j]', app.config.get('bus:url'))
  var sub = new Redis(app.config.get('bus:url'));
  var pub = new Redis(app.config.get('bus:url'));

  return {
    send: function (channel, message) {
      //app.logger.debug('[bus] sending message [%j] to channel [%s]', message, channel);
      pub.publish(channel, JSON.stringify(message));
    },
    listen: function(channel, handler) {
      sub.subscribe(channel, function(err, count){
        app.logger.info('[bus] subscribed to [%s]', channel);
        sub.on('message', function(channel, message){
          //app.logger.debug('[bus] receiving message [%s] to [%s]', message, channel);
          handler.call(this, channel, JSON.parse(message));
        });
      });
    }
  };
}
