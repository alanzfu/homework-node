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

    //Gets first page of packages to find out how many there are per page
    getPackageNames((err, packages) => {
      if (err) return callback(err);

      const packagesPerPage = packages.length;
      debug(`Packages per page: ${packagesPerPage}`);

      pageCount = Math.ceil(count/packagesPerPage);

      //Requests packages from additional pages if needed
      //Limit to 10 concurrent calls
      async.timesLimit(pageCount - 1, 10, (n, cb) => {
        //get the name of the packages
        getPackageNames(`${NPM_URL}${n}`, (err, pkgs) => {
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
