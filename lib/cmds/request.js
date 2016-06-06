var config = require('../config').getConfig(),
    helpers = require('../helpers'),
    fetch = require('../fetch'),
    chalk = require('chalk'),
    qs = require('qs'),
    Promise = require('es6-promise').Promise;

//TODO pass in config as arg to exec from commmand?
module.exports = {
    exec: (program) => {
        var requestsQueue = createRequestQueue(program, config);
        console.log(requestsQueue);
        executeRequests(program, requestsQueue).then(() => console.log('done'));
    }
}

function executeRequests(program, queue) {
    if  (program.async) {
        return executeRequestsAsync(queue);
    } else {
        return executeRequestsSync(queue);
    }
}

function executeRequestsSync(queue) { 
    return queue.reduce((sequence, request) => {
        return sequence.then(() => {
            return fetch(request); 
        }).then((res) =>{
            processResponse(res);
        }).catch((e) =>{
            console.log(e); 
        });
    }, Promise.resolve());
}

function executeRequestsAsync(queue) {
   return queue.reduce((prev, request) => {
        return fetch(request).then((res) => {
            processResponse(res);
        }).catch((e) =>{
            console.log(e); 
        });
    }, null); 
}

function createRequestQueue(program, config) {
    var env = config.envs[program.env] || config.envs.default;
    return program.args.reduce((queue, curr) => {
        if (!config.requests[curr]) {
            console.warn(chalk.red(`request : ${curr} not found in request.yml. Skipping.`));
            return queue;   
        };
        queue.push(createRequest(program, env, config.requests[curr]));
        return queue;
    }, []);
}

function createRequest(program, env, requestConfig) {
    var requestConfig = Object.assign({}, {
        protocol: '',
        method: '',
        endpoint: '', 
        query: '',
        headers: {},
        body: ''
    }, requestConfig);

    var request = {};
    request.protocol = requestConfig.protocol || 'http:';
    request.host = env.split(':')[0];
    request.port = env.split(':')[1] || '80';
    request.method = requestConfig.method || 'GET';
    request.path = getPath(requestConfig, program.query); 
    request.headers = getHeaders(env, requestConfig);
    request.body = getRequestBody(requestConfig);
    return request;
}

function getRequestBody(r) {
    // TODO file uploads, sanity checks
    var body = r.body,
        contentType = r.headers['content-type'] || '';

    if (contentType === 'application/json') {
        body = JSON.stringify(r.body);
    } else if (contentType === 'application/x-www-form-urlencoded') {
        body = qs.stringify(r.body);
    } else if (contentType === 'multipart/form-data' || helpers.isFilePath(r.body)) {
        // we handle just need the file path to handle this in the request
        body = getAbsoluteFilePath(r.body);
    }
    return body;
}

function getAbsoluteFilePath(path) {
    return `${process.env.HOME}/.axp/${path}`;
}

function getPath(r, q) {
    var path = r.endpoint ? '' + r.endpoint : '';
    path = `${path}${r.query ? '?' + r.query : ''}`  
    path = `${path}${q ? (path.indexOf('?') > -1) ? '&' + q : '?' + q : ''}` 
    return path;
}

function getHeaders(env, r) {
   return Object.assign({}, r.headers, getCookies(env, r));
}

function getCookies(env, r) {
    //TODO implement cookie jar
    return { Cookie: 'foo=bar;baz=qux'};
}

function processResponse(r) {
    if (r.headers['content-type'] === 'application/json') { 
        r.body = helpers.parseJson(r.body);
    }
    console.log(r);
}

