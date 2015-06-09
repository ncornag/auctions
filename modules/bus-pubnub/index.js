'use strict';

module.exports = function(app, name) {
  app.logger.info('[bus] pubnub')

  var pubnub = require("pubnub").init({
    publish_key: app.config.get('bus:' + name + ':publish_key'),
    subscribe_key: app.config.get('bus:' + name + ':subscribe_key'),
    uuid: 'server'
  });

  return {
    send: function (channel, data) {
      pubnub.publish({
        channel: channel,
        message: data
      });
    },
    listen: function(channel, handler) {
      pubnub.subscribe({
        channel: channel,
        message: function(message){
          handler.call(this, null, message);
        },
        error: function(error) {
          handler.call(this, error);
        }
      });
    }
  };
}