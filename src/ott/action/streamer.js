var Readable = require("stream").Readable;
var _ = require("lodash");
var assert = require("assert");
var inherits = require("inherits-js");
var Generator;

/**
 * Generator
 *
 * @class
 * @extends Readable
 */
Generator = inherits(Readable,
    /**
     * @lends Generator.prototype
     */
    {
        constructor: function(options) {
            Readable.prototype.constructor.call(this, options);
            this.options = _.extend({}, this.constructor.DEFAULTS, options || {});
        },

        /**
         * @abstract
         */
        _read: function(n) {
            throw new TypeError("Method '_read' must be implemented");
        }
    },

    {
        extend: function(p, s) {
            return inherits(this, p, s);
        },

        DEFAULTS: {}
    }
);

module.exports = Generator;