/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {asyncHandler, express} = require('bedrock-express');
const bedrock = require('bedrock');
const brLedgerAgent = require('bedrock-ledger-agent');
const {config} = bedrock;
const database = require('bedrock-mongodb');
const {promisify} = require('util');
const queue = require('./queue');
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
      const id = `${config.server.baseUri}${req.originalUrl}/${uuid()}`;
      const record = {
        id: database.hash(id),
        ledgerNodeId: database.hash(ledgerNodeId),
        meta: {created: now, status: 'active', updated: now},
        subscription: {capability, id, ledgerAgentId, ledgerNodeId}
      };
      await database.collections.ledgerSubscriptions.insert(
        record, database.writeOptions);
      res.location(id).status(201).end();
    }));

  // TODO: implement
  // router.delete('/:subscriptionId');
});

bedrock.events.on('bedrock-mongodb.ready', async () => {
  await promisify(database.openCollections)(['ledgerSubscriptions']);

  // TODO: what is the unique compound index here is it ledgerNodeId +
  // invocationTarget?

  // TODO: implement indexing
  // await promisify(database.createIndexes)([{
  //   collection: 'identity',
  //   fields: {id: 1},
  //   options: {unique: true, background: false}
  // }]);
});

// register this ledger agent plugin
bedrock.events.on('bedrock.start', () =>
  brLedgerAgent.use('subscription', {api, type: 'service'}));

bedrock.events.on('bedrock-ledger-storage.block.add', async (event) => {
  const {blockHeight, ledgerNodeId} = event;
  const query = {ledgerNodeId: database.hash(ledgerNodeId)};
  const projection = {_id: 0, subscription: 1};
  const cursor = database.collections.ledgerSubscriptions.find(
    query, projection);
  while(await cursor.hasNext()) {
    const {subscription} = await cursor.next();
    await queue.createJob({blockHeight, subscription}).save();
  }
});
