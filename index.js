'use strict'

const async = require('async');
const fs = require('fs');
const debug = require('debug')('homework-node:index:');
const request = require('request');
const tarballDownloader = require('download-package-tarball').download;
const _ = require('lodash');
const cheerio = require('cheerio');

//CONSTANTS (Should be pulled from config);
const NPM_TOP_HOST = process.env.NPM_TOP_HOST || 'https://www.npmjs.com/browse/depended?offset=';
const DIRECTORY = process.env.DIRECTORY || './packages';
const PACKAGE_HOST = process.env.PACKAGE_HOST || 'https://registry.npmjs.org';
const NPM_PAGE_COUNT = process.env.NPM_PAGE_COUNT || 36; //TODO Write a fn that determines this number

module.exports = {
  downloadPackages: downloadPackages,
  findPagesUrls: findPagesUrls,
  parseHtmlPackages: parseHtmlPackages,
  getPackageNames: getPackageNames,
  findTopNumPackages: findTopNumPackages
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
  const urls = findPagesUrls(count, NPM_PAGE_COUNT, NPM_TOP_HOST);
  let packageArr = [];

  async.forEachOf(urls, (url, i, cb) => {
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
    debug(`Packages to download: ${packageArr.length}`);
    callback(null, packageArr);
  });
}

//given npm url, requests the html and returns packages
function getPackageNames(npmUrl, numberOfPackages, cb) {
  request(npmUrl, (err, resp, html) => {
    if (err) return cb(err);

    const packages = parseHtmlPackages(html, numberOfPackages);

    if (packages) {
      return cb(null, packages);
    } else {
      cb(err);
    }
  });
}


//given npm html + count, returns package names (of count number)
function parseHtmlPackages(html, num) {
  const $ = cheerio.load(html);
  let packages = []
  let packageName;

  $('a.name').each((i, jqObj) => {
    //cheerio doesn't behave the same as jquery, can't get .text() of this obj
    //therefore using slice;
    packageName = jqObj.attribs.href.slice(9);
    packages.push(packageName);
  });

  debug('parseHtmlPackages: packages parsed -> ', packages);

  //Enables us to discover if npm has changed page count
  if (packages.length < num) throw new Error('Packages found <  Num');

  //If last page, returns correct number of packages, not all of them
  if (packages.length > num) packages = packages.slice(0, num);

  return packages;
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
  let currentPage;
  let offsetVal;
  let packageCountForPage;

  for (currentPage = 0; currentPage < pages; currentPage++) {
    offsetVal = currentPage*pageCount;
    packageCountForPage = count - currentPage*pageCount;

    packageCountForPage = packageCountForPage > pageCount ? pageCount : packageCountForPage;

    pageInfo = [`${host}${offsetVal}`, packageCountForPage];
    result.push(pageInfo);
  }


  if (lastPageCount > 0) {
    offsetVal = currentPage*pageCount;
    pageInfo = [`${host}${offsetVal}`, lastPageCount];

    result.push(pageInfo);
  }

  debug('findPagesUrls:',result);
  return result;
}

function iteratePackages (packages, callback) {

}

//downloads a single package
function downloadPackage (packageUrl, callback) {

}
