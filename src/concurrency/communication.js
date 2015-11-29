var _ = require("lodash");
var uuid = require("uuid");

/**
 * Listens process calls
 * @param process
 * @param handler
 */
exports.listen = function(process, handler) {
    process.on("message", function(msg) {
        var id     = msg.id;
        var method = msg.method;
        var params = msg.params;

        // listen only calls
        if (_.isEmpty(method)) {
            return
        }

        function done(result) {
            process.send({
                id:     id,
                result: result,
                error:  null
            });
        }

        function failed(err) {
            process.send({
                id:     id,
                result: null,
                error:  {
                    code: err.code || -1,
                    message: err.message || "Unknown comm error"
                }
            });
        }

        handler(method, params)
            .then(done)
            .catch(failed)
    });
};

/**
 * Calls process method.
 * @param process
 * @param method
 * @param params
 */
exports.call = function(process, method, params) {
    return new Promise(function(resolve, reject) {
        var id = uuid.v4();

        function listener(msg) {
            var code, message, err;

            if (msg.id !== id) {
                return
            }

            try {
                // remove listener only when received answer
                process.removeListener("message", listener);
            } catch (err) {
                console.log(err);
            }

            if (msg.error) {
                code = msg.error.code;
                message = msg.error.message;

                err = new Error(message);
                err.code = code;

                reject(err);
            } else {
                resolve(msg.result);
            }
        }

        process.addListener("message", listener);
        process.send({ id:id, method:method, params:params })
    });
};
