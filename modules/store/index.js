'use strict';

module.exports = function(app) {
  var store = app.store = require('../' + app.config.get('store:impl'))(app);
  return store;
}
