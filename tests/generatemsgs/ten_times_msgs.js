var ipChina = ["1.0.1.2"];
var ipIreland = ["193.1.184.10", "193.1.184.11"];
var ipUS = ["3.4.5.6"];
var ipUnknown = ["127.0.0.1"];
var ipAll = ipUnknown.concat(ipIreland, ipUS, ipChina);

exports = module.exports = [
  {
		appID: '123456789099999999901234',
		instanceID: '123456789099999999904321',
		domain: 'testing',
		cluster: 'development',
		ips: ipAll,
		destinations: ['iphone'],
		hosts: ['lon3app1', 'lon3dyno4', 'lon3app2'],
		cuids: ['iphone789055555678901234', 'iphone789012345678904444', 'iphone789012345678933333'],
		msgs: {
		  appinit: 100000,
		  fhact:   1000000,
		  fhweb:   400000
		}
  },
  {
		appID: '123456789099999999901234',
		instanceID: '123456789099999999904321',
		domain: 'testing',
		cluster: 'development',
		ips: ipAll,
		destinations: ['android'],
		hosts: ['lon3app1', 'lon3dyno4', 'lon3app2'],
		cuids: ['android89055555678901234', 'android89012345678904444', 'android89012345678933333'],
		msgs: {
		  appinit: 100000,
		  fhact:   1000000,
		  fhweb:   400000
		}
  },
  {
		appID: '123456789012345678888888',
		instanceID: '123456789012345678888888',
		domain: 'testing',
		cluster: 'development',
		ips: ipAll,
		destinations: ['iphone', 'android'],
		hosts: ['lon3app1', 'lon3dyno4', 'lon3app2'],
		cuids: ['123456789012345678901234', '123456789012345678901234', '123456789012345678901234'],
		msgs: {
		  appinit: 10000,
		  fhact:   80000,
		  fhweb:   20000
		}
  },
  {
		appID: '2222222222222222222222222',
		instanceID: '2222222222222222222224444',
		domain: 'testing',
		cluster: 'development',
		ips: ipAll,
		destinations: ['iphone'],
		hosts: ['lon3app1', 'lon3dyno4', 'lon3app2'],
		cuids: ['123456789012345678901234', '123456789012345678901234', '123456789012345678901234'],
		msgs: {
		  appinit: 20000,
		  fhact:   200000,
		  fhweb:   80000
		}
  }
  ];
