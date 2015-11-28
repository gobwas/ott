var dgram = require("dgram");
var EventEmitter = require("events").EventEmitter;
var uuid = require("uuid");
var _ = require("lodash");
var inherits = require("inherits-js");
var assert = require("assert");
var Transport = require("./transport/transport");

/**
 * Agent
 *
 * @class
 * @extends EventEmitter
 */
var Agent = inherits(EventEmitter,
    /**
     * @lends Agent.prototype
     */
    {
        constructor: function(transport) {
            assert(transport instanceof Transport, "Transport is expected");

            EventEmitter.prototype.constructor.call(this);

            this.transport = transport;
            this.peers = [];
            this.state = 0;
        },

        initialize: function() {
            this.transport.handle("sync", this._handleSync.bind(this));
            this.transport.handle("ping", this._handlePing.bind(this));
            this.transport.handle("hello", this._handleHello.bind(this));

            return Promise.all([
                this.transport.initialize(),
                this._initTimers()
            ]);
        },

        add: function(address) {
            var self = this;
            var peer;

            if (this._isKnown(address)) {
                return null
            }

            peer = {
                address: _.pick(address, "address", "port"),
                status:  false,
                state:   0
            };

            self.peers.push(peer);
            self.state++;
            console.log("got new peer", JSON.stringify(peer));

            return peer;
        },

        join: function(address) {
            var peer = this.add(address);
            if (!peer) {
                return Promise.resolve();
            }

            return this._greet(peer);
        },

        _initTimers: function() {
            var self = this;

            return new Promise(function(resolve) {
                self.pingIntervalID = setInterval(function() {
                    var peer = self._getPeer();
                    if (!peer) return;

                    self._ping(peer);
                }, _.random(500, 1000));

                self.syncIntervalID = setInterval(function() {
                    var peer = self._getPeer();
                    if (!peer) return;

                    self._sync(peer);
                }, _.random(500, 1000));

                resolve();
            });
        },

        _isKnown: function(a) {
            var addr = this.transport.getAddress();

            if (a.address == addr.address && a.port == addr.port) {
                return true;
            }

            return _.any(this.peers, function(p) {
                return p.address.address == a.address && p.address.port == a.port;
            });
        },

        _ping: function(peer) {
            var self = this;

            // here could be logic of catching ping error
            // moving this peer to the warning list and send this list
            // to the others peers
            // if they are think, that this peer is dead - remove it
            return this.transport.call(peer.address, "ping", {})
                .then(function() {
                    //peer.status = true;
                })
                .catch(function(err) {
                    //peer.status = false;
                    _.remove(self.peers, peer);
                    console.log("removed peer", JSON.stringify(peer), self.peers.length);
                });
        },

        /**
         * @private
         * @returns {Promise}
         */
        _sync: function(peer) {
            var self = this;

            return this.transport.call(peer.address, "sync", {
                    state: {
                        peers: this.peers
                    }
                })
                .then(function() {
                    peer.state = self.state;
                })
        },
        /**
         * @private
         * @returns {Promise}
         */
        _greet: function(peer) {
            return this.transport.call(peer.address, "hello", {
                address: this.transport.getAddress()
            });
        },

        _handleSync: function(params) {
            var self = this;

            params.state.peers.forEach(function(peer) {
                self.join(peer.address)
            });

            return Promise.resolve();
        },

        _handlePing: function() {
            return Promise.resolve();
        },

        _handleHello: function(params) {
            this.add(params.address);
            return Promise.resolve();
        },

        _getPeer: function() {
            var length, index;

            length = this.peers.length;
            if (length == 0) {
                return null;
            }

            index = Math.floor(Math.random() * length);

            return this.peers[index];
        }
    }
);

module.exports = Agent;