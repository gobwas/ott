var RedisReader = require("../queue/reader/evented-redis");
var ErrorsReader = require("../queue/reader/plain-redis");
var RedisWriter = require("../queue/writer/redis");
var Buffered = require("../queue/transform/buffer");
var HandlerActor = require("../ott/action/handler");
var StreamingGenerator = require("../ott/action/generator-streaming");
var through = require("through2");
var c = require("../concurrency/communication");
var raft = require("../raft/raft");
var log = require("debug")("worker");

// create writers to redis
var messageWriter = new RedisWriter({ queue: "messages" });
var errorWriter = new RedisWriter({ queue: "errors" });

// create message handler
var handler = new HandlerActor();

// create message generator
var messageGenerator = new StreamingGenerator({
    highWaterMark: 0,
    interval: 1
});
messageGenerator.pipe(messageWriter);
messageGenerator.pause();


// this could be changed by the parent process
var getIntervalID;

// lazy reader initializer
// we dont wont to init it immediately
// cause it will produce subscribing on queue events
// even if we are in Leader state
var reader = (function() {
    var readerInstance;

    return function() {
        if (!readerInstance) {
            readerInstance = new RedisReader({
                highWaterMark: 0,
                limit_per_event: 1024
            });

            readerInstance
                .pipe(new Buffered({
                    limit: 1024,
                    timeout: 100
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

        return readerInstance;
    };
})();

// register IPC messaging handler
c.listen(process, function(method, params) {
    var errorsReader;

    switch (method) {

        // initialize runtime variables
        case "init": {
            messageGenerator.setInterval(params.write_interval);
            break;
        }

        // parent process wants us to show just errors
        case "errors": {
            return new Promise(function(resolve, reject) {
                errorsReader = new ErrorsReader({
                    queue: "errors"
                });

                errorsReader
                    .pipe(through(function(c, e, done) {
                        process.stdout.write(c);
                        process.stdout.write(params.delimiter);
                        done();
                    }))
                    .on('finish', resolve)
                    .on('error', reject);
            });
        }

        // parent process is switching our state (Leader/Follower)
        case "state": {
            switch (params) {
                case raft.STATE_LEADER: {
                    // stop listening messages
                    reader().pause();

                    // start generation of messages
                    messageGenerator.resume();

                    break;
                }

                case raft.STATE_FOLLOWER: {
                    // stop messages generation
                    messageGenerator.pause();

                    // start listening
                    reader().resume();
                    break;
                }

                default: {
                    // stop all
                    messageGenerator.pause();
                    reader().pause();
                }
            }

            break;
        }
    }

    return Promise.resolve();
});
