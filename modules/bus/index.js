'use strict';

module.exports = function(app) {

  var engines = {};
  var enginesConfig = app.config.get("bus:engines");
  enginesConfig.forEach(function(engineConfig){
    var engine = require('../' + engineConfig.impl)(app, engineConfig.name);
    engines[engineConfig.name] = engine;
  })

  var bus = app.bus = {
    send: function (engine, channel, data) {
      return engines[engine].send(channel, data);
    },
    listen: function(engine, channel, handler) {
      return engines[engine].listen(channel, handler);
    },
    queue: function(engine, channel, message) {
      return engines[engine].queue(channel, message);
    },
    publish: function(engine, queue, message) {
      return engines[engine].publish(queue, message);
    },
    subscribe: function(engine, queue, handler) {
      return engines[engine].subscribe(queue, handler);
    }
  }

  return bus;
}
