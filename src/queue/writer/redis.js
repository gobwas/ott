var Writer = require("./writer");
var _ = require("lodash");
var assert = require("assert");
var redis = require("redis");
var log = require("debug")("queue");
var RedisWriter;

/**
 * RedisWriter
 *
 * @class
 * @extends Writer
 */
RedisWriter = Writer.extend(
    /**
     * @lends RedisWriter.prototype
     */
    {
        constructor: function() {
            Writer.prototype.constructor.apply(this, arguments);
            this.initialize();
        },

        initialize: function() {
            this.init = new Promise(function(resolve, reject) {
                var res = _.once(resolve);
                var rej = _.once(reject);

                var client = redis.createClient();

                client.on('ready', res.bind(null, client));
                client.on('error', rej);
            });
        },

        _write: function(chunk, enc, done) {
            var self = this;

            this.init.then(function(client) {
                client.rpush(self.options.queue, chunk.toString(), function(err) {
                    if (err) {
                        log('write to %s error: %s', self.options.queue, err);
                    } else {
                        log('has wrote %s to %s', chunk.toString(), self.options.queue);
                    }

                    done(err);
                });
            });
        }
    },

    {
        DEFAULTS: {
            queue: "messages"
        }
    }
);

module.exports = RedisWriter;