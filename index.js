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
const DIRECTORY = './packages';


/*
  Finds number of packages on a single page of npm
  @param {function} callback - optional callback given packages per page
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
  @params {string} name - name of package
  @params {string} version - version of package
  @params {string} directory - destination of the package
  @params {function} callback
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


/*
  Parses html to find package names and verions
  @params {string} html - raw html of the npm page
  @returns {Array} - array of objects {name, version} returned within array
*/
function parseHtmlPackages (html){
  const $ = cheerio.load(html);
  let packages = [];
  let name;
  let version;


  $('a.type-neutral-1').each((i, cheerioObj) => {
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
  Gets package names from a npmurl, parses html for package names and versions
  @params {string} npmUrl - raw html of the npm page
  @params {function} callback
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
  
  @params {int} count - num of top packages
  @params {function} callback
*/
function findTopNumPackages (count, callback){
    let pageCount = 1;

    //Finds number of pages to request (does not assume to be 36)
    getPackagesPerPage((err, packagesPerPage) => {
      if (err) return callback(err);

      pageCount = Math.ceil(count/packagesPerPage);

      let packageArr = [];

      //Limit to 10 concurrent calls
      async.timesLimit(pageCount, 10, (n, cb) => {
        //get the name of the packages
        getPackageNames(`${NPM_URL}${n-1}`, (err, packages) => {
          if (err) return cb(err);

          packageArr = packageArr.concat(packages)
          cb();
        });
      }, err => {
        if (err) return callback(err);

        //return the packages as an array
        packageArr = packageArr.slice(0,count);
        callback(null, packageArr);
      });
    });

}

/*
  Entry point for package downloader

  @params {int} count - num of top packages
  @params {function} callback
*/
function downloadPackages (count, callback){

  findTopNumPackages(count, (err, packageNames) => {
    if (err) return callback(err);

    debug(`downloadPackages:${packageNames.length} packages found.`);
    async.eachLimit(packageNames, 10,(pkg, cb) => {
      if (err) return cb(err);

      downloadPackage(pkg.name, pkg.version, DIRECTORY, cb);
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
  parseHtmlPackages: parseHtmlPackages,
  findTopNumPackages: findTopNumPackages,
  getPackageNames: getPackageNames
};
