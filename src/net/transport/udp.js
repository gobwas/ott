var Transport = require("./transport");
var _ = require("lodash");
var types = require("../protocol/types");
var Ack = types.Ack;
var Request = types.Request;
var Response = types.Response;
var Error = types.Error;
var uuid = require("uuid");
var deferOn = require("../../util/util").deferTimeout;

var dgram = require("dgram");
var UDPTransport;

/**
 * UDPTransport
 *
 * @class
 * @extends Transport
 */
UDPTransport = Transport.extend(
    /**
     * @lends UDPTransport.prototype
     */
    {
        constructor: function() {
            Transport.prototype.constructor.apply(this, arguments);

            this.messageStack = [];
            this.ackStack = [];
            this.pending = {};
            this.handlers = {};
            this.known = [];
        },

        initialize: function() {
            var self = this;

            this.flushIntervalID = setInterval(function() {
                self._flushBuffer();
            }, 100);

            return this._listenAndServe();
        },

        call: function(address, method, params) {
            return this._sendRequest(address, method, params, 5000);
        },

        handle: function(method, handler) {
            this.handlers[method] = handler;
        },

        getAddress: function() {
            return this.address;
        },

        _listenAndServe: function() {
            var self = this;

            return new Promise(function(resolve, reject) {
                var socket = dgram.createSocket("udp4");
                var resolved = false;

                socket.on("error", function(err) {
                    console.log(err);

                    if (!resolved) {
                        reject(err);
                    }
                });

                socket.on("message", function(b, rinfo) {
                    var pending, handler, msg, from;

                    from = _.pick(rinfo, "address", "family", "port");

                    try {
                        msg = self.protocol.unmarshal(b);
                    } catch (err) {
                        console.log('unmarshal error', err, b.toString());
                        return
                    }

                    if (msg instanceof Ack) {
                        // remove message id from the messages buffer
                        _.remove(self.messageStack, { id: msg.id });
                        return;
                    }

                    self._sendAck(from, msg.id);

                    // check that we dont know yet about this message
                    if (self.known.indexOf(msg.id) != -1) {
                        return;
                    }
                    self.known.push(msg.id);

                    switch (true) {
                        case msg instanceof Request: {
                            handler = self.handlers[msg.method];
                            if (_.isFunction(handler)) {
                                handler(msg.params)
                                    .then(function(result) {
                                        self._sendResult(from, msg.id, result)
                                    })
                                    .catch(function(err) {
                                        self._sendError(from, msg.id, err.toString(), err.code)
                                    });
                            }

                            break;
                        }
                        case msg instanceof Response: {
                            pending = self.pending[msg.id];
                            if (!_.isUndefined(pending)) {
                                if (_.isObject(msg.error)) {
                                    pending.reject(new Error(msg.error.message, msg.error.code))
                                } else {
                                    pending.resolve(msg.result)
                                }
                            }

                            return
                        }
                    }
                });

                socket.on("listening", function() {
                    var address = socket.address();

                    resolved = true;

                    self.socket = socket;
                    self.address = address;

                    console.log("gossip listening " + address.family + " " + address.address + ":" + address.port);

                    resolve();
                });

                if (_.isObject(self.options.address)) {
                    socket.bind(self.options.address);
                } else {
                    socket.bind();
                }
            });
        },

        _flushBuffer: function() {
            var self = this;
            var ack = self.ackStack.slice();
            var msg = self.messageStack.slice();

            // drop acks
            self.ackStack = [];

            // drop old msg
            self.messageStack = msg.filter(function(def) {
                def.attempt = def.attempt || 0;
                return def.attempt < 10;
            });

            // concat acknowledgements and messages together
            // group by recipient address
            return ack.concat(msg).map(function(def) {
                return new Promise(function(resolve, reject) {
                    var buf = def.buf;
                    var peer = def.address;

                    def.attempt++;

                    self.socket.send(buf, 0, buf.length, peer.port, peer.address, function(err) {
                        if (err) {
                            console.log('socket send error', err);
                            return reject(err);
                        }

                        resolve();
                    });
                });
            });
        },

        _sendAck: function(address, id) {
            this.ackStack.push({
                address: address,
                buf: this.protocol.marshal(new Ack(id))
            });
        },

        _sendResult: function(address, id, result) {
            this.messageStack.push({
                id:      id,
                address: address,
                buf:     this.protocol.marshal(new Response(id, result, null))
            });
        },

        _sendError: function(address, id, err, code) {
            var error = new Error(code || -1, err || "unknown error");

            this.messageStack.push({
                id:      id,
                address: address,
                buf:     this.protocol.marshal(new Response(id, null, error))
            });
        },

        _sendRequest: function(address, method, params, timeout) {
            var id, req, dfd;

            id = uuid.v4();
            req = new Request(id, method, params);

            this.messageStack.push({
                id:      id,
                address: address,
                buf:     this.protocol.marshal(req)
            });

            dfd = this.pending[id] = deferOn(timeout);

            return dfd.promise;
        }
    }
);

module.exports = UDPTransport;