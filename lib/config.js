/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {config} = require('bedrock');
const path = require('path');

// common validation schemas
config.validation.schema.paths.push(
  path.join(__dirname, '..', 'schemas')
);
