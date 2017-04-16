'use strict'

const async = require('async');
const fs = require('fs');
const debug = require('debug')('homework-node:index:');
const request = require('request');
const tarballDownloader = require('download-package-tarball').download;
const _ = require('lodash');

//CONSTANTS (Should be pulled from config);
const NPM_TOP_HOST = process.env.NPM_TOP_HOST || 'https://www.npmjs.com/browse/depended?offset=';
const DIRECTORY = process.env.DIRECTORY || './packages';
const PACKAGE_HOST = process.env.PACKAGE_HOST || 'https://registry.npmjs.org';
const NPM_PAGE_COUNT = process.env.NPM_PAGE_COUNT || 36; //TODO Write a fn that determines this number

module.exports = {
  downloadPackages: downloadPackages,
  findPagesUrls: findPagesUrls
};




//entry point for package downloader
function downloadPackages (count, callback) {
  findTopNumPackages(count, (err, packages) => {
    if (err) return callback(err);

    debug(`downloadPackages:${packages.length} packages found.`);
    iteratePackages(packages, (err) => {
      if (err) return callback(err);

      debug(`Successfully downloaded ${packages.length} packages`);
      callback();
    });
  });
}

//finds top packages from NPM
function findTopNumPackages (count, callback) {
  const Urls = determinePagesUrls(count);
  const packageArr = [];

  async.forEachOf(Urls, (url, i, cb) => {
    //url: [host, numPackages]
    getPackageNames(url[0], url[1], (err, packages) => {
      if (err) return cb(err);
      //insert packages at i-th position to ensure that packages are in correct order
      packageArr[i] = packages;
      cb();
    });

  }, (err) => {
    if (err) return callback(err);
    packageArr = _.flatten(packageArr);
    debug(`Packages to download: ${packageArr.count}`);
    callback(null, packageArr);
  });
}

/*
  Based on count input, determines how many pages of NPM must be parsed
  Returns an object of URLs as key + count for each
*/
function findPagesUrls (count, pageCount, host) {
  let result = [];

  const pages = Math.floor(count/pageCount);
  const lastPageCount = count%pageCount;

  let pageInfo;
  let currentPage = 0;
  let offsetVal;
  let packageCountForPage;

  for (currentPage; currentPage < pages; currentPage++) {
    offsetVal = currentPage*pageCount;
    packageCountForPage = count - currentPage*pageCount

    pageInfo = [`${host}${offsetVal}`, packageCountForPage];
    result.push(pageInfo);
  }


  if (lastPageCount > 0) {
    offsetVal = currentPage*pageCount;
    pageInfo = [`${host}${offsetVal}`, lastPageCount];

    result.push(pageInfo);
  }

  return result;
}

function iteratePackages (packages, callback) {

}

//downloads a single package
function downloadPackage (packageUrl, callback) {

}
