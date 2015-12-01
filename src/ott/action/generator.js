var inherits = require("inherits-js");
var Generator;

/**
 * @abstract
 * @class Generator
 * @constructor
 */
Generator = function() {
    var self = this;

    var g = function*() {
        while (!self.isDone()) {
            yield self.doNext();
        }
    };

    return g();
};

Generator.prototype = {
    constructor: Generator,

    /**
     * @abstract
     */
    isDone: function() {
        throw new TypeError("Method 'isDone' must be implemented");
    },

    /**
     * @abstract
     */
    doNext: function() {
        throw new TypeError("Method 'genNext' must be implemented");
    }
};

Object.setPrototypeOf(Generator.prototype, Object.getPrototypeOf(function*(){}));

Generator.extend = function(prots, statics) {
    return inherits(this, prots, statics);
};

Generator.DEFAULTS = {};

module.exports = Generator;
