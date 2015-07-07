'use strict';

var url = require('url');
var Redis = require('ioredis');
var Queue = require('bull');

module.exports = function(app, name) {
  var configUrl = app.config.get('bus:' + name + ':url');
  var parsedUrl = url.parse(configUrl);
  app.logger.info('[bus] redis into [%j]', parsedUrl.host);

  var sub = new Redis(configUrl);
  var pub = new Redis(configUrl);

  return {
    send: function (channel, message) {
      //app.logger.debug('[bus] sending message [%j] to channel [%s]', message, channel);
      pub.publish(channel, JSON.stringify(message));
    },
    listen: function(channel, handler) {
      sub.subscribe(channel, function(err, count){
        app.logger.debug('[bus-redis] subscribed to [%s]', channel);
        sub.on('message', function(channel, message){
          //app.logger.debug('[bus] receiving message [%s] to [%s]', message, channel);
          handler.call(this, channel, JSON.parse(message));
        });
      });
    },
    queue: function(channel, message) {
      return Queue(channel, parsedUrl.port, parsedUrl.hostname);
    },
    publish: function(queue, message) {
      return queue.add(message);
    },
    subscribe: function(queue, handler) {
      return queue.process(handler)
    }
  };
}
