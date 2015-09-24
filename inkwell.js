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

async.series([
    cliArgs,
    checkCurrentLinkExists,
    formatArgs,
    finalVariables,
    verifyInkwellIgnore,
    debug
], handleError);

function handleError (err) {
    if (err) {
        console.log(chalk.red(err));
        process.exit(1);
    }
}

function cliArgs (cb) {
    console.log(chalk.blue('step 1'));

    if (source === undefined || dest === undefined) {
        cb('Usage: inkwell source destination');
    }
    else {
        cb(null);
    }
}

function checkCurrentLinkExists (cb) {
    console.log(chalk.blue('step 2'));
    fs.lstat(source, function (err, stats) {
        if (err || !stats.isDirectory()) {
            cb(source + ' is not a directory. I can only back up directories.');
        }
        else {
            cb(null);
        }
    });
}

function formatArgs (cb) {
    console.log(chalk.blue('step 3'));
    source = path.resolve(source); //return absolute path and remove possible trailing slash
    dest = path.resolve(dest);
    if (path.basename(dest) === path.basename(source)) { //avoid double nesting
        dest = path.dirname(dest);
    }
    dest = dest + '/' + path.basename(source); //add basename of source to destination
    cb(null);
}

function finalVariables (cb) {
    console.log(chalk.blue('step 4'));

    ignore = source + '/.inkwellignore';
    incomplete = dest + '/incomplete-back-' + date;
    complete = dest + '/back-' + date;
    current = dest + '/current';
    linkDest = current;
    cb(null);
}

function verifyInkwellIgnore (cb) {
    console.log(chalk.blue('step 5'));

    console.log(chalk.magenta('verify inkwell file here'));

    cb(null);
}

function debug (cb) {
    formatDebug('source', source);
    formatDebug('dest', dest);
    formatDebug('ignore', ignore);
    formatDebug('incomplete', incomplete);
    formatDebug('complete', complete);
    formatDebug('linkDest', linkDest);
    formatDebug('date', date);

    if (true) {
        cb(chalk.red('that is all that was programmed - aborting')); //temporary abort
    }
    else {
        cb(null);
    }
}

function formatDebug (label, value) {
    console.log(sprintf('%12s:', label), chalk.yellow(value));
}


//
//Inkwell.prototype.verifyInkwellignore = function() {//look for .inkwellignore
//    var self = this;
//    fs.access(self.ignore, fs.R_OK, ifIgnoreNotFound);//ifIgnoreNotFound is callback
//    function ifIgnoreNotFound(err) {
//        if (err && path.dirname(self.ignore) === '/') {
//            console.log(chalk.bgYellow(self.ignore + ' does not exist in this or any parent directories'));
//            process.exit(1);
//        }
//        else if (err) {
//            self.ignore = path.normalize(path.dirname(self.ignore) + '/../.inkwellignore');
//            fs.access(self.ignore, fs.R_OK, ifIgnoreNotFound);
//            console.log('lookingForIgnore again!');
//        }
//        else {
//            self.makeDestDir();
//        }
//    }
//};
//
//Inkwell.prototype.makeDestDir = function() {
//    var self = this;
//    mkdirp(dest, function (err) {//if destination doesn't exist, make directory
//        if (err) {
//            console.log('Unable to create ' + self.dest);
//            process.exit(1);
//        }
//        else {//AFTER destination is created (if it didn't exist already), then make sure destination is writeable
//            fs.access(self.dest, fs.W_OK, function(err) {
//                if (err) {
//                    console.log(self.dest + ' is not writable');
//                    process.exit(1);
//                }
//            });
//            self.replaceLinkIfMissing();
//        }
//    });
//};
//
//Inkwell.prototype.replaceLinkIfMissing = function() {
//    var self = this;
//    fs.readdir(dest, function(err, files){//read dest directory and pass the array "files"
//        self.linkLatestBackup(files);
//    });
//};
//
//Inkwell.prototype.linkLatestBackup = function(files) {//did I just use a closure?
//    var self = this;
//    this.backups = files.filter(this.filterBack);
//    this.latestBackup = this.backups.sort().reverse()[0];
//    fs.symlink(this.latestBackup + '/', this.current, function(){
//        self.makeBackupDir();
//    });
//};
//
//Inkwell.prototype.filterBack = function(thisFile) {//callback for array.filter(callback), gets (element, index, array)
//    return thisFile.substr(0,5) === 'back-';
//};
//
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
