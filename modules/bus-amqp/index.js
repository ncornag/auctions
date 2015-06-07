'use strict';

var url = require('url');
var servicebus = require('servicebus');

module.exports = function(app) {

  function init(config) {
    var parsedUrl = url.parse(config.url);
    var data = {
      url: 'amqp://' + (parsedUrl.auth ? (parsedUrl.auth + '@') : '') + parsedUrl.host
      ,vhost: parsedUrl.path.substring(1)
    }
    var bus = servicebus.bus(data);
    app.logger.info('[bus] connected to [%s]', parsedUrl.host)
    return bus;
  }

  var bus = init(app.config.get('bus'));

  return {
    send: function (channel, data) {
      bus.send(channel, data);
    },
    listen: function (channel, handler) {
      bus.listen(channel, handler);
    }
  }
};
