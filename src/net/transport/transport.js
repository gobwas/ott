var inherits = require("inherits-js");
var _ = require("lodash");
var Protocol = require("../protocol/protocol");
var assert = require("assert");
var Transport;

/**
 * @abstract
 * @class Transport
 * @constructor
 */
Transport = function(protocol, options) {
    assert(protocol instanceof Protocol, "Protocol is expected");
    assert(!this.protocol, "Protocol is already set");
    this.protocol = protocol;

    this.options = _.extend({}, this.constructor.DEFAULTS, options || {});
};

Transport.prototype = {
    constructor: Transport,

    /**
     * @abstract
     */
    initialize: function() {
        throw new TypeError("Method 'initialize' must be implemented");
    },

    /**
     * @abstract
     */
    call: function(address, method, params) {
        throw new TypeError("Method 'call' must be implemented");
    },

    /**
     * @abstract
     */
    handle: function(method, handler) {
        throw new TypeError("Method 'handle' must be implemented");
    },
    
    /**
     * @abstract
     */
    getAddress: function() {
        throw new TypeError("Method 'getAddress' must be implemented");
    }
};

Transport.extend = function(prots, statics) {
    return inherits(this, prots, statics);
};

Transport.DEFAULTS = {};

module.exports = Transport;
