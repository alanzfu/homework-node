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


const PackageService = function (opts, cb) {
  /*
    *Initialization: Checks for how many packages are per page
    Calls self.getPackagesPerPage (bottom) after initializing fns
  */

  if (is.function(opts)) {
    cb = opts;
    opts = {};
  }

  const self = this;

  this.config = {
    host: opts.host || 'https://www.npmjs.com/browse/depended?offset=',
    directory : opts.directory || './packages'
  }


  //entry point for package downloader
  this.downloadPackages = (count, callback) => {
    if (!callback) callback = console.log;

    self.findTopNumPackages(count, (err, packageNames) => {
      if (err) return callback(err);

      debug(`downloadPackages:${packageNames.length} packages found.`);
      async.each(packageNames, (pkg, cb) => {
        if (err) return cb(err);

        self.downloadPackage(pkg, cb);
      },
      err => {
        if (err) return callback(err);
        debug(`Successfully downloaded ${packageNames.length} packages`);
        callback();
      });
    });
  }

  //finds top packages from NPM
  this.findTopNumPackages = (count, callback) => {
    const urls = self.findPagesUrls(count);

    let packageArr = [];

    async.forEachOf(urls, (url, i, cb) => {
      //url: [host, numPackages]
      self.getPackageNames(url[0], url[1], (err, packages) => {
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
  this.getPackageNames = (npmUrl, numberOfPackages, cb) => {
    request(npmUrl, (err, resp, html) => {
      if (err) return cb(err);

      const packages = self.parseHtmlPackages(html).slice(0,numberOfPackages);

      if (packages) {
        return cb(null, packages);
      } else {
        cb(err);
      }
    });
  }

  //given npm html + count, returns package names (of count number)
  this.parseHtmlPackages = (html, num) => {
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


    //If last page, returns correct number of packages, not all of them
    if (packages.length > num) packages = packages.slice(0, num);

    debug('parseHtmlPackages: packages parsed -> ', packages);
    return packages;
  }

  /*
  Based on count input, determines how many pages of NPM must be parsed
  Returns an object of URLs as key + count for each
  */
  this.findPagesUrls = (count) => {
    let result = [];
    let pageCount = self.config.pageCount;

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

      pageInfo = [`${self.config.host}${offsetVal}`, packageCountForPage];
      result.push(pageInfo);
    }


    if (lastPageCount > 0) {
      offsetVal = currentPage*pageCount;
      pageInfo = [`${self.config.host}${offsetVal}`, lastPageCount];

      result.push(pageInfo);
    }

    debug('findPagesUrls:',result);
    return result;
  }


  /*
    Downloads a single package
    - @parameters: packageInfo -> {name: 'lodash', version: '2.3'}
  */
  this.downloadPackage = (packageInfo, callback) => {
    const url = tarbalUrlGenerator(packageInfo.name, packageInfo.version);
    debug('Tarball Download Url:', url);
    tarballDownloader({
      url: url,
      dir: self.config.directory
    }).then(()=> {
      callback();
      debug(`Downloaded ${JSON.stringify(packageInfo)}`);

    }).catch(err => {
      if (err) return callback(err);
    });
  }

  /*
    Finds items per page for pagination;
    - @parameters: callback
  */
  this.getPackagesPerPage = (callback) => {
    const url = self.config.host+'0';
    debug('Looking for packages per page on: ', url);

    request(url, (err, resp, body) => {
      if (err) return callback(err);

      //Pass very high number to avoid slice of parseHtml
      const packagesPerPage = self.parseHtmlPackages(body, 10000000000).length;
      debug(`Packages per page: ${packagesPerPage}`);
      self.config.pageCount = packagesPerPage;
      callback(null, packagesPerPage);
    });
  }


  /*
  Called when service is initiated
*/
  self.getPackagesPerPage(cb);
}


module.exports = PackageService;
