'use strict'

const async = require('async');
const fs = require('fs');
const debug = require('debug')('homework-node:index:');
const request = require('request');
const tarballDownloader = require('download-package-tarball');
const tarbalUrlGenerator = require('get-npm-tarball-url').default;


const _ = require('lodash');
const cheerio = require('cheerio');

//CONSTANTS (Should be pulled from config);
const NPM_TOP_HOST = process.env.NPM_TOP_HOST || 'https://www.npmjs.com/browse/depended?offset=';
const DIRECTORY = process.env.DIRECTORY || './packages';
const NPM_PAGE_COUNT = process.env.NPM_PAGE_COUNT || 36; //TODO Write a fn that determines this number

module.exports = {
  downloadPackages: downloadPackages,
  findPagesUrls: findPagesUrls,
  parseHtmlPackages: parseHtmlPackages,
  getPackageNames: getPackageNames,
  findTopNumPackages: findTopNumPackages,
  downloadPackage: downloadPackage,
  downloadPackages: downloadPackages
};




//entry point for package downloader
function downloadPackages (count, callback) {
  findTopNumPackages(count, (err, packageNames) => {
    if (err) return callback(err);

    debug(`downloadPackages:${packageNames.length} packages found.`);
    async.each(packageNames, (pkg, cb) => {
      if (err) return cb(err);

      downloadPackage(pkg, cb);
    },
    err => {
      if (err) return cb(err);
      debug(`Successfully downloaded ${packageNames.length} packages`);
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
  let name;
  let version;


  $('a.version').each((i, cheerioObj) => {
    //cheerio doesn't behave the same as jquery, can't get .text() of this obj
    //therefore using slice;
    version = cheerioObj.children[0].data;
    name = cheerioObj.attribs.href.slice(9);
    packages.push({name, version});
  });


  //Enables us to discover if npm has changed page count
  if (packages.length < num) throw new Error('Packages found <  Num');

  //If last page, returns correct number of packages, not all of them
  if (packages.length > num) packages = packages.slice(0, num);

  debug('parseHtmlPackages: packages parsed -> ', packages);
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


//downloads a single package
function downloadPackage (packageInfo, callback) {
  const url = tarbalUrlGenerator(packageInfo.name, packageInfo.version);
  debug('Tarball Download Url:', url);
  tarballDownloader({
    url: url,
    dir: DIRECTORY
  }).then(()=> {
    callback();
    debug(`Downloaded ${JSON.stringify(packageInfo)}`);
    
  }).catch(err => {
    if (err) return callback(err);
  });
}
