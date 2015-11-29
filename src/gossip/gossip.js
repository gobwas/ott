var dgram = require("dgram");
var EventEmitter = require("events").EventEmitter;
var uuid = require("uuid");
var _ = require("lodash");
var inherits = require("inherits-js");
var assert = require("assert");
var defer = require("../util/util").defer;
var Transport = require("../net/transport/transport");

const METHOD_SYNC = "g_sync";
const METHOD_PING = "g_ping";
const METHOD_HELLO = "g_hello";
const METHOD_EVENT = "g_event";

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
            this.stateId = 0;
        },

        initialize: function() {
            this.transport.handle(METHOD_SYNC,  this._handleSync.bind(this));
            this.transport.handle(METHOD_PING,  this._handlePing.bind(this));
            this.transport.handle(METHOD_HELLO, this._handleHello.bind(this));
            this.transport.handle(METHOD_EVENT, this._handleEvent.bind(this));

            return Promise.all([
                this.transport.initialize(),
                this._initTimers()
            ]);
        },

        getPeers: function() {
            return this.peers;
        },

        join: function(address) {
            var self = this;
            var peer;

            if (this._isKnown(address)) {
                return Promise.reject(new Error("known peer"));
            }

            peer = {
                address: _.pick(address, "address", "port"),
                status:  false,
                stateId: 0
            };

            return this._greet(peer)
                .then(function() {
                    self.peers.push(peer);
                    self._updateState();
                })
                .catch(function(err){
                    return Promise.reject(new Error("could not join unfriendly host: " + address.address + ":" + address.port));
                })
        },

        broadcast: function(msg) {
            var self = this;

            return Promise.all(this.peers.map(function(peer) {
                return self.transport.call(peer.address, METHOD_EVENT, msg)
                    .then(function(result) {
                        return { result: result };
                    })
                    .catch(function(err) {
                        return { error: err };
                    })
            }));
        },

        _updateState: function() {
            this.stateId++;
            console.log('this.peers', this.peers);
            this.emit("change");
        },

        _initTimers: function() {
            var self = this;

            return new Promise(function(resolve) {
                self.pingIntervalID = setInterval(function() {
                    var peer = self._getPeer();
                    if (!peer) return;

                    self._ping(peer);
                }, _.random(50, 100));

                var syncedId = -1;
                self.syncIntervalID = setInterval(function() {
                    if (syncedId != self.stateId) {
                        syncedId = self.stateId;

                        var peer = self._getPeer();
                        if (!peer) return;

                        self._sync(peer);
                    }
                }, 50);

                resolve();
            });
        },

        _isKnown: function(a) {
            if (eq(a, this.transport.getAddress())) {
                return true;
            }

            return _.any(this.peers, function(p) {
                return eq(p.address, a);
            });
        },

        _ping: function(peer) {
            var self = this;

            // here could be logic of catching ping error
            // moving this peer to the warning list and send this list
            // to the others peers
            // if they are think, that this peer is dead - remove it
            return this.transport.call(peer.address, METHOD_PING, {})
                .then(function() {
                    //peer.status = true;
                })
                .catch(function(err) {
                    //peer.status = false;
                    var dead = _.remove(self.peers, peer);
                    if (dead.length > 0) {
                        console.log("removed peer", dead);
                        self._updateState();
                    }
                });
        },

        /**
         * @private
         * @returns {Promise}
         */
        _sync: function(peer) {
            var self = this;

            return this.transport.call(peer.address, METHOD_SYNC, {
                    state: {
                        peers: this.peers
                    }
                })
                .then(function() {
                    peer.stateId = self.stateId;
                })
        },
        /**
         * @private
         * @returns {Promise}
         */
        _greet: function(peer) {
            return this.transport.call(peer.address, METHOD_HELLO, {
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
            var self = this;

            setImmediate(function() {
                self.join(params.address);
            });

            return Promise.resolve();
        },

        _handleEvent: function(msg) {
            var dfd = defer();

            this.emit("message", msg, dfd.resolve, dfd.reject);

            return dfd.promise;
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

function eq(a, b) {
    return a.address == b.address && a.port == b.port
}

module.exports = Agent;