'use strict'

const async = require('async');
const fs = require('fs');
const debug = require('debug')('homework-node:index:');
const request = require('request');
const tarballDownloader = require('download-package-tarball').download;

//CONSTANTS (Should be pulled from config);
const NPM_TOP_HOST = process.env.NPM_TOP_HOST || 'https://www.npmjs.com/browse/depended?offset=';
const DIRECTORY = process.env.DIRECTORY || './packages';
const PACKAGE_HOST = process.env.PACKAGE_HOST || 'https://registry.npmjs.org';
const NPM_PAGE_COUNT = process.env.NPM_PAGE_COUNT || 36; //TODO Write a fn that determines this number

module.exports = downloadPackages


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
  //fn to determine how many pages to download, which outputs an array of urls
  //fn that takes array and async downloads and parse the pages into sorted array of packages
  const Urls = determinePagesUrls(count);
  async.parallel(urls)
}

/*
  Based on count input, determines how many pages of NPM must be parsed
  Returns an object of URLs as key + count for each
*/
function determinePagesUrls (count, pageCount, host) {
  const pages = Math.floor(count/pageCount);
  const lastPageCount = count%pageCount;

  let result = [];
  let pageInfo;
  let currentPage;

  for (currentPage = 0; currentPage < pages; currentPage++) {
    pageInfo = [`host${i*pageCount}`, pageCount]
    result.push(pageInfo);
  }

  if (lastPageCount > 0) {
    pageInfo = [`host${currentPage*pageCount + lastPageCount}`, pageCount];
    result.push(pageInfo);
  }

  return result;
}

function iteratePackages (packages, callback) {

}

//downloads a single package
function downloadPackage (packageUrl, callback) {

}
