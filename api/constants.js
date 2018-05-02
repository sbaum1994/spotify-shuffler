const creds = process.env.SPOTIFY_CREDS ? JSON.parse(SPOTIFY_CREDS) : require('../creds.js');

module.exports = {
  spotify: {
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    authTokenUrl: 'https://accounts.spotify.com/api/token'
  },
  port: process.env.PORT || 8888
};
