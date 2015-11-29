var inherits = require("inherits-js");
var uuid = require("uuid");
var EventEmitter = require("events").EventEmitter;
var _ = require("lodash");
var Raft;

const STATE_FOLLOWER  = 0;
const STATE_CANDIDATE = 1;
const STATE_LEADER    = 2;

const MSG_VOTE_REQUEST = 0;
const MSG_HEARTBEAT    = 1;



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
            this.electionTimeoutID = setTimeout(this._changeState.bind(this, STATE_CANDIDATE), _.random(150, 350));
        },

        _startHeartbeat: function() {
            this.heartbeatIntervalID = setInterval(this._heartbeat.bind(this), _.random(50, 100));
        },

        _heartbeat: function() {
            this.broadcast({ type: MSG_HEARTBEAT });
        },

        _stopHearbeat: function() {
            clearInterval(this.heartbeatIntervalID);
        },

        _startElection: function() {
            var self = this;

            console.log("starting election..");

            this
                .broadcast({ type: MSG_VOTE_REQUEST, term: uuid.v4() })
                .then(function(results) {
                    console.log('election results', results);
                    var ok = _.filter(results, function(r) {
                        return !r.error && !!r.result;
                    });

                    if (self.quorum == 0 || ok.length > (self.quorum / 2)) {
                        console.log('i am a leader! (' + ok.length + ' from ' + self.quorum + ')');
                        self._changeState(STATE_LEADER);
                    } else {
                        console.log('i am still follower =( (' + ok.length + ' from ' + self.quorum + ')');
                        self._changeState(STATE_FOLLOWER);
                    }
                });
        },

        _changeState: function(state) {
            console.log("changing state to", state);

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

        DEFAULTS: {}
    }
);

module.exports = Raft;