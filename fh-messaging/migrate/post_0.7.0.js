var fhmongodb = require('../lib/fhmongodb.js');
var geoip = require('geoip');
var Country = geoip.Country;
var country = new Country('../vendor/GeoIP.dat');
var db = new fhmongodb.Database();
db.name = 'fh-messaging';
function handleErr(err) {
  if (err) {
    console.log('ERROR: ' + err.message);
    if (db) {
      db.tearDown();
    }
    process.exit(1);
  }
}
db.on('tearUp', function (err) {
  handleErr(err);
  console.log('db tearUp');
  db.db.collection('appinit', function (err, collection) {
    handleErr(err);
    fn = function () {
            collection.find({ipAddress: {$exists: true}, country: { $exists: false }}, {limit: 8000},  function (err, cursor) {
              handleErr(err);
              cursor.toArray(function (err, items) {
                handleErr(err);
                var ii, il;
                console.log('entries: ' + items.length);
                for (ii = 0, il = items.length; ii < il; ii += 1) {
                  items[ii].country = country.lookupSync(items[ii].ipAddress);
                  collection.save(items[ii]);
                }
                console.log('finished');
                fn()
              });
            });
    };
    fn();
  });
});
db.on('tearDown', function (err) {
  handleErr(err);
  console.log('db tearDown');
});
db.tearUp();
