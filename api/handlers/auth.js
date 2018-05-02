const schemas = require('../schemas');
const { spotify, port } = require('../constants');
const request = require('request');
const r2 = require('r2');
const boom = require('boom');
const querystring = require('querystring');
const crypto = require('crypto');
const redirectUri = `http://localhost:${port}/callback`;

function postOldRequest (url, options) {
  return new Promise((resolve, reject) => 
    request.post(url, options, (err, res, body) => {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    }));
}

async function getTokenRequest (req, h) {
  let options = {
    headers: {
      'Authorization': 'Basic ' + (new Buffer(spotify.clientId + ':' + spotify.clientSecret).toString('base64')),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    form: {
      grant_type: 'client_credentials'
    },
    json: true
  };

  try {
    let response = await postOldRequest(spotify.authTokenUrl, options)
      .then((res) => h.response(res.access_token));
    return response;
  } catch (err) {
    throw boom.unauthorized(err);
  }
}

const getToken = {
  pre: [
    { method: getTokenRequest, assign: 'authToken' }
  ],
  handler: (request, h) => {
    return h.response({
      token: request.pre.authToken
    }).code(200);
  },
  response: {
    schema: schemas.authToken
  },
  description: 'Get spotify auth token, client credentials grant',
  validate: {},
  tags: ['api'],
};

const randomString = (length) => {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const redirect = (req, h) => {
  const scope = 'playlist-modify-private playlist-read-private user-modify-playback-state';
  const state = randomString(16);

  return h.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: spotify.clientId,
      scope,
      redirect_uri: redirectUri,
      state
    })).state('spotify', state);
};

async function handleCallback (req, h) {
  let code = req.query.code || null;
  let state = req.query.state || null;
  let storedState = req.state ? req.state['spotify'] : null;

  if (state === null || state !== storedState) {
    throw boom.unauthorized('State mismatch.');
  }

  h.unstate('spotify');
  let authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + (new Buffer(spotify.clientId + ':' + spotify.clientSecret).toString('base64'))
    },
    json: true
  };

  let promise = new Promise((resolve, reject) => {
    request.post(authOptions, (err, res, body) => {
      if (err) {
        reject(boom.unauthorized('Invalid token'));
      }

      let accessToken = body.access_token;
      let refreshToken = body.refresh_token;

      resolve({
        accessToken,
        refreshToken
      });
    });
  });

  return await promise;
}

async function getUser (req, h) {
  let options = {
    headers: { 'Authorization': 'Bearer ' + req.pre.creds.accessToken }
  };
  
  // get the user profile
  try {
    let response = r2.get('https://api.spotify.com/v1/me', options).json;
    return response;
  } catch (e) {
    throw boom.badImplementation(e);
  }
}

const authorize = {
  handler: redirect,
  description: 'Authorization code flow.',
  validate: {},
  tags: ['api'],
};

const callback = {
  pre: [
    { method: handleCallback, assign: 'creds' },
    { method: getUser, assign: 'user' } // only for testing
  ],
  state: {
    parse: true,
    failAction: 'error'
  },
  handler: (request, h) => {
    return h.response({
      creds: request.pre.creds,
      user: request.pre.user
    }).code(200);
  },
  validate: {},
  tags: ['api']
};

async function handleRefreshToken (req, h) {
  let refreshToken = req.query.refreshToken;
  let authOptions = {
    headers: { 'Authorization': 'Basic ' + (new Buffer(spotify.clientId + ':' + spotify.clientSecret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    },
    json: true
  }

  try {
    let response = await postOldRequest('https://accounts.spotify.com/api/token', authOptions)
      .then(res => h.response(res));
    return response;
  } catch (err) {
    throw boom.unauthorized(err);
  }
}

const refreshToken = {
  pre: [
    { method: handleRefreshToken, assign: 'creds' }
  ],
  handler: (request, h) => {
    return h.response({
      token: request.pre.creds.access_token,
      expiresIn: request.pre.creds.expires_in
    }).code(200);
  },
  state: {
    parse: true,
    failAction: 'error'
  },
  validate: {},
  tags: ['api']
};

module.exports = {
  getToken,
  getTokenRequest,
  authorize,
  refreshToken,
  callback,
  redirect
};
