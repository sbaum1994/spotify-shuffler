const joi = require('joi');

const schemas = {};

const authToken = joi.object().keys({
  token: joi.string().required()
});

schemas.authToken = authToken;

schemas.newPlaylist = joi.object().keys({
  newPlaylist: joi.string().required()
});

module.exports = schemas;
