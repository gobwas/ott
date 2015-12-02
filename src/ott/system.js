var Gossip = require("../gossip/gossip");
var Raft = require("../raft/raft").Raft;
//var UDPTransport = require("../net/transport/udp");
var RedisTransport = require("../net/transport/redis");
var JSONRPCProtocol = require("../net/protocol/jsonrpc").JSONRPCProtocol;
var c = require("../concurrency/communication");
var _ = require("lodash");
var log = require("debug")("agent");

c.listen(process, function(method, params) {
    return new Promise(function(resolve, reject) {
        switch (method) {
            case "init": {
                var proto = new JSONRPCProtocol();
                var transport = new RedisTransport(proto, {
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
                        log('gossip ready');

                        var raft = new Raft(gossip.broadcast.bind(gossip));
                        var updateQuorum = quorumUpdater(raft, gossip);

                        updateQuorum();

                        raft.on("state", function(state) {
                            c.call(process, "state", state);
                        });

                        return raft.init()
                            .then(function() {
                                log('raft ready');

                                gossip.on("change", updateQuorum);
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

function quorumUpdater(raft, gossip) {
    return function() {
        raft.setQuorum(gossip.getPeers().length);
    }
}