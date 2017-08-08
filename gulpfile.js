/*
 * in addition to the specific notations below, many of these ideas taken from "Developing a Gulp Edge" by
 * Tomasz Stryjewski and Jed Mao
 */
var gulp = require('gulp');
var stripDebug = require('gulp-strip-debug');
var replace = require('gulp-token-replace');
var eslint = require('gulp-eslint');
var reporter = require('eslint-html-reporter');
var path = require('path');
var fs = require('fs');
var clean = require('gulp-clean');
var exec = require('child_process').exec;
var watch = require('gulp-watch');
var express = require('express');
var browserSync = require('browser-sync');
var gutil = require('gulp-util');
var minimist = require('minimist');
var zip = require('gulp-zip');
var runSequence = require('run-sequence');
var spawn = require('child_process').spawn;


var srcJsFiles = ['src/**/*.js'];
//dijits have nested html templates, css, images
var srcHtmlFiles = ['src/**/*.html'];
var srcCssFiles = ['src/**/*.css'];
var srcImageFiles = ['src/**/*.{gif,png,jpg}'];
var testFiles = ['tests/**/*'];
var srcDataFiles = ['src/*.json'];  //datafiles should all be at top level

var p = require('./package.json');
p.buildDate = new Date().toLocaleString();

var zipFileName = p.name + '-' + p.version + '-devel.zip'
var lintReportName = 'eslint-results-'+ p.name + '.html';

var server;
var options = minimist(process.argv);
var environment = options.environment || 'development';

//override zipfile name when in production
if (environment == 'production') {
    zipFileName = p.name + '-' + p.version + '.zip'
};

// lint source javascript files. example taken from https://github.com/Esri/angular-esri-map/blob/master/gulpfile.js
gulp.task('lint', function() {
  return gulp.src(srcJsFiles)
    // eslint() attaches the lint output to the eslint property
    // of the file object so it can be used by other modules.
    .pipe(eslint())
    // eslint.format() outputs the lint results to the console.
    // Alternatively use eslint.formatEach() (see Docs).
    .pipe(eslint.format())

    .pipe(eslint.format(reporter, function(results) {
      fs.writeFileSync(path.join(__dirname, 'dist', lintReportName), results);
    }))

    // To have the process exit with an error code (1) on
    // lint error, return the stream and pipe to failOnError last.
//    .pipe(eslint.failOnError());
});


gulp.task('clean', function(){
    return gulp.src(['dist','zip'])
    .pipe(clean());
});


gulp.task('scripts', function(){
    return gulp.src(srcJsFiles)
    //TODO may not be necessary once Dojo build in place since it can selectively strip console statements
    .pipe(environment == 'production' ? stripDebug() : gutil.noop())
    .pipe(gulp.dest('dist'))
    .pipe(reload());
});


gulp.task('tests', function(){
    return gulp.src(testFiles, {base: '.'})
    .pipe(gulp.dest('dist'))
    .pipe(reload());
});


gulp.task('images', function() {
    return gulp.src(srcImageFiles)
    .pipe(gulp.dest('dist'))
    .pipe(reload());
});


gulp.task('html', function(){
    return gulp.src(srcHtmlFiles)
    .pipe(replace({tokens:{ 'buildDate': p.buildDate, 'version': p.version}}))
    .pipe(gulp.dest('dist'))
    .pipe(reload());
});


gulp.task('styles', function(){
    return gulp.src(srcCssFiles)
    .pipe(gulp.dest('dist'))
    .pipe(reload());
});

gulp.task('datafiles', function(){
    return gulp.src(srcDataFiles)
    .pipe(gulp.dest('dist'))
    .pipe(reload());
});

gulp.task('files', function(){
    gulp.watch(srcHtmlFiles, ['html']);    
    gulp.watch(srcJsFiles, ['scripts']);    
    gulp.watch(srcCssFiles, ['styles']);
    gulp.watch(srcImageFiles, ['images']);
    gulp.watch(srcDataFiles, ['datafiles']);
    gulp.watch(testFiles, ['tests']);
});

//required for intern tests to run, e.g. http://localhost:3000/node_modules/intern/client.html?config=tests/intern
gulp.task('copy-intern', function() {
    return gulp.src('node_modules/intern/**/*', {base: '.'})
    .pipe(environment == 'development' ? gulp.dest('dist') : gutil.noop());
});

gulp.task('copy-jsapi', function() {
    return gulp.src('bower_components/**/*', {base: '.'})
    .pipe(environment == 'development' ? gulp.dest('dist') : gutil.noop());
});

//TODO not yet working
//taken from Intern User Guide (https://theintern.github.io/intern/#gulp)
gulp.task('test', function (done) {
  // Define the Intern command line
  var command = [
    './node_modules/.bin/intern-runner',
    'config=tests/intern'
  ];

  // Add environment variables, such as service keys
  var env = Object.create(process.env);

  // Spawn the Intern process
  var child = require('child_process').spawn('node', command, {
    // Allow Intern to write directly to the gulp process's stdout and
    // stderr.
    stdio: 'inherit',
    env: env
  });

  // Let gulp know when the child process exits
  child.on('close', function (code) {
    if (code) {
      done(new Error('Intern exited with code ' + code));
    }
    else {
      done();
    }
  });
});


gulp.task('server', function() {
    server = express();
    server.use(express.static('dist'));
    server.listen(9000);
    browserSync({ proxy: 'localhost:9000'});
});


function reload() {
  if (server) {
    return browserSync.reload({ stream: true });
  }

  return gutil.noop();
}


//TODO not yet working
// Do the Dojo build via node. taken from https://gist.github.com/odoe/3fd5b192d0c2c27e2b04
gulp.task('dojo', ['clean'], function (cb) {
  var cmd = spawn('node', [
    'bower_components/dojo/dojo.js',
    'load=build',
    '--profile',
    'build.profile.js',
    '--releaseDir',
    './dist'
  ], { stdio: 'inherit' });

  return cmd.on('close', function (code) {
    console.log('Dojo build completed ' + (code === 0 ? 'successfully!' : 'with issues.'));
    cb(code);
  });
});

gulp.task('zip', function() {
    gulp.src('dist/**/*')
    .pipe(zip(zipFileName))
    .pipe(gulp.dest('zip/'+p.version));
});

gulp.task('build', ['html', 'styles', 'scripts', 'images', 'datafiles', 'tests', 'copy-intern', 'copy-jsapi']);

gulp.task('package', function(done) {
    //include the Dojo, Esri modules required to run browser test client
    if (environment == 'development') {
        runSequence('build', 'lint', 'zip', done);
    } else {
        runSequence('clean','scripts', 'html', 'images', 'styles', 'datafiles', 'lint', 'zip', done);
    }
});

gulp.task('default', ['build', 'files', 'server']);



