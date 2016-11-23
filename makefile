CWD=`pwd`

test: npm_deps
	whiskey --dependencies tests/dependencies.json --only-essential-dependencies --real-time --report-timing --tests "tests/test_appinit.js tests/test_fhact.js tests/test_fhweb.js"

test_messaging:
	cd fh-messaging; make test

test_metrics:
	cd fh-metrics; make test

test_all: test_messaging test_metrics test

npm_deps:
	npm install .

.PHONY: test