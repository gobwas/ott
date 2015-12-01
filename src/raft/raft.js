var inherits = require("inherits-js");
var uuid = require("uuid");
var EventEmitter = require("events").EventEmitter;
var _ = require("lodash");
var log = require("debug")("raft");
var Raft;

const STATE_FOLLOWER  = 0;
const STATE_CANDIDATE = 1;
const STATE_LEADER    = 2;

const MSG_VOTE_REQUEST = 0;
const MSG_HEARTBEAT    = 1;

exports.STATE_FOLLOWER = STATE_FOLLOWER;
exports.STATE_CANDIDATE = STATE_CANDIDATE;
exports.STATE_LEADER = STATE_LEADER;

Raft = inherits(EventEmitter,
    /**
     * @lends Raft.prototype
     */
    {
        /**
         * @abstract
         * @class Raft
         * @param {Function} broadcast
         * @param {Object} options
         * @constructor
         */
        constructor: function(broadcast, options) {
            this.broadcast = broadcast;
            this.options = _.extend({}, this.constructor.DEFAULTS, options || {});

            this.electionTerms = [];
            this.quorum = 1;
            this.electionTimeoutID = null;
            this.state = null;
        },

        init: function() {
            var self = this;

            self._changeState(STATE_FOLLOWER);

            return Promise.resolve();
        },

        setQuorum: function(i) {
            this.quorum = i;
        },

        handle: function(msg) {
            var self = this;

            return new Promise(function(resolve, reject) {
                switch (msg.type) {
                    case MSG_HEARTBEAT: {
                        self._restartElectionTimeout();
                        return resolve();
                    }

                    case MSG_VOTE_REQUEST: {
                        if (_.indexOf(self.electionTerms, msg.term) != -1) {
                            return reject("duplication term");
                        }

                        if (self.state == STATE_LEADER) {
                            return reject("i am a leader");
                        }

                        if (self.state == STATE_CANDIDATE) {
                            return reject("i am a candidate");
                        }

                        self._restartElectionTimeout();
                        return resolve(true);
                    }

                    default: {
                        reject("unknown msg type");
                    }
                }
            });
        },

        _restartElectionTimeout: function() {
            clearTimeout(this.electionTimeoutID);
            this.electionTimeoutID = setTimeout(
                this._changeState.bind(this, STATE_CANDIDATE),
                _.random(this.options.election_min, this.options.election_max)
            );
        },

        _startHeartbeat: function() {
            this.heartbeatIntervalID = setInterval(
                this._heartbeat.bind(this),
                _.random(this.options.heartbeat_min, this.options.heartbeat_max)
            );
        },

        _heartbeat: function() {
            this.broadcast({ type: MSG_HEARTBEAT });
        },

        _stopHearbeat: function() {
            clearInterval(this.heartbeatIntervalID);
        },

        _startElection: function() {
            var self = this;

            log("starting election..");
            var quorum = this.quorum;

            this
                .broadcast({ type: MSG_VOTE_REQUEST, term: uuid.v4() })
                .then(function(results) {
                    var ok = _.filter(results, function(r) {
                        return !r.error && !!r.result;
                    });

                    if (quorum == 0 || ok.length > (quorum / 2)) {
                        log("i am the leader: %d from %d", ok.length, quorum);
                        self._changeState(STATE_LEADER);
                    } else {
                        log("i am still follower: %d from %d", ok.length, quorum);
                        self._changeState(STATE_FOLLOWER);
                    }
                })
                .catch(function(err) {
                    log('broadcast error: %s', err.stack);
                })
        },

        _changeState: function(state) {
            switch (state) {
                case STATE_FOLLOWER: {
                    this._restartElectionTimeout();
                    break;
                }
                case STATE_CANDIDATE: {
                    this._startElection();
                    break;
                }
                case STATE_LEADER: {
                    this._startHeartbeat();
                    break;
                }
                default: {
                    throw new Error("unknown state");
                }
            }

            this.state = state;
            this.emit("state", state);
        }
    },

    {
        extend: function(p, s) {
            return inherits(this, p, s);
        },

        DEFAULTS: {
            heartbeat_min: 50,
            heartbeat_max: 100,

            election_min: 250,
            election_max: 450
        }
    }
);

exports.Raft = Raft;