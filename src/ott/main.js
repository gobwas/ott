var argv = require('yargs').argv;
var cp = require("child_process");
var comm = require("../concurrency/communication");
var _ = require("lodash");
var log = require("debug")("main");

// fork worker
// worker is a process that listens IPC events from master
// and do main job of program (reading/writing messages)
var worker = cp.fork(__dirname + "/worker.js");

if (argv.getErrors) {
    return comm
        .call(worker, "errors", {
            delimiter: argv.delimiter || "\n"
        })
        .then(function () {
            process.exit(0);
        })
        .catch(function (err) {
            log('init worker error:', err.stack);
            process.exit(1);
        });
}

comm
    .call(worker, "init", {
        write_interval: argv.interval || 1
    })
    .then(function() {
        //log('init worker: ok');
    })
    .catch(function(err) {
        log('init worker error:', err.stack);
        process.exit(1);
    });


// prepare peer info (aka seed) for gossip
var peers = (argv.peers || "").split(",").filter(function(str) {
    return str != "";
});

// initialize gossip protocol agent
// it helps to discover other nodes in system
// and get consistency of system state
var agent = cp.fork(__dirname + "/system.js");
comm
    .call(agent, "init", { peers: peers, listen: argv.listen })
    .then(function() {
        //log('init agent: ok');
    })
    .catch(function(err) {
        log('init agent error:', err.stack);
        process.exit(1);
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
