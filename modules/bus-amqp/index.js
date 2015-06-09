'use strict';

var url = require('url');
var servicebus = require('servicebus');

module.exports = function(appn name) {
  var configUrl = app.config.get('bus:' + name + ':url')
  var parsedUrl = url.parse(configUrl);
  app.logger.info('[bus] connected to [%s]', parsedUrl.host);

  var bus = servicebus.bus({
    url: configUrl
    ,vhost: parsedUrl.path.substring(1)
  });

  return {
    send: function (channel, data) {
      bus.send(channel, data);
    },
    listen: function (channel, handler) {
      bus.listen(channel, handler);
    }
  }
};
