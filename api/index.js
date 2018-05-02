const joi = require('joi');
const boom = require('boom');
const auth = require('./handlers/auth');
const playlists = require('./handlers/playlists');

const schemas = {
  errorModel: joi.object().keys({
    error: joi.string().required(),
    message: joi.string().required(),
    statusCode: joi.number().integer().required()
  })
};

const pulse = {
  handler: (request, h) => {
    return h.response({}).code(204);
  },
  response: {
    emptyStatusCode: 204,
    schema: false
  },
  description: 'API Healthcheck',
  plugins: {
    'hapi-swagger': {
      responses: {
        204: {
          description: 'Accepted'
        },
        400: {
          description: 'Bad Request',
          schema: schemas.errorModel,
        },
        500: {
          description: 'Server Error',
          schema: schemas.errorModel,
        }
      },
    },
  },
  validate: {},
  tags: ['api'],
};

module.exports.register = (server, options) => {
  let routes = [
    { method: 'GET', path: '/pulse', config: pulse  },
    { method: 'GET', path: '/authToken', config: auth.getToken },
    { method: 'GET', path: '/authorize', config: auth.authorize },
    { method: 'GET', path: '/callback', config: auth.callback  },
    { method: 'GET', path: '/refreshToken', config: auth.refreshToken  },
    { method: 'POST', path: '/randomizePlaylist', config: playlists.randomizePlaylist }
  ];

  server.route(routes);
};

module.exports.name = 'api';
