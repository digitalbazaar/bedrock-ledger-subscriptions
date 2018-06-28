/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
const {constants} = require('bedrock').config;
const {schemas} = require('bedrock-validation');

const subscriptionRequest = {
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext([
      'https://www.w3.org/ns/activitystreams',
      constants.WEB_LEDGER_CONTEXT_V1_URL
    ]),
    capability: {
      type: 'object',
      properties: {
        id: schemas.identifier(),
        invoker: schemas.identifier(),
        invocationTarget: schemas.url(),
      }
    }
  },
  additionalProperties: false
};

module.exports.subscriptionRequest = () => (subscriptionRequest);
