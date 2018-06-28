/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const asyncHandler = require('express-async-handler');
const bedrock = require('bedrock');
const brLedgerAgent = require('bedrock-ledger-agent');
const database = require('bedrock-mongodb');
const {express} = require('bedrock-express');
const {promisify} = require('util');
const uuid = require('uuid/v4');
const {validate} = require('bedrock-validation');
require('bedrock-ledger-context');

require('./config');

// module API
const api = {};
module.exports = api;

const router = api.router = express.Router();

// must delay defining router endpoints until validation schemas are loaded
// in `bedrock.init` handler in `bedrock-validation`
bedrock.events.on('bedrock.init', () => {
  router.post(
    '/', validate('bedrock-ledger-subscriptions.subscriptionRequest'),
    asyncHandler(async (req, res) => {
      const {id: ledgerAgentId} = req.ledgerAgent;
      const {id: ledgerNodeId} = req.ledgerAgent.node;
      const {capability} = req.body;
      const now = Date.now();
      // TODO: database.hash one or more of these properties for indexing
      const id = `urn:uuid:${uuid()}`;
      const record = {
        id: database.hash(id),
        meta: {created: now, status: 'active', updated: now},
        subscription: {capability, id, ledgerAgentId, ledgerNodeId}
      };
      await database.collections.ledgerSubscriptions.insert(
        record, database.writeOptions);
      res.status(204).end();
    }));
});

bedrock.events.on('bedrock-mongodb.ready', async () => {
  await promisify(database.openCollections)(['ledgerSubscriptions']);
  // await promisify(database.createIndexes)([{
  //   collection: 'identity',
  //   fields: {id: 1},
  //   options: {unique: true, background: false}
  // }]);
});

// register this ledger agent plugin
bedrock.events.on('bedrock.start', () => brLedgerAgent.use(
  'subscription', {api, type: 'service'}));
