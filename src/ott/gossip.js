#!/usr/bin/env node
var Agent = require("../gossip/gossip");
var UDPTransport = require("../gossip/transport/udp");
var JSONRPCProtocol = require("../gossip/protocol/jsonrpc").JSONRPCProtocol;
var c = require("../concurrency/communication");

c.listen(process, function(method, params) {
    return new Promise(function(resolve, reject) {
        switch (method) {
            case "init": {
                var proto = new JSONRPCProtocol();
                var transport = new UDPTransport(proto, {
                    address: params.listen
                });
                var gossip = new Agent(transport);

                gossip
                    .initialize()
                    .then(function() {
                        return Promise.all(params.peers.map(function(address) {
                            return gossip.join(address);
                        }));
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


