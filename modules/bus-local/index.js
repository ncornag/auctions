'use strict';

var events = require('events');

module.exports = function(app) {
  app.logger.info('[bus] local')
  var eventEmitter = new events.EventEmitter();
  return {
    send: function (channel, data) {
      eventEmitter.emit(channel, data);
    },
    listen: function(channel, handler) {
      eventEmitter.on(channel, handler);
    }
  };
}
