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
      } else if (resp.statusCode === expectedStatusCode) {
        callback(null, body);
      } else if (resp.statusCode === 401) {
        callback({
          detail: `You do not have permission to perform that action`,
          remediation:
            'Please confirm you have provided a valid API key and that your account has permissions to query Redmine.',
          messageType: 'alert-warning',
          body: body,
          expectedStatusCode: expectedStatusCode,
          statusCode: resp.statusCode,
          requestOptions
        });
      } else if (resp.statusCode === 404) {
        callback({
          detail: `Resource could not be found`,
          remediation: 'Please ensure the project set for your Redmine instance is valid.',
          body: body,
          expectedStatusCode: expectedStatusCode,
          statusCode: resp.statusCode,
          requestOptions
        });
      } else {
        callback({
          detail: `Unexpected status code (${resp.statusCode}) when attempting HTTP request`,
          remediation: 'Please ensure your Redmine instance is accessible.',
          body: body,
          expectedStatusCode: expectedStatusCode,
          statusCode: resp.statusCode,
          requestOptions
        });
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
        getData('users', options, (err, users) => {
          if (err) {
            return done(err);
          }
          done(
            null,
            users.map((user) => {
              // add this fullname property which is used for searching
              user.fullname = `${user.login} ${user.firstname} ${user.lastname}`;
              return user;
            })
          );
        });
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

  if (options.adminApiKey.length > 0) {
    requestOptions.headers = {};
    requestOptions.headers['X-Redmine-API-Key'] = options.adminApiKey;
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
      let defaultProjectIndex = 0;
      let defaultTrackerIndex = 0;
      let defaultStatusIndex = 0;
      let defaultAssigneeIndex = 0;

      if (options.defaultProject.length > 0) {
        defaultProjectIndex = redmineProperties.projects.findIndex((project) => {
          return project.name === options.defaultProject.trim();
        });
      }

      if (options.defaultTracker.length > 0) {
        defaultTrackerIndex = redmineProperties.trackers.findIndex((tracker) => {
          return tracker.name === options.defaultTracker.trim();
        });
      }

      if (options.defaultStatus.length > 0) {
        defaultStatusIndex = redmineProperties.statuses.findIndex((status) => {
          return status.name === options.defaultStatus.trim();
        });
      }

      if (options.defaultAssignee.length > 0) {
        defaultAssigneeIndex = redmineProperties.users.findIndex((user) => {
          return user.login === options.defaultAssignee.trim();
        });
      }

      if (defaultProjectIndex === -1) {
        return cb({
          detail: `Default project name '${options.defaultProject}' was not found.`
        });
      }

      if (defaultTrackerIndex === -1) {
        return cb({
          detail: `Default tracker name '${options.defaultTracker}' was not found.`
        });
      }

      if (defaultStatusIndex === -1) {
        return cb({
          detail: `Default status name '${options.defaultStatus}' was not found.`
        });
      }

      if (defaultAssigneeIndex === -1) {
        return cb({
          detail: `Default assignee login name '${options.defaultAssignee}' was not found.`
        });
      }

      entities.forEach((entity) => {
        lookupResults.push({
          entity: entity,
          isVolatile: true,
          data: {
            summary: ['Issue Creator'],
            details: {
              properties: redmineProperties,
              defaultProjectIndex: defaultProjectIndex,
              defaultTrackerIndex: defaultTrackerIndex,
              defaultStatusIndex: defaultStatusIndex,
              defaultAssigneeIndex: defaultAssigneeIndex
            }
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
    if (err) {
      return cb(err);
    }

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

  if (
    typeof userOptions.adminApiKey.value !== 'string' ||
    (typeof userOptions.adminApiKey.value === 'string' && userOptions.adminApiKey.value.length === 0)
  ) {
    errors.push({
      key: 'adminApiKey',
      message: 'You must provide your Redmine Admin API Key'
    });
  }

  if (
    typeof userOptions.apiKey.value !== 'string' ||
    (typeof userOptions.apiKey.value === 'string' && userOptions.apiKey.value.length === 0)
  ) {
    errors.push({
      key: 'apiKey',
      message: 'You must provide your Redmine User API Key'
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
      Logger.debug({ issue }, 'Created Issue');
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
