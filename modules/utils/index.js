'use strict';

/**
 * Module dependencies.
 */
var events = require('events')
   ,shortId = require('shortid')
   ,util = require('util');

shortId.seed(6977);

module.exports = {

  /**
   * App wide events emmiter
   */
  eventEmitter: new events.EventEmitter()

  ,randomInt: function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Create shorth unique number
   */
  ,newShortId: function () {
    return shortId.generate();
  }

  ,moduleExists: function(name) {
    try {
      return require.resolve(name);
    } catch( e ) {
      return false;
    }
  }

  ,format: function() {
    return util.format.apply(this, arguments);
  }

}
