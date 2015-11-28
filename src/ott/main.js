var argv = require('yargs').argv;
var cp = require("child_process");
var comm = require("../concurrency/communication");
var _ = require("lodash");

function addr(str) {
    var addr;

    if (!_.isString(str) || str.indexOf(":") == -1) {
        return null
    }

    addr = _.trim(str).split(":");

    return {
        address: addr[0],
        port:    parseInt(addr[1], 10)
    }
}

var peers = (argv.peers || "").split(",").map(addr).filter(function(obj) { return !!obj });

// initialize gossip protocol agent
// it helps to discover other nodes in system
// and get consistency of system state
var gossipAgent = cp.fork(__dirname + "/gossip.js");
comm
    .call(gossipAgent, "init", { peers: peers, listen: addr(argv.listen) })
    .then(function() {
        console.log('init agent ok');
    })
    .catch(function(err) {
        console.log('init agent err', err);
    });

