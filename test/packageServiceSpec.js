'use strict';

const expect = require('chai').expect;
const packageService = require('../index.js');
const fixtures = require('./fixtures');



describe('findPagesUrls', ()=> {
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
