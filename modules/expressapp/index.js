var winston = require('winston')
   ,http = require('http')
   ,expressWinston = require('express-winston')
   ,morgan = require('morgan')
   ,express = require('express')
   ,bodyParser = require('body-parser')
   ,multer = require('multer')
   ,path = require('path');

module.exports = function(app) {

  var expressApp = app.expressApp = express();

  // configure body parser
  expressApp.use(bodyParser.json());                         // for parsing application/json
  expressApp.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
  expressApp.use(multer());                                  // for parsing multipart/form-data

  // Log HTTP requests
  if(app.config.get('logger:express:enabled')) {
     expressApp.use(morgan(app.config.get('logger:express:pattern')))
  }

  // Add routes
  var router = require('../router/index')(app);

  // Add static
  expressApp.use(express.static(path.join(app.config.get('rootPath'), 'public')));

  // View engine setup
  //expressApp.set('views', path.join(__dirname, 'views'));
  //expressApp.set('view engine', 'ejs');

  // Log errors
  expressApp.use(expressWinston.errorLogger({
     transports: [
        new winston.transports.Console({ json: true, colorize: true })
     ]
     ,statusLevels: true
  }));

  // A standard error handler - it picks up any left over errors and returns
  // a nicely formatted server 500 error
  expressApp.use(function errorHandler(err, req, res, next){
     if (err.status) res.statusCode = err.status;
     if (res.statusCode < 400) res.status(500);
     //if ('test' != env) console.error(err.stack);
     var accept = req.headers.accept || '';
     //if (~accept.indexOf('html')) {
        //// html
        //var page_html = ejs.renderFile(config.server.distFolder + '/500.html',
        //   {open: '[%', close: '%]',
        //      url: req.originalUrl,
        //      error: err.toString()
        //   }, function(err, page_html){
        //      if (err) return res.send(500, 'Error with the error page. Funny.')
        //      res.setHeader('Content-Type', 'text/html; charset=utf-8');
        //      res.send(page_html);
        //   });
     //} else
     if (~accept.indexOf('json')) {
        // json
        res.setHeader('Content-Type', 'application/json');
        var error = { message: err.message };
        for (var prop in err) error[prop] = err[prop];
        var json = JSON.stringify({ error: error });
        res.end(json);
     } else {
        // plain text
        res.setHeader('Content-Type', 'text/plain');
        res.end(err.toString());
     }
  });

  var port = app.config.get('PORT');
  var ip = app.config.get('IP');

  var server = app.server = http.createServer(expressApp);
  server.listen(port, ip);
  app.logger.info('[express] initialized on %s:%s', ip, port);

  return expressApp;

}