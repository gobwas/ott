var Actor = require("./actor");
var _ = require("lodash");
var assert = require("assert");
var HandlerActor;

/**
 * HandlerActor
 *
 * @class
 * @extends Actor
 */
HandlerActor = Actor.extend(
    /**
     * @lends HandlerActor.prototype
     */
    {
        constructor: function(options) {
            this.options = Object.assign({}, this.constructor.DEFAULTS, options || {});
            return Actor.prototype.constructor.call(this);
        },

        action: function(msg) {
            var self = this;

            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    if (Math.random() > self.options.error_rate) {
                        return reject("oops");
                    }

                    resolve();
                }, Math.random()*self.options.speed_rate);
            });
        }
    },

    {
        DEFAULTS: {
            error_rate: 0.85,
            speed_rate: 1000
        }
    }
);

module.exports = HandlerActor;