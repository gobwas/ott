var Transform = require("stream").Transform;
var _ = require("lodash");
var assert = require("assert");
var inherits = require("inherits-js");
var MessageTransform;

/**
 * MessageTransform
 *
 * @class
 * @extends Transform
 */
MessageTransform = inherits(Transform,
    /**
     * @lends MessageTransform.prototype
     */
    {
        constructor: function(options) {
            Transform.call(this, options);
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
        _transform: function(chunk, enc, done) {
            throw new TypeError("Method '_transform' must be implemented");
        },

        /**
         * @abstract
         */
        _flush: function(done) {
            throw new TypeError("Method '_flush' must be implemented");
        }
    },

    {
        extend: function(p, s) {
            return inherits(this, p, s);
        },

        DEFAULTS: {}
    }
);

module.exports = MessageTransform;