const path = require('path');
const stream = require('stream');
const hapi = require('hapi');
const port = require('./api/constants').port;
const server = new hapi.Server({
  port,
  routes: {
    cors: {
      credentials: true
    }
  },
  host: 'localhost',
  debug: false
});

const api = require('./api');

server.state('spotify', {
  ttl: null,
  isSameSite: false,
  isSecure: false,
  encoding: 'base64json',
  clearInvalid: false,
  strictHeader: true
});

const consoleStream = new stream.Writable({
  objectMode: true,
  write (data, encoding, callback) {
    let log;
    switch (data.event) {
      case 'log':
        log = `${('[' + data.tags.join(', ') + ']')} ${'SERVER'}: ${data.data}`;
        break;
      case 'request':
        log = `${('[' + data.tags.join(', ') + ']')} ${data.method.toUpperCase()} ${data.path}: ${data.data}`;
        break;
      case 'error':
        log = `${'ERROR'}: ${data.error.stack}`;
        break;
      case 'response':
        log = `${data.method.toUpperCase()} ${data.path} ${data.source.remoteAddress} ${data.statusCode.toString()} (${data.responseTime}ms)`;
        break;

      default:
        callback();
        return;
    }
    log = new Date().toString() + ' ' + log;
    console.log(log);
    callback();
  }
});

const register = async function () {
  await server.register([
    api,
    { plugin: require('inert') },
    { plugin: require('vision') },
    { plugin: require('hapi-swagger') },
    {
      plugin: require('good'),
      options: {
        reporters: {
          console: [
            consoleStream
          ]
          // console: [{
          //   module: 'good-squeeze',
          //   name: 'Squeeze',
          //   args: [{
          //       log: '*',
          //       response: '*'
          //   }]
          // }, {
              // module: 'good-console'
          // }, 'stdout']
        }
      }
    },
    { plugin: require('blipp') }
  ]);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

const init = async () => {
  return register().then(() => {
    server.start();
  })
  console.log(`Server running at: ${server.info.uri}`);
};

init();