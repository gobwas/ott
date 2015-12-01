var Generator = require("./generator");
var _ = require("lodash");
var assert = require("assert");
var MessageGenerator;

const ID_MIN = 0;
const ID_MAX = 1 << 16;

/**
 * MessageGenerator
 *
 * @class
 * @extends Generator
 */
MessageGenerator = Generator.extend(
    /**
     * @lends MessageGenerator.prototype
     */
    {
        constructor: function(options) {
            var random = (ID_MIN + Math.floor(Math.random() * (ID_MAX - ID_MIN + 1)));
            var time = Date.now();

            this.options = _.extend({}, this.constructor.DEFAULTS, options || {});
            this.uid = random.toString(16) + "-" + time.toString(16);

            return Generator.prototype.constructor.call(this);
        },

        isDone: function() {
            return false;
        },

        doNext: function() {
            this.cnt = this.cnt || 0;
            this.cnt++;
            return this.uid + "-" + this.cnt.toString();
        }
    }
);

module.exports = MessageGenerator;