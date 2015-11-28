var inherits = require("inherits-js");
var _ = require("lodash");
var Protocol;

/**
 * @abstract
 * @class Protocol
 * @constructor
 */
Protocol = function(options) {
    this.options = _.extend({}, this.constructor.DEFAULTS, options || {});
};

Protocol.prototype = {
    constructor: Protocol,

    /**
     * @abstract
     */
    marshal: function(obj) {
        throw new TypeError("Method 'marshal' must be implemented");
    },

    /**
     * @abstract
     */
    unmarshal: function(buffer) {
        throw new TypeError("Method 'unmarshal' must be implemented");
    }
};

Protocol.extend = function(prots, statics) {
    return inherits(this, prots, statics);
};

Protocol.DEFAULTS = {};

module.exports = Protocol;