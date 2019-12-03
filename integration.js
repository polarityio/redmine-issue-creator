'use strict';

const request = require('request');
const async = require('async');
const fs = require('fs');
const config = require('./config/config');

let Logger;
let requestWithDefaults;
let initialized = false;
let redmineProperties;

function startup(logger) {
  Logger = logger;
  let requestOptions = {};

  if (typeof config.request.cert === 'string' && config.request.cert.length > 0) {
    requestOptions.cert = fs.readFileSync(config.request.cert);
  }

  if (typeof config.request.key === 'string' && config.request.key.length > 0) {
    requestOptions.key = fs.readFileSync(config.request.key);
  }

  if (typeof config.request.passphrase === 'string' && config.request.passphrase.length > 0) {
    requestOptions.passphrase = config.request.passphrase;
  }

  if (typeof config.request.ca === 'string' && config.request.ca.length > 0) {
    requestOptions.ca = fs.readFileSync(config.request.ca);
  }

  if (typeof config.request.proxy === 'string' && config.request.proxy.length > 0) {
    requestOptions.proxy = config.request.proxy;
  }

  if (typeof config.request.rejectUnauthorized === 'boolean') {
    requestOptions.rejectUnauthorized = config.request.rejectUnauthorized;
  }

  requestOptions.json = true;

  requestWithDefaults = handleRequestError(request.defaults(requestOptions));
}

function handleRequestError(request) {
  return (requestOptions, expectedStatusCode, callback) => {
    return request(requestOptions, (err, resp, body) => {
      if (err) {
        Logger.error(err, 'Error making HTTP request');
        callback({
          // Accounts for the error being a Node.js Error object which is not logged properly
          // unless you access the message and stack properties directly
          err: err instanceof Error ? { msg: err.message, stack: err.stack } : err,
          resp: resp,
          detail: 'Error making HTTP request'
        });
      } else if (resp.statusCode !== expectedStatusCode) {
        callback({
          detail: `Unexpected status code (${resp.statusCode}) when attempting HTTP request`,
          body: body,
          expectedStatusCode: expectedStatusCode,
          statusCode: resp.statusCode
        });
      } else {
        callback(null, body);
      }
    });
  };
}

function initializeData(options, cb) {
  if (initialized === true) {
    return cb(null);
  }

  async.parallel(
    {
      projects: (done) => {
        getData('projects', options, done);
      },
      statuses: (done) => {
        getData('issue_statuses', options, done);
      },
      users: (done) => {
        getData('users', options, done);
      },
      trackers: (done) => {
        getData('trackers', options, done);
      }
    },
    (err, data) => {
      if (err) return cb(err);
      initialized = true;
      redmineProperties = data;

      cb(null);
    }
  );
}

function getData(type, options, cb) {
  const requestOptions = {
    method: 'GET',
    uri: `${options.url}/${type}.json`
  };

  if (options.apiKey.length > 0) {
    requestOptions.headers = {};
    requestOptions.headers['X-Redmine-API-Key'] = options.apiKey;
  }

  requestWithDefaults(requestOptions, 200, (err, body) => {
    if (err) return cb(err);
    cb(null, body[type]);
  });
}

function doLookup(entities, options, cb) {
  let lookupResults = [];

  initializeData(options, (err) => {
    if (err) {
      return cb(err);
    } else {
      entities.forEach((entity) => {
        lookupResults.push({
          entity: entity,
          data: {
            summary: ['Issue Creator'],
            details: redmineProperties
          }
        });
      });
      cb(null, lookupResults);
    }
  });
}

function _createIssue(options, attributes, cb) {
  const requestUpdateOptions = {
    method: 'POST',
    uri: `${options.url}/issues.json`,
    body: {
      issue: attributes
    }
  };

  if (options.apiKey.length > 0) {
    requestUpdateOptions.headers = {};
    requestUpdateOptions.headers['X-Redmine-API-Key'] = options.apiKey;
  }

  Logger.debug({ requestUpdateOptions }, 'Create Issue');
  requestWithDefaults(requestUpdateOptions, 201, (err, body) => {
    if (err) return cb(err);
    cb(null, body.issue);
  });
}

function validateOptions(userOptions, cb) {
  let errors = [];
  if (
    typeof userOptions.url.value !== 'string' ||
    (typeof userOptions.url.value === 'string' && userOptions.url.value.length === 0)
  ) {
    errors.push({
      key: 'url',
      message: 'You must provide your Redmine Server URL'
    });
  }

  if (typeof userOptions.url.value === 'string' && userOptions.url.value.endsWith('/')) {
    errors.push({
      key: 'url',
      message: 'The Redmine Server URL cannot end with a trailing `/`'
    });
  }

  cb(null, errors);
}

function onMessage(payload, options, cb) {
  _createIssue(options, payload, (err, issue) => {
    if (err) {
      Logger.error(err, 'Error creating issue');
      cb(err);
    } else {
      Logger.debug({issue}, 'Created Issue');
      cb(null, issue);
    }
  });
}

module.exports = {
  doLookup: doLookup,
  startup: startup,
  validateOptions: validateOptions,
  onMessage: onMessage
};
