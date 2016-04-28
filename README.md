# collection of Dojo dijits and classes used in the map viewers

Testing Setup:

* install PhantomJS (only required to run tests at command line)
* npm install -g gulp-cli bower
* npm install
* phantomjs --webdriver=4444

Gulp Tasks:

* "gulp watch" monitors for changes and automatically runs tests on command line
* "gulp serve" runs in browser and watches for changes. Automatically refreshes browser
* run tests via browser, e.g. http://localhost:3000/node_modules/intern/client.html?config=tests/intern

see [Intern tutorial](https://github.com/theintern/intern-tutorial), [User Guide](https://theintern.github.io/intern/#what-is-intern), and [examples](https://github.com/theintern/intern-examples)