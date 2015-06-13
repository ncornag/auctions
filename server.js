'use strict';

var app = {};

// Configuration object
require('./modules/config')(app, [
    __dirname + '/config/' + (process.env.NODE_ENV || 'local') + '.json'
    ,__dirname + '/config/defaults.json'
]);

//"impl": "bus-redis", "url": "redis://localhost:6379"
//"impl": "bus-amqp", "url": "amqp://localhost/"

// Logger service
require('./modules/logger')(app);

// Store
require('./modules/store')(app);

// Express App
require('./modules/expressapp')(app);

// Bus
require('./modules/bus')(app);

// Auction module
require('./modules/auctions')(app);

// Start schedulers
app.auctionsService.startAuctionsRunner();
app.auctionsService.startAuctionsCloser();

// Tests
require('./test')(app);
