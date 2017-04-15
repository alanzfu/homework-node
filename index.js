'use strict'
const async = require('async');
const fs = require('fs');
const debug = require('debug')('homework-node:index:');

module.exports = downloadPackages


//entry point for package downloader
function downloadPackages (count, callback) {
  async.series([
    findTopNumPackages,
    downloadPackages
  ], (err, result) => {
    if (err) return callback(err);
    debug(`Succesfully downloaded ${count} packages`);
    callback();
  });
}

//finds top packages from NPM
function findTopNumPackages (count, callback) {

}

//downloads a single package
function downloadPackage (packageUrl, callback) {

}

/*
  find (x) number of packages
  //download package
*/
