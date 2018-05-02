const schemas = require('../schemas');
const { spotify } = require('../constants');
const request = require('request');
const r2 = require('r2');
const querystring = require('querystring');
const boom = require('boom');
const crypto = require('crypto');
const joi = require('joi');

async function getAllPlaylistsPaginated (authToken, data, playlists) {
  if (data && data.next) {
    let response = await r2.get(data.next, { headers: { authorization: authToken }}).json;
    if (!response) {
      throw boom.badImplementation();
    }
    playlists = playlists.concat(response.items.map(i => ({
      id: i.id,
      name: i.name,
      externalHref: i.external_urls.spotify,
      href: i.href,
      owner: i.owner
    })));
    return await getAllPlaylistsPaginated (authToken, response.next, playlists);
  } else {
    return playlists;
  }
}

function getAllTracksPaginated (authToken, href, tracks) {
  let promise = new Promise((resolve, reject) =>
    request.get(href, { headers: { authorization: authToken }, json: true }, (err, res, body) => {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
  }));

  return promise.then((res) => {
    tracks = tracks.concat(res.items.map(i => ({
      href: i.track.href,
      name: i.track.name,
      uri: i.track.uri,
      id: i.track.id,
      externalHref: i.track.external_urls.spotify
    })));
    if (res.next) {
      return getAllTracksPaginated(authToken, res.next, tracks);
    } else {
      return tracks;
    }
  });
}

async function getAllPlaylists (req, h) {
  let authToken = req.headers.authorization;
  try {
    let data = {};
    data.next = 'https://api.spotify.com/v1/me/playlists';
    return await getAllPlaylistsPaginated(authToken, data, []);
  } catch (e) {
    console.log(e);
    throw boom.badImplementation(e);
  }
}

async function getPlaylistTracks (req, h) {
  let authToken = req.headers.authorization;
  let playlist = req.pre.playlists.find(playlist => playlist.name === req.payload.playlist);

  if (!playlist) {
    throw boom.badRequest('Playlist not found.');
  }

  try {
    let tracks = await getAllTracksPaginated(authToken, playlist.href + '/tracks', []);
    return {
      tracks,
      playlist
    };
  } catch (e) {
    console.log(e);
    throw boom.badImplementation(e);
  }
}

const randomInteger = () => crypto.randomBytes(3).readUInt16LE();

function createEmptyPlaylist (req, h) {
  let authToken = req.headers.authorization;
  let userId = req.pre.user.id;
  let playlistName = req.pre.playlistInfo.playlist.name;

  let name = `${playlistName} -shuffled-${randomInteger()}`;
  return new Promise((resolve, reject) => {
    let options = {
      headers: {
        authorization: authToken
      },
      body: {
        name: name,
        public: false,
        description: `Shuffled playlist created by shuffler from playlist ${name}`
      },
      json: true
    }
    request.post(`https://api.spotify.com/v1/users/${userId}/playlists`, options, (err, res, body) => {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    })
  }).then((res) => {
    return {
      name,
      id: res.id,
      href: res.href
    }
  }).catch((err) => boom.badImplementation(err));
}

async function getUser (req, h) {
  let options = {
    headers: { 'Authorization': req.headers.authorization }
  };
  
  // get the user profile
  try {
    let response = r2.get('https://api.spotify.com/v1/me', options).json;
    return response;
  } catch (e) {
    throw boom.badImplementation(e);
  }
}

function shuffleArray(originalArray) {
  var array = [].concat(originalArray);
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function addTracks (uris, authToken, userId, playlistId) {
  return new Promise((resolve, reject) => {
    let url = `https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`;
  
    let options = {
      headers: { 'Authorization': authToken },
      json: true,
      body: {
        uris
      }
    };

    return request.post(url, options, (err, res, body) => {
     if (err) {
       reject(err);
     } else {
       resolve(body);
     }
    });
  });
}

function chunkArray (arr) {
  let i, j , tmpArray, chunk = 90;
  let chunks = [];
  for (i = 0, j = arr.length; i < j; i += chunk) {
    tmpArray = arr.slice(i, i + chunk);
    chunks.push(tmpArray);
  }
  return chunks;
}

function randomizeSpotifyPlaylist (req, h) {
  let tracks = req.pre.playlistInfo.tracks;
  let playlistId = req.pre.newPlaylist.id;
  let userId = req.pre.user.id;
  let shuffledUris = shuffleArray(tracks.map((t => t.uri)));
  let chunks = chunkArray(shuffledUris);
  let authToken = req.headers.authorization;

  let promises = chunks.map((chunk) => addTracks(chunk, authToken, userId, playlistId));
  return Promise.all(promises)
    .then((res) => {
      return h.continue;
    }).catch((err) => boom.badImplementation(err));
}

const randomizePlaylist = {
  pre: [
    [
      { method: getAllPlaylists, assign: 'playlists' },
      { method: getUser, assign: 'user' }
    ],
    { method: getPlaylistTracks, assign: 'playlistInfo' },
    { method: createEmptyPlaylist, assign: 'newPlaylist' },
    { method: randomizeSpotifyPlaylist }
  ],
  handler: (req, h) => {
    return h.response({
      newPlaylist: req.pre.newPlaylist.name
    }).code(200);
  },
  response: {
    schema: schemas.newPlaylist
  },
  description: 'Randomize given spotify playlist',
  validate: {
    payload: joi.object().keys({
      playlist: joi.string().required()
    }),
    headers: joi.object({
      authorization: joi.string().required()
    }).options({ allowUnknown: true })
  },
  tags: ['api'],
};

module.exports = {
  randomizePlaylist
};
