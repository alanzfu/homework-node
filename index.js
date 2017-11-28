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


/**
  * Parses html to find package names and verions
  * @param {string} html - raw html of the npm page
  * @returns {Array} - array of objects {name, version} returned within array
*/
function parseHtmlPackages (html) {
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

/**
  Gets package names from a npmurl, parses html for package names and versions
  @param {string} npmUrl - raw html of the npm page
  @param {function} callback
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

/**
  Finds package names given count,
  potentially making multiple requests if count exceeds packages available on one page

  @param {int} count - num of top packages
  @param {function} callback
*/
function findTopNumPackages (count, callback) {
    let pageCount = 1;

    //Gets first page of packages to find out how many there are per page
    let url = NPM_URL;
    getPackageNames(NPM_URL, (err, packages) => {
      if (err) return callback(err);

      const packagesPerPage = packages.length;
      debug(`Packages per page: ${packagesPerPage}`);

      pageCount = Math.ceil(count/packagesPerPage) - 1;
      debug(`Total additional pages to request: ${pageCount}`);


      //Requests packages from additional pages if needed
      //Limit to 10 concurrent calls
      async.timesLimit(pageCount, 10, (n, cb) => {
        //offset by number of packages per page
        url = `${NPM_URL}${(n+1)*packagesPerPage}`
        debug(`Requesting packages from: ${url}`);

        //get the name of the packages
        getPackageNames(url,(err, pkgs) => {
          if (err) return cb(err);

          packages = packages.concat(pkgs)
          cb();
        });
      }, err => {
        if (err) return callback(err);

        //return the packages as an array
        packages = packages.slice(0,count);
        callback(null, packages);
      });
    });
}


/**
  Downloads a single package
  @param {string} name - name of package
  @param {string} version - version of package
  @param {string} directory - destination of the package
  @param {function} callback
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


/**
  Entry point for package downloader

  @param {int} count - num of top packages
  @param {function} callback
*/
function downloadPackages (count, callback) {

  findTopNumPackages(count, (err, packageNames) => {
    if (err) return callback(err);

    debug(`downloadPackages:${packageNames.length} packages found.`);
    async.eachLimit(packageNames, 10, (pkg, cb) => {
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
  parseHtmlPackages: parseHtmlPackages,
  findTopNumPackages: findTopNumPackages,
  getPackageNames: getPackageNames
};
