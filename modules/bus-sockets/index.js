'use strict';

module.exports = function(app, name) {
  app.logger.info('[bus] socket');

  var io = require('socket.io').listen(app.server);

  io.on('connection', function(socket){
    app.logger.debug('[bus-io] user connected');
    socket.on('disconnect', function(){
      app.logger.debug('[bus-io] user disconnected');
    });
  });


  return {
    send: function (channel, data) {
      io.sockets.emit(channel, data);
    },
    listen: function(channel, handler) {
      io.on(channel, function(message){
        handler.call(this, null, message);
      });
    }
  };
}