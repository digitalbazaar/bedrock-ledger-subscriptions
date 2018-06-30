/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const client = require('./client');
// TODO: make retry options configurable and pass them into queue
// TODO: add bedrock-redis dependency, pull redis host/port/options and pass
// them to bee-queue
const Queue = require('bee-queue');
const queue = new Queue('bedrock-ledger-subscriptions', {isWorker: false});

module.exports = queue;

// `process` can only be run once per queue instance
bedrock.events.on('bedrock.start', callback =>
  bedrock.runOnce('ledgerSubcriptions.queue', () => {
    const processingQueue = new Queue('bedrock-ledger-subscriptions');
    processingQueue.process(async (job) => {
      console.log('Processing jobs', job.id);
      console.log('Job data', job.data);
      const {blockHeight, subscription} = job.data;
      const {invocationTarget: url} = subscription.capability;
      // TODO: does `subscription.capability` go into `notification`?
      const notification = {blockHeight};
      return client.notify({url, notification});
    });
  // FIXME: This does not work
  // }, callback));
  }, () => {
    // FIXME: for some reason this syntax works properly and additional
    // listeners on `bedrock.start` are executed properly, but if `callback`
    // is supplied instead of an arrow function, subsequent `bedrock.start`
    // listeners are not executed
    // rolling bedrock back to v1.11.0 before recent event emitter changes does
    // not have any effect
    callback();
  }));
