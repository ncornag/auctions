'use strict';

var url = require('url');
var servicebus = require('servicebus');
var Promise = require('bluebird');

module.exports = function(app, name) {
  var configUrl = app.config.get('bus:' + name + ':url')
  var parsedUrl = url.parse(configUrl);
  app.logger.info('[bus] amqp connected to [%s]', parsedUrl.host);

  var bus = servicebus.bus({
    url: parsedUrl.path?configUrl.substring(0,configUrl.length-parsedUrl.path.length):configUrl
    ,vhost: parsedUrl.path?parsedUrl.path.substring(1):'/'
  });

  return {
    send: function (channel, data) {
      return new Promise(function(resolve, reject) {
        bus.send(channel, data);
        return resolve();
      });
    },
    listen: function (channel, handler) {
      return bus.listen(channel, handler);
    },
    publish: function (channel, data) {
      return new Promise(function(resolve, reject) {
        bus.publish(channel, data);
        resolve();
      })
    },
    subscribe: function (channel, handler) {
      return bus.subscribe(channel, handler);
    }
  }
};
