'use strict';

const expect = require('chai').expect;
const PackageService = require('../lib/packageService.js');
const fixtures = require('./fixtures');
const rimraf = require('rimraf');

const opts = {
  host: 'https://www.npmjs.com/browse/depended?offset=',
  directory : './test-packages'
}
const TEST_DIRECTORY = process.cwd() + '/test-packages';

let packageService;

describe('packageService init + getPackagesPerPage', function() {
  this.timeout(4000);

  it ('Should initialize a packageService with num packages per page', done => {
    packageService = new PackageService(opts, (err, numPackages) => {
      if (err) return done(err);

      //currently 36, but should be updated if NPM changes pagination
      expect(numPackages).to.equal(36);
      expect(Object.keys(packageService)).to.include.members([
        'downloadPackages',
        'findTopNumPackages',
        'getPackageNames',
        'parseHtmlPackages',
        'findPagesUrls',
        'downloadPackage',
        'getPackagesPerPage'
      ]);
      done();
    });
  });
});


describe('findPagesUrls', ()=> {
  const PAGE_COUNT = 36;

  it('should create only one element array if < Page count', done => {
    const count = PAGE_COUNT-10;
    const urls = packageService.findPagesUrls(count);
    expect(urls.length).to.equal(1);
    expect(urls[0][0]).to.equal(`${opts.host}0`);
    expect(urls[0][1]).to.equal(count);
    done();
  });

  it('last element should contain modulo of page count', done => {
    const count = PAGE_COUNT*2+5;
    const urls = packageService.findPagesUrls(count);
    expect(urls[urls.length -1][1]).to.equal(count%PAGE_COUNT);
    done();
  });

  it('should contain only count/pageCount elments if modulo of count and pagecount is 0', done => {
    const count = PAGE_COUNT*2;
    const urls = packageService.findPagesUrls(count);
    expect(urls.length).to.equal(2);
    done();
  });
});


describe('parseHtmlPackages', () => {
  const html = fixtures.parseHtmlPackages.html;

  it('Should parse all packages', done => {
    const packages = packageService.parseHtmlPackages(html);

    expect(packages.length).to.equal(packageService.config.pageCount);
    expect(packages).to.deep.equal(fixtures.parseHtmlPackages.parsedPackages);
    done();
  });
});

//Inconsistent usage of => vs function() due to this.timeout not support =>
describe('getPackageNames', function(){
  //this fn uses a network call
  this.timeout(4000);

  const URL = 'https://www.npmjs.com/browse/depended?offset=36';
  const PACKAGE_COUNT = 30;

  it('Should get all the package names for 1 page', (done) => {
    packageService.getPackageNames(URL, PACKAGE_COUNT, (err, packageNames) => {
      if (err) return done(err);

      expect(packageNames.length).to.equal(PACKAGE_COUNT);
      //this test fluctuates too much for now. may have to test existence of SOME packages not all
      // expect(packageNames).to.have.same.members(fixtures.parseHtmlPackages.parsedPackagesPageTwo);
      done();
    });
  });
});


describe('findTopNumPackages', function () {
  this.timeout(10000);

  const PACKAGE_COUNT = 66;

  it('Should get all the packages names given a count across multiple pages', (done) => {
    packageService.findTopNumPackages(PACKAGE_COUNT, (err, packageNames) => {
      if (err) return done(err);

      expect(packageNames.length).to.equal(PACKAGE_COUNT);
      done();
    });
  });
});


describe('downloadPackage', function () {
  this.timeout(2000000);
  const packageInfo = { name: 'request', version: '2.81.0' };

  it('Should download a package and put it into a destination!', done => {
    packageService.downloadPackage(packageInfo, err => {
      if (err) return done(err);

      done();
    });
  });
});

describe('downloadPackages', function () {
  this.timeout(10000);
  const COUNT = 2;

  //clean out test-packages directory prior to test
  before(done => {
    rimraf(TEST_DIRECTORY, done);
  });


  it('Should find all the info and put the packages into a destination!', done => {
    packageService.downloadPackages(COUNT, err => {
      if (err) return done(err);

      //TODO: Use FS Module to verify packages are downloaded
      done();
    });
  });
});
