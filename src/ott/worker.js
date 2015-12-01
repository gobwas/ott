var RedisReader = require("../queue/reader/redis");
var RedisWriter = require("../queue/writer/redis");
var Buffered = require("../queue/transform/buffer");
var HandlerActor = require("../ott/action/handler");
var MessageGenerator = require("../ott/action/gen");
var through = require("through2");
var c = require("../concurrency/communication");
var raft = require("../raft/raft");
var log = require("debug")("worker");

var messageWriter = new RedisWriter({ queue: "messages" });
var errorWriter = new RedisWriter({ queue: "errors" });

var handler = new HandlerActor();
var generator = new MessageGenerator();

const GENERATE_INTERVAL = 500;
var getIntervalID;

var r;
function reader() {
    if (!r) {
        r = new RedisReader({
            highWaterMark: 0,
            limit_per_event: 1
        });

        r
            .pipe(new Buffered({
                limit: 64,
                timeout: 6000
            }))
            .pipe(through.obj(function(c, enc, done) {
                var self = this;

                Promise
                    .all(c.map(function(b) {
                        return handler(b)
                            .then(function() {
                                log('handled message', b.toString());
                            })
                            .catch(function(err) {
                                log('handler error:', err);
                                self.push(b);
                            })
                    }))
                    .then(function() {
                        log('OK', c.length);
                    })
                    .then(done)
                    .catch(done);
            }))
            .pipe(errorWriter)
            .on('error', function(err) {
                log('read handle chain error:', err);
            });
    }

    return r;
}

c.listen(process, function(method, params) {
    if (method == "state") {
        switch (params) {
            case raft.STATE_LEADER: {
                reader().pause();

                getIntervalID = setInterval(function() {
                    var result = generator.next();
                    messageWriter.write(new Buffer(result.value));
                }, GENERATE_INTERVAL);

                break;
            }

            case raft.STATE_FOLLOWER: {
                clearInterval(getIntervalID);
                reader().resume();
                break;
            }

            default: {
                clearInterval(getIntervalID);
                reader().pause();
            }
        }
    }

    return Promise.resolve();
});
