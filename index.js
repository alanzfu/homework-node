'use strict'

const async = require('async');
const fs = require('fs');
const debug = require('debug')('homework-node:packageService:');
const request = require('request');
const tarballDownloader = require('download-package-tarball');
const tarbalUrlGenerator = require('get-npm-tarball-url').default;
const _ = require('lodash');
const cheerio = require('cheerio');
const is = require('is2');


const NPM_URL = process.env.HOST || 'https://www.npmjs.com/browse/depended?offset=';

/*
  Finds items per page for pagination;
*/
function getPackagesPerPage(callback) {
  const url = NPM_URL + '0';
  debug('Looking for packages per page on: ', url);

  request(url, (err, resp, body) => {
    if (err) return callback(err);

    const packagesPerPage = parseHtmlPackages(body).length;
    debug(`Packages per page: ${packagesPerPage}`);

    callback(null, packagesPerPage);
  });
}


/*
  Downloads a single package
  - @parameters: packageInfo -> {name: 'lodash', version: '2.3'}
*/
function downloadPackage (name, version, directory, callback) {
  const url = tarbalUrlGenerator(name, version);
  debug('Tarball Download Url:', url);

  tarballDownloader({
    url: url,
    dir: directory
  }).then(()=> {
    callback();
    debug(`Downloaded ${name}:${version}`);

  }).catch(err => {
    if (err) return callback(err);
  });
}


//given npm html, returns package names on that page's html
function parseHtmlPackages (html){
  const $ = cheerio.load(html);
  let packages = [];
  let name;
  let version;


  $('a.type-neutral-1').each((i, cheerioObj) => {
    //cheerio doesn't behave the same as jquery, can't get .text() of this obj
    //therefore using slice;

    //Extracting the version information
    version = cheerioObj.children[0].data;

    //Extracting the name information
    name = cheerioObj.attribs.href.slice(9);
    packages.push({name, version});
  });

  debug('parseHtmlPackages: packages parsed -> ', packages);
  return packages;
}

/*
  requests and parses package names from a single url
*/
function getPackageNames (npmUrl, cb) {
    request(npmUrl, (err, resp, html) => {
      if (err) return cb(err);

      const packages = parseHtmlPackages(html);

      if (packages) {
        return cb(null, packages);
      } else {
        cb(new Error("No packages found given npm"));
      }
    });
}

/*
  Finds package names given count,
  potentially making multiple requests if count exceeds packages available on one page
*/
function findTopNumPackages (count, callback){
    let pageCount = 1;

    //Finds number of pages to request (does not assume to be 36)
    getPackagesPerPage((err, packagesPerPage) => {
      if (err) return callback(err);

      pageCount = Math.ceil(count/packagesPerPage);
    });

    let packageArr = [];

    //Limit to 10 concurrent calls
    async.timesLimit(pageCount, 10, (n, cb) => {
      getPackageNames(`${NPM_URL}${n-1}`, (err, packages) => {
        if (err) return cb(err);

        //insert packages at n-th position to ensure that packages are in correct order
        packageArr.push = packages;
        cb();
      });
    }, err => {
      if (err) return callback(err);

      packageArr = _.flatten(packageArr);
      packageArr = packageArr.slice(count);
      callback(null, packageArr);
    });
}

//entry point for package downloader
function downloadPackages (count, callback){

  findTopNumPackages(count, (err, packageNames) => {
    if (err) return callback(err);

    debug(`downloadPackages:${packageNames.length} packages found.`);
    async.each(packageNames, (pkg, cb) => {
      if (err) return cb(err);

      downloadPackage(pkg, cb);
    }, err => {
      if (err) {
        if (callback) return callback(err);
        return;
      }

      debug(`Successfully downloaded ${packageNames.length} packages`);
      if (callback) callback();
    });
  });
}


module.exports = {
  downloadPackages: downloadPackages,
  downloadPackage: downloadPackage,
  getPackagesPerPage: getPackagesPerPage,
  parseHtmlPackages: parseHtmlPackages
};
