'use strict'

const debug = require('debug')('homework-node:index:');
const PackageService = require('./lib/packageService');
const packageService = new PackageService({}, (err) => {
  if (err) throw err;

  const count = Number(process.argv[2]) || process.env.COUNT || 10;
  debug(`${count} Packages Comin Up!`);
  packageService.downloadPackages(count);
});
