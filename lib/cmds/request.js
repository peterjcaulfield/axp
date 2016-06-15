"use strict";

var config = require('../config'), 
    helpers = require('../helpers'),
    Request = require('../request'),
    printer = require('../printer'),
    fetch = require('node-fetch'),
    chalk = require('chalk'),
    Promise = require('es6-promise').Promise;

//TODO handle case sensitivity in yml keys
//TODO handle missing yml keys/values
//TODO pass in config as arg to exec from commmand?
class RequestCommand {

  constructor(program) {
      this._program = program;
      this._queue = [];
  }

  exec() {

      this._queue = this._createRequestQueue();

      this._executeRequests().then(() => {

          if (this._program.info) {
            console.log(chalk.white.underline('stats:'));
            console.log(JSON.stringify(this._stats, null, 4));
          }

      });
  }

  _createRequestQueue() {

      var env = config.envs[this._program.env || 'default'] || config.envs.default;

      return this._program.args.reduce((queue, curr) => {

          if (!config.requests[curr]) {
              console.log(`[info] request \"${curr}\" not found in requests.yml. Skipping.`);
              return queue;
          };

          queue.push(
            new Request(
              curr,
              config.requests[curr],
              { env: env, query: this._program.query })
          );

          return queue;

      }, []);
  }

  _executeRequests() {
      if  (this._program.async) {
          return this._executeRequestsAsync();
      } else {
          return this._executeRequestsSync();
      }
  }

  _executeRequestsSync() {

      return this._queue.reduce((sequence, request) => {

          return sequence.then(() => {

              request.start = process.hrtime();

              return fetch(request.url, request.config);

          }).then((resp) => {

              request.end = process.hrtime(request.start);

              return this._processResponse(request, resp);

          }).catch((e) => console.log(e));

      }, Promise.resolve());
  }

  _executeRequestsAsync() {

      var requestPromises = [];

      this._queue.reduce((requests, request) => {

        request.start = process.hrtime();

          var requestPromise = fetch(request.url, request.config)
              .then((resp) => {

                request.end = process.hrtime(request.start);

                  this._processResponse(request, resp);

              }).catch((e) => console.log(e));

          requestPromises.push(requestPromise);

      }, requestPromises);

      return Promise.all(requestPromises);
  }

  _processResponse(request, resp) {

      var retrieveMethod = resp.headers.get('content-type') === 'application/json' ?
          'json' :
          'text';

      return resp[retrieveMethod]().then((data) => {
          printer.printRequestInfo(this._program, request, resp, data);
      });
  }

}

module.exports = RequestCommand;
