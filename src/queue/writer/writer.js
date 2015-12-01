var Writer = require("stream").Writable;
var _ = require("lodash");
var assert = require("assert");
var inherits = require("inherits-js");
var QueueWriter;

/**
 * QueueWriter
 *
 * @class
 * @extends Writer
 */
QueueWriter = inherits(Writer,
    /**
     * @lends QueueWriter.prototype
     */
    {
        constructor: function(options) {
            Writer.call(this);
            this.options = _.extend({}, this.constructor.DEFAULTS, options);
        },

        /**
         * @abstract
         */
        initialize: function() {
            throw new TypeError("Method 'initialize' must be implemented");
        },

        /**
         * @abstract
         */
        _write: function(chunk, enc, done) {
            throw new TypeError("Method '_write' must be implemented");
        }
    },

    {
        extend: function(p, s) {
            return inherits(this, p, s);
        },

        DEFAULTS: {}
    }
);

module.exports = QueueWriter;