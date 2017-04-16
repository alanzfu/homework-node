'use strict';

const expect = require('chai').expect;
const packageService = require('../index.js');
const fixtures = require('./fixtures');



xdescribe('findPagesUrls', ()=> {
  const PAGE_COUNT = 36;
  const HOST = 'https://www.npmjs.com/browse/depended?offset=';

  it('should create only one element array if < Page count', done => {
    const count = PAGE_COUNT-10;
    const urls = packageService.findPagesUrls(count, PAGE_COUNT, HOST);
    expect(urls.length).to.equal(1);
    expect(urls[0][0]).to.equal(`${HOST}0`);
    expect(urls[0][1]).to.equal(count);
    done();
  });

  it('last element should contain modulo of page count', done => {
    const count = PAGE_COUNT*2+5;
    const urls = packageService.findPagesUrls(count, PAGE_COUNT, HOST);
    expect(urls[urls.length -1][1]).to.equal(count%PAGE_COUNT);
    done();
  });

  it('should contain only count/pageCount elments if modulo of count and pagecount is 0', done => {
    const count = PAGE_COUNT*2;
    const urls = packageService.findPagesUrls(count, PAGE_COUNT, HOST);
    expect(urls.length).to.equal(2);
    done();
  });
});


xdescribe('parseHtmlPackages', () => {
  const html = fixtures.parseHtmlPackages.html;

  it('Should parse all packages', done => {
    const packages = packageService.parseHtmlPackages(html, 36);

    expect(packages.length).to.equal(36);
    expect(packages).to.deep.equal(fixtures.parseHtmlPackages.parsedPackages);
    done();
  });

  it('Should throw if num is > number of packages in html', done => {
    function fn() { parseHtmlPackages(html, 37);}
    expect(fn).to.throw(Error);
    done();
  });
});

//Inconsistent usage of => vs function() due to this.timeout not support =>
xdescribe('getPackageNames', function(){
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


xdescribe('findTopNumPackages', function () {
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


xdescribe('downloadPackage', function () {
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
  this.timeout(2000);
  const COUNT = 2;

  //clean out test-packages directory prior to test
  before()

  it('Should find all the info and put the packages into a destination!', done => {
    packageService.downloadPackages(2, err => {
      if (err) return done(err);

      done();
    });
  });
});
