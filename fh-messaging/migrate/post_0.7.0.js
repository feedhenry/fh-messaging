var fhmongodb = require('../lib/fhmongodb.js');
var geoip = require('geoip-lite');
var countries = require('countries-list').countries;
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
                  var geo = geoip.lookup(items[ii].ipAddress).country;
                  items[ii].country = {
                    continent_code: countries[geo.country].continent,
                    country_code: geo.country,
                    country_name: countries[geo.country].name,
                    region: geo.region,
                    city: geo.city
                  };
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
