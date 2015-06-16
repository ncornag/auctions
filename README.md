# Auction Server

## install

```
npm install
```

## PubNub config

Add the PubNub publish key in defaults.json (bus:pn)
Change the server default bus implementation in defaults.json to

```
{
  "bus": {
    ...
    "default": "pn"
    ...
  }
}

```

Change the client default bus implementation in app.js to

```
constant('BUSIMPL', 'pnBusService')
```

## Redis

Configure the redis url in defaults.js:

```
{
  "bus" : {
    ...
    "srv": {
      "url": "redis://..."
    }
    ...
  },
  ...
  "store": {
    ...
    "url": "redis://..."
    ...
  }
}
```

## run

```
node server.js
```

## optional

### Livereload

Install https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei

```
npm install -g livereload2
livereload ./public
```

### Supervisor

```
npm install -g supervisor
supervisor --ignore public server.js
```
