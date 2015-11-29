/**
 * @class Ack
 * @constructor
 */
function Ack(id) {
    this.id = id;
}

/**
 * @class Request
 * @constructor
 */
function Request(id, method, params) {
    this.id = id;
    this.method = method;
    this.params = params;
}

/**
 * @class Response
 * @constructor
 */
function Response(id, result, error) {
    this.id = id;
    this.result = result;
    this.error = error;
}

/**
 * @class Error
 * @constructor
 */
function Error(code, message) {
    this.code = code;
    this.message = message;
}

exports.Response = Response;
exports.Error = Error;
exports.Request = Request;
exports.Ack = Ack;