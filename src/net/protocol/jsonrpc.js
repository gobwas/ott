var _ = require("lodash");
var types = require("./types");
var Ack = types.Ack;
var Request = types.Request;
var Response = types.Response;
var Error = types.Error;
var Protocol = require("./protocol");
var assert = require("assert");
var JSONRPCProtocol;

/**
 * JSONRPCProtocol
 *
 * @class
 * @extends Protocol
 */
JSONRPCProtocol = Protocol.extend(
    /**
     * @lends JSONRPCProtocol.prototype
     */
    {
        marshal: marshal,
        unmarshal: unmarshal
    }
);

exports.JSONRPCProtocol = JSONRPCProtocol;


function marshal(obj) {
    switch (true) {
        case obj instanceof Ack: {
            return new Buffer(JSON.stringify({ ack: true, id: obj.id }));
        }
        default: {
            return new Buffer(JSON.stringify(obj));
        }
    }
}

function unmarshal(buffer) {
    var obj;

    obj = JSON.parse(buffer.toString());

    switch (true) {
        case _.isBoolean(obj.ack): {
            return new Ack(obj.id);
        }
        case _.isString(obj.method): {
            return new Request(obj.id, obj.method, obj.params);
        }
        case _.has(obj, "result") || _.has(obj, "error"): {
            return new Response(obj.id, obj.result, obj.error);
        }
        default: {
            throw new Error("Could not unmarshal");
        }
    }
}

exports.marshal = marshal;
exports.unmarshal = unmarshal;