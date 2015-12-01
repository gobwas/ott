var Reader = require("stream").Readable;
var _ = require("lodash");
var assert = require("assert");
var inherits = require("inherits-js");
var QueueReader;

/**
 * QueueReader
 *
 * @class
 * @extends Reader
 */
QueueReader = inherits(Reader,
    /**
     * @lends QueueReader.prototype
     */
    {
        constructor: function(options) {
            Reader.call(this, options);
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
        _read: function(size) {
            throw new TypeError("Method '_read' must be implemented");
        }
    },

    {
        extend: function(p, s) {
            return inherits(this, p, s);
        }
    }
);

module.exports = QueueReader;