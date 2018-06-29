/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brIdentity = require('bedrock-identity');
// const brLedger = require('bedrock-ledger-node');
const brLedgerAgent = require('bedrock-ledger-agent');
const {config} = bedrock;
const {constants} = config;
const database = require('bedrock-mongodb');
const helpers = require('./helpers');
const jsigs = require('jsonld-signatures');
const mockData = require('./mock.data');
const querystring = require('querystring');
let request = require('request');
request = request.defaults({json: true, strictSSL: false});
// const url = require('url');
const uuid = require('uuid/v4');

jsigs.use('jsonld', bedrock.jsonld);

const urlObj = {
  protocol: 'https',
  host: config.server.host,
  pathname: config['ledger-agent'].routes.agents
};

describe('Ledger Subscription API', () => {
  let signedConfig;
  let defaultLedgerAgent;
  let publicLedgerAgent;

  before(done => helpers.prepareDatabase(mockData, done));

  before(done => {
    let regularActor;
    async.auto({
      getRegularUser: callback => brIdentity.get(
        null, mockData.identities.regularUser.identity.id, (err, result) => {
          regularActor = result;
          callback(err);
        }),
      signConfig: callback => jsigs.sign(mockData.ledgerConfigurations.uni, {
        algorithm: 'RsaSignature2018',
        privateKeyPem:
          mockData.identities.regularUser.keys.privateKey.privateKeyPem,
        creator: mockData.identities.regularUser.keys.privateKey.publicKey
      }, (err, result) => {
        signedConfig = result;
        callback(err);
      }),
      addDefault: ['getRegularUser', 'signConfig', (results, callback) => {
        const options = {
          ledgerConfiguration: signedConfig,
          owner: regularActor.id,
          services: ['subscription']
        };
        brLedgerAgent.add(regularActor, null, options, (err, ledgerAgent) => {
          defaultLedgerAgent = ledgerAgent;
          callback(err);
        });
      }],
      addPublic: ['getRegularUser', 'signConfig', (results, callback) => {
        const options = {
          ledgerConfiguration: signedConfig,
          owner: regularActor.id,
          public: true
        };
        brLedgerAgent.add(regularActor, null, options, (err, ledgerAgent) => {
          publicLedgerAgent = ledgerAgent;
          callback(err);
        });
      }]
    }, err => done(err));
  });
  beforeEach(done => {
    helpers.removeCollection('ledger_testLedger', done);
  });

  const regularActor = mockData.identities.regularUser;
  it('records a subscription request', done => {
    const subscriptionRequest = {
      '@context': [
        'https://www.w3.org/ns/activitystreams',
        constants.WEB_LEDGER_CONTEXT_V1_URL
      ],
      capability: {
        id: `urn:uuid:${uuid()}`,
        invoker: `urn:uuid:${uuid()}`,
        invocationTarget: 'https://example.com/send/notifications/here',
      }
    };
    async.auto({
      post: callback => {
        request.post(helpers.createHttpSignatureRequest({
          body: subscriptionRequest,
          identity: regularActor,
          url: defaultLedgerAgent.service.subscriptionService,
        }), (err, res) => {
          assertNoError(err);
          should.exist(res.headers.location);
          res.statusCode.should.equal(201);
          callback(null, res.headers.location);
        });
      },
      test: ['post', (results, callback) => {
        database.collections.ledgerSubscriptions.findOne(
          {id: database.hash(results.post)}, (err, result) => {
            if(err) {
              return callback(err);
            }
            should.exist(result.subscription);
            const {subscription} = result;
            subscription.id.should.equal(results.post);
            subscription.capability.should.eql(subscriptionRequest.capability);
            // TODO: make more detailed assertions about the subscription record
            callback();
          });
      }]
    }, err => {
      assertNoError(err);
      done();
    });
  });
});
