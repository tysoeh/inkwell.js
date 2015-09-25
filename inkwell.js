'use strict';

var sprintf = require('sprintf');
var async = require('async');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var mv = require('mv');
var Rsync = require('rsync');
var moment = require('moment');
var chalk = require('chalk');

var date = moment().format('YYYY-MM-DD.hh-mm-ss');

var source = process.argv[2];
var dest = process.argv[3];

var ignore, incomplete, complete, current, linkDest;
var destContents = [];

async.series([
    cliArgs,
    checkCurrentLinkExists,
    formatArgs,
    finalVariables,
    verifyInkwellIgnore,
    makeDestDir,
    replaceLinkIfMissing,
    linkLatestBackup,
    makeBackupDir,
    debug
], handleError);

function handleError (err) {
    if (err) {
        console.log(chalk.red(err));
        process.exit(1);
    }
}

function cliArgs (next) {
    console.log(chalk.blue('step 1'));

    if (source === undefined || dest === undefined) {
        next('Usage: inkwell source destination');
    }
    else {
        next(null);
    }
}

function checkCurrentLinkExists (next) {
    console.log(chalk.blue('step 2'));
    fs.lstat(source, function (err, stats) {
        if (err || !stats.isDirectory()) {
            next(source + ' is not a directory. I can only back up directories.');
        }
        else {
            next(null);
        }
    });
}

function formatArgs (next) {
    console.log(chalk.blue('step 3'));
    source = path.resolve(source); //return absolute path and remove possible trailing slash
    dest = path.resolve(dest);
    if (path.basename(dest) === path.basename(source)) { //avoid double nesting
        dest = path.dirname(dest);
    }
    dest = dest + '/' + path.basename(source); //add basename of source to destination
    next(null);
}

function finalVariables (next) {
    console.log(chalk.blue('step 4'));

    ignore = source + '/.inkwellignore';
    incomplete = dest + '/incomplete-back-' + date;
    complete = dest + '/back-' + date;
    current = dest + '/current';
    linkDest = current;
    next(null);
}

function verifyInkwellIgnore (next) {
    console.log(chalk.blue('step 5'));
    fs.access(ignore, fs.R_OK, ifIgnoreNotFound);
    function ifIgnoreNotFound(err) {
        if (err && path.dirname(ignore) === '/') {
            console.log(chalk.bgYellow(ignore + ' does not exist in this or any parent directories'));
            process.exit(1);
        }
        else if (err) {
            ignore = path.normalize(path.dirname(ignore) + '/../.inkwellignore');
            fs.access(ignore, fs.R_OK, ifIgnoreNotFound);
            console.log('lookingForIgnore again!');
        }
        else {
            next(null);
        }
    }
}

function makeDestDir (next) {
    console.log(chalk.blue('step 6'));
    mkdirp(dest, function (err) {//if destination doesn't exist, make directory
        if (err) {
            console.log('Unable to create ' + dest);
            process.exit(1);
        }
        else {//AFTER destination is created (if it didn't exist already), then make sure destination is writeable
            fs.access(dest, fs.W_OK, function(err) {
                if (err) {
                    console.log(dest + ' is not writable');
                    process.exit(1);
                }
                else next(null);
            });
        }
    });
}

function replaceLinkIfMissing (next) {
    console.log(chalk.blue('step 7'));
    fs.readdir(dest, function(err, files){//read dest directory and pass the array "files"
        destContents = files;
        next(null);
    });
}

function linkLatestBackup (next) {//did I just use a closure?
    console.log(chalk.blue('step 8'));
    var files = destContents;
    var backups = files.filter(filterBack);
    var latestBackup = backups.sort().reverse()[0];
    fs.symlink(latestBackup + '/', current, function(){
        next(null);
    });
}

function filterBack (thisFile) {//callback for array.filter(callback), gets (element, index, array)
    return thisFile.substr(0,5) === 'back-';
}

function makeBackupDir (next) {
    console.log(chalk.blue('step 9'));
    mkdirp(complete, function (err) {//create 'completed' directory
        if (err) {
            console.log('Unable to create ' + complete);
            process.exit(1);
        }
        else {
            console.log(chalk.cyan('Created ' + complete));
            next(null);
        }
    });
}

function debug (next) {
    formatDebug('source', source);
    formatDebug('dest', dest);
    formatDebug('ignore', ignore);
    formatDebug('incomplete', incomplete);
    formatDebug('complete', complete);
    formatDebug('linkDest', linkDest);
    formatDebug('date', date);

    if (true) {
        next(chalk.red('that is all that was programmed - aborting')); //temporary abort
    }
    else {
        next(null);
    }
}

function formatDebug (label, value) {
    console.log(sprintf('%12s:', label), chalk.yellow(value));
}





//Inkwell.prototype.makeBackupDir = function() {
//    var self = this;
//    mkdirp(this.complete, function (err) {//create 'completed' directory
//        if (err) {
//            console.log('Unable to create ' + self.complete);
//            process.exit(1);
//        }
//        else {
//            console.log(chalk.cyan('Created ' + self.complete));
//        }
//        self.rSync();
//    });
//
//};
//
//Inkwell.prototype.rSync = function() {
//    var self = this;
//    var rsync = new Rsync()
//    .flags('az')
//	  .set('delete')
//	  .set('delete-excluded')
//	  .set('exclude-from', self.ignore)
//	  .set('link-dest', self.linkDest)
//	  .source(self.source)
//	  .destination(self.incomplete);
//
//    rsync.execute(function(error, code, cmd){
//        if (code === 0) { //exit code 0 means rsync was successful
//            self.moveToComplete();
//        }
//        else {
//            console.log(chalk.red('rsync was unsuccessful ' + cmd));
//            process.exit(1);
//        }
//    });
//};
//
//Inkwell.prototype.moveToComplete = function() {
//    var self = this;
//    //console.log('Now's the time to move incomplete to complete.');
//    mv(self.incomplete, self.complete, function(err) {}); //is this callback used on success too?
//    this.clearOldLink();
//};
//
//Inkwell.prototype.clearOldLink = function() {
//    var self = this;
//    //console.log('Now's the time to clear /current');
//    fs.unlink(self.current, function(){}); //maybe put makeNewLink as callback
//    this.makeNewLink();
//};
//
//Inkwell.prototype.makeNewLink = function() {
//    var self = this;
//    //console.log('Now's the time to link /current');
//    fs.symlink(path.basename(self.complete) + '/', self.current, function(){}); //fs.symlink(target, linkname, callback)
//};
