const fs = require('fs');

module.exports = {
  html: fs.readFileSync(__dirname + '/npmSample.html','utf8'),
  parsedPackages: [ 'lodash',
  'request',
  'async',
  'express',
  'chalk',
  'bluebird',
  'underscore',
  'commander',
  'debug',
  'moment',
  'react',
  'mkdirp',
  'colors',
  'q',
  'through2',
  'glob',
  'fs-extra',
  'yeoman-generator',
  'minimist',
  'body-parser',
  'react-dom',
  'jquery',
  'gulp-util',
  'babel-runtime',
  'yargs',
  'coffee-script',
  'cheerio',
  'classnames',
  'gulp',
  'winston',
  'uuid',
  'node-uuid',
  'babel-core',
  'object-assign',
  'semver',
  'babel-preset-es2015' ]
}
