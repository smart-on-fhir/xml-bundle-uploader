const FS      = require("fs");
const Path    = require("path");
const Walk    = require("walk");
const request = require("request");
const APP     = require("commander");
const PCG     = require("./package.json");

/**
 * @param {String} path The file path
 * @param {Object|String} options FS.readFile options, optional
 * @returns {Promise<*>}
 */
function readFile(path, options = null)
{
    return new Promise((resolve, reject) => {
        FS.readFile(path, options, (error, result) => {
            if (error) {
                return reject(error);
            }
            resolve(result);
        });
    });
}

/**
 * @param {Object} options The options (everything is optional)
 * @param {String} options.dir The path of the directory to read
 * @param {Function} options.filter A filter function
 * @param {Boolean} options.followLinks
 * @param {Function} cb The callback (visitor) function
 * @returns {Promise<void>}
 */
function forEachFile(options, cb)
{
    options = Object.assign({
        dir: ".",
        filter: null,
        followLinks: false
    }, options);

    return new Promise((resolve, reject) => {
        const walker = Walk.walk(options.dir, {
            followLinks: options.followLinks
        });

        walker.on("errors", function (root, nodeStatsArray, next) {
            reject(
                new Error("Error: " + nodeStatsArray.error + root + " - ")
            );
            next();
        });

        walker.on("end", () => { resolve() });

        walker.on("file", function (root, fileStats, next) {
            let path = Path.resolve(root, fileStats.name);
            if (options.filter && !options.filter(path)) {
                return next();
            }
            cb(path, fileStats, next);
        });
    });
}

APP.version(PCG.version);
APP.option('-d, --dir <dir>'   , 'The directory to walk and search for XML bundles');
APP.option('-s, --server <url>', 'The destination fhir server url');
APP.option('-p, --proxy <url>' , 'HTTP proxy url');

// RUN =========================================================================
APP.parse(process.argv);

// Require input directory!
if (!APP.dir) {
    console.error('No input directory given');
    APP.help();
    process.exit(1);
}

// Require server URL!
if (!APP.server) {
    console.error('No server URL provided');
    APP.help();
    process.exit(1);
}

let idx = 0, task = Promise.resolve({})
forEachFile({
    dir   : APP.dir,
    filter: path => path.endsWith("-bundle.xml")
}, (path, fileStats, next) => {
    task = task.then(() => new Promise((resolve, reject) => {
        return readFile(path)
        .then(xml => {
            console.log(`UPLOADING bundle ${++idx} - ${Path.basename(path)}`);
            request({
                method: "POST",
                url   : APP.server,
                body  : xml,
                headers: {
                    "Content-Type": "application/xml+fhir"
                },
                proxy: APP.proxy
            }, (error, response, body) => {
                if (error) {
                    console.error(response);
                    throw error;
                }
                if (response.statusCode >= 400) {
                    let err = new Error(response.statusMessage);
                    err["details"] = body;
                    console.error(body);
                    throw error;
                }
                resolve(body);
            })
        });
    }));
    next();
});
