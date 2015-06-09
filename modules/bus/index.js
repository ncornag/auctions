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
      engines[engine].send(channel, data);
    },
    listen: function(engine, channel, handler) {
      engines[engine].listen(channel, handler);
    }
  }

  return bus;
}
