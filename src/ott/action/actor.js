var inherits = require("inherits-js");
var Actor;

/**
 * @abstract
 * @class Actor
 * @constructor
 */
Actor = function() {
    var self = this;

    var actor = function() {
        return self.action.apply(actor, arguments);
    };

    Object.setPrototypeOf(actor, this);

    return actor;
};

Actor.prototype = {
    constructor: Actor,

    /**
     * @abstract
     */
    action: function() {
        throw new TypeError("Method 'action' must be implemented");
    }
};

Object.setPrototypeOf(Actor.prototype, Function.prototype);

Actor.extend = function(prots, statics) {
    return inherits(this, prots, statics);
};

Actor.DEFAULTS = {};

module.exports = Actor;
