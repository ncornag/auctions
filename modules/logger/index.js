var winston = require('winston')

module.exports = function(app) {
  var level = app.config.get('logger:level');
  var logger = app.logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ level: level, json: false, timestamp: true, colorize: true })
    ],
    exceptionHandlers: [
      new (winston.transports.Console)({ level: level, json: false, timestamp: true, colorize: true, silent: false, prettyPrint: true  })
    ],
    exitOnError: false
  });
  logger.info('[logger] initialized with [%s] level', level);
  return logger;
}

