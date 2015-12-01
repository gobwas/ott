var argv = require('yargs').argv;
var cp = require("child_process");
var comm = require("../concurrency/communication");
var _ = require("lodash");
var log = require("debug")("main");

var peers = (argv.peers || "").split(",").filter(function(str) {
    return str != "";
});

// initialize gossip protocol agent
// it helps to discover other nodes in system
// and get consistency of system state
var agent = cp.fork(__dirname + "/system.js");
var worker = cp.fork(__dirname + "/worker.js");

// initialize raft/gossip agent with options
comm
    .call(agent, "init", { peers: peers, listen: argv.listen })
    .then(function() {
        //log('init agent: ok');
    })
    .catch(function(err) {
        log('init agent error:', err.stack);
        process.kill(1);
    });

// listen for raft election events
comm
    .listen(agent, function(method, params) {
        if (method == "state") {
            comm.call(worker, method, params)
                .then(function() {})
                .catch(function(err) {
                    log("call worker error:", err);
                });
        }

        return Promise.resolve();
    });


// register signal listeners
["SIGINT", "SIGTERM"].forEach(function(signal) {
    process.on(signal, function() {
        log("got signal: %s", signal);
        agent.kill();
        worker.kill();
    });
});
