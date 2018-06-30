/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const axios = require('axios');

// TODO: do this in a module bedrock-strict-ssl?
process.env.NODE_TLS_REJECT_UNAUTHORIZED =
  (process.env.NODE_ENV === 'production') ? 1 : 0;

const api = {};
module.exports = api;

// TODO: make ocap authentication work
api.notify = ({notification, url}) => {
  return axios.post(url, notification);
};
