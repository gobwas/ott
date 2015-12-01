var Transform = require("./transform");
var _ = require("lodash");
var assert = require("assert");
var BufferTransform;

/**
 * BufferTransform
 *
 * @class
 * @extends Transform
 */
BufferTransform = Transform.extend(
    /**
     * @lends BufferTransform.prototype
     */
    {
        constructor: function(options) {
            Transform.prototype.constructor.call(this, _.extend({}, options, { readableObjectMode : true }));
            this.buffer = [];
            this.timeoutID = null;
            this._resetFlushTimeout()
        },

        _doFlush: function() {
            this._resetFlushTimeout();

            if (this.buffer.length > 0) {
                this.push(this.buffer);
                this.buffer = [];
            }
        },

        _resetFlushTimeout: function() {
            clearTimeout(this.timeoutID);
            this.timeoutID = setTimeout(this._doFlush.bind(this), this.options.timeout);
        },

        _transform: function(chunk, enc, done) {
            if (this.options.limit > 0 && this.buffer.length >= this.options.limit) {
                this._doFlush();
            }

            this.buffer.push(chunk);
            done();
        },

        _flush: function(cb) {
            cb();
        }
    },

    {
        DEFAULTS: {
            limit: 1,
            timeout: 1000
        }
    }
);

module.exports = BufferTransform;