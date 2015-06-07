'use strict';

module.exports = function(app) {
  var bus = app.bus = require('../' + app.config.get('bus:impl'))(app);
  return bus;
}
