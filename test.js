'use strict'

const test = require('tape')
const series = require('run-series')
const fs = require('fs')
const folderSize = require('get-folder-size')
const downloadPackages = require('./index.js').downloadPackages;
const async = require('async');

const download = downloadPackages;

test('download', function (t) {
  t.plan(3)

  const COUNT = parseInt(process.env.COUNT, 10) || 10

  series([
    (callback) => download(COUNT, callback),
    verifyCount,
    verifySize,
    verifyLodash
  ], t.end)

  function verifyCount (callback) {
    fs.readdir('./packages', function (err, files) {
      if (err) return callback(err)

      //A fix to look for name spaced packages, which have sub folders
      const nameSpacedPackages = [];
      // Filter .gitignore and other hidden files
      files = files.filter((file) => {
        if (file[0] === "@") {
          nameSpacedPackages.push(file);
          return false;
        }

        return !/^\./.test(file);
      });

      //This code block looks through nameSpaced Packages and verifies their contents
      async.each(nameSpacedPackages, (name, cb) => {
        fs.readdir(`./packages/${name}`, (err, subFiles) => {
          if (err) return cb(err);
          subFiles = subFiles.filter((subFile) => {
              files.push(`${name}/${subFile}`);
              return !/^\./.test(subFiles);
          });

          cb();
        });
      }, (err) => {
        if(err) return callback(err);
        t.equal(files.length, COUNT, `has ${COUNT} files`);
        callback()
      });
    });
  }

  function verifySize (callback) {
    folderSize('./packages', function (err, size) {
      if (err) return callback(err);
      t.ok(size / 1024 > 5 * COUNT, 'min 5k per package');
      callback()
    });
  }

  function verifyLodash (callback) {
    const _ = require('./packages/lodash');
    t.equal(typeof _.map, 'function', '_.map exists');
    callback();
  }
});
