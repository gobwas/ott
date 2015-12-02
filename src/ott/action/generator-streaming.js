var Streamer = require("./streamer");
var _ = require("lodash");
var assert = require("assert");
var Generator;
var log = require("debug")("generator");

const ID_MIN = 0;
const ID_MAX = 1 << 16;

/**
 * Generator
 *
 * @class
 * @extends Streamer
 */
Generator = Streamer.extend(
    /**
     * @lends Generator.prototype
     */
    {
        constructor: function() {
            Streamer.prototype.constructor.apply(this, arguments);
            var random = (ID_MIN + Math.floor(Math.random() * (ID_MAX - ID_MIN + 1)));
            var time = Date.now();
            this.uid = random.toString(16) + "-" + time.toString(16);
            this.interval = this.options.interval;
        },

        setInterval: function(i) {
            this.interval = i;
        },

        _read: function() {
            var self = this;

            this.cnt = this.cnt || 0;
            this.cnt++;

            if (this.cnt % 10000 == 0) {
                log("exceeded %d", this.cnt);
            }

            if (this.interval > 0) {
                setTimeout(function() {
                    self.push(new Buffer(self.uid + "-" + self.cnt.toString()));
                }, this.interval);
            } else {
                this.push(new Buffer(self.uid + "-" + self.cnt.toString()));
            }

        }
    }
);

module.exports = Generator;