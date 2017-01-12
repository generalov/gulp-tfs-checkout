'use strict';
var path = require('path');

// through2 is a thin wrapper around node transform streams
var gutil = require('gulp-util');
var through = require('through2');
var tfs = require('tfs-unlock');
var assign = require('object-assign');
var defaultTo = require('lodash.defaultto');
var valueOrFunction = require('value-or-function');
var PluginError = gutil.PluginError;
var string = valueOrFunction.string;

var PLUGIN_NAME = 'gulp-tfs-checkout';

module.exports = function (outFolder, opts) {
    opts = opts || {};

    tfs.init(opts);

    return through.obj(function (file, enc, callback) {
        if (file.isNull()) {
            return callback(null, file);
        }

        if (file.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Streams not supported!'));
        } else if (file.isBuffer()) {
            var options = assign({}, opts, {
                cwd: defaultTo(string(opts.cwd, file), process.cwd())
            });
            var cwd = path.resolve(options.cwd);
            var outFolderPath = string(outFolder, file);
            if (!outFolderPath) {
                throw new Error('Invalid output folder');
            }
            var basePath = path.resolve(cwd, outFolderPath);
            if (!basePath) {
                throw new Error('Invalid base option');
            }

            var writePath = path.resolve(basePath, file.relative);

            try {
                tfs.checkout([writePath]).then(function () {
                    gutil.log('Checked out file "' + writePath + '"');
                    callback(null, file);
                }, function (error) {
                    gutil.log(gutil.colors.yellow('Warning: Unable to checkout: ' + writePath + ' - Check that this file is under source control and tf.exe works properlly with this file.'));
                    callback(null, file);
                });
            } catch (err) {
                this.emit('error', new gutil.PluginError(PLUGIN_NAME, err, {
                    fileName: writePath
                }));
            }
        }
    });
};
