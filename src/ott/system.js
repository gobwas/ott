#!/usr/bin/env node
var Gossip = require("../gossip/gossip");
var Raft = require("../raft/raft");
var UDPTransport = require("../net/transport/udp");
var JSONRPCProtocol = require("../net/protocol/jsonrpc").JSONRPCProtocol;
var c = require("../concurrency/communication");
var _ = require("lodash");

c.listen(process, function(method, params) {
    return new Promise(function(resolve, reject) {
        switch (method) {
            case "init": {
                var proto = new JSONRPCProtocol();
                var transport = new UDPTransport(proto, {
                    address: params.listen
                });
                var gossip = new Gossip(transport);

                gossip
                    .initialize()
                    .then(function() {
                        return Promise.all(params.peers.map(function(address) {
                            return gossip.join(address);
                        }));
                    })
                    .then(function() {
                        var raft = new Raft(gossip.broadcast.bind(gossip));
                        q();

                        function q() {
                            raft.setQuorum(gossip.getPeers().length);
                        }

                        return raft.init()
                            .then(function() {
                                gossip.on("change", q);
                                gossip.on("message", function(msg, resolve, reject) {
                                    raft.handle(msg).then(resolve).catch(reject);
                                });
                            });
                    })
                    .then(resolve)
                    .catch(reject);

                break;
            }

            default: {
                reject("unknown method");
            }
        }
    });
});