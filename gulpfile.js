/*
 * in addition to the specific notations below, many of these ideas taken from "Developing a Gulp Edge" by
 * Tomasz Stryjewski and Jed Mao
 */

var gulp = require('gulp');
var stripDebug = require('gulp-strip-debug');
var replace = require('gulp-token-replace');
var eslint = require('gulp-eslint');
var clean = require('gulp-clean');
var exec = require('child_process').exec;
var watch = require('gulp-watch');
var express = require('express');
var browserSync = require('browser-sync');
var gutil = require('gulp-util');

var srcJsFiles = ['js/**/*.js'];
var srcHtmlFiles = ['index.html', 'js/**/*.html'];
var srcCssFiles = ['js/**/*.css'];
var srcImageFiles = ['js/**/*.png', 'js/**/*.jpg', 'js/**/*.gif'];

var p = require('./package.json');
p.buildDate = new Date();

var server;

// lint source javascript files. example taken from https://github.com/Esri/angular-esri-map/blob/master/gulpfile.js
gulp.task('lint', function() {
  return gulp.src(srcJsFiles)
    // eslint() attaches the lint output to the eslint property
    // of the file object so it can be used by other modules.
    .pipe(eslint())
    // eslint.format() outputs the lint results to the console.
    // Alternatively use eslint.formatEach() (see Docs).
    .pipe(eslint.format());
    // To have the process exit with an error code (1) on
    // lint error, return the stream and pipe to failOnError last.
//    .pipe(eslint.failOnError());
});

gulp.task('clean', function(){
    return gulp.src(['dist'])
    .pipe(clean());
});

gulp.task('scripts', function(){
    return gulp.src(srcJsFiles)
    //TODO may not be necessary once Dojo build in place since it can selectively strip console statements
    .pipe(stripDebug())
    .pipe(gulp.dest('dist'))
    .pipe(reload());
});

gulp.task('images', function() {
    console.log('inside images...');
    return gulp.src(srcImageFiles)
    .pipe(gulp.dest('dist'))
    .pipe(reload());
});

gulp.task('html', function(){
    console.log('inside html...');
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

gulp.task('files', function(){
    gulp.watch(srcHtmlFiles, ['html']);    
    gulp.watch(srcJsFiles, ['scripts']);    
    gulp.watch(srcCssFiles, ['styles']);
    gulp.watch(srcImageFiles, ['images']);    
});

gulp.task('build', ['html', 'styles', 'scripts', 'images']);

gulp.task('intern', function (cb) {
    exec('./node_modules/.bin/intern-runner config=tests/intern', function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
});

// gulp.task('watch', function () {
//     watch('**/*.js', function() {
//         exec('./node_modules/.bin/intern-runner config=tests/intern', function (err, stdout, stderr) {
//             console.log(stdout);
//             console.log(stderr);
//         });
//     });
// }); 


//old function which serves from current directory rather than ./dist
gulp.task('serve', function() {
    gulp.watch(['js/**/*.js'], function() {
        return gulp.src('js/**/*.js')
            .pipe(jshint())
            .pipe(jshint.reporter('default'))

    });

    browserSync({
        server: {
            baseDir: '.'
        }
    });

    gulp.watch(['**/*.html', 'css/**/*.css', 'js/**/*.js'], {cwd: '.'}, browserSync.reload);
});


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

//old default task
//gulp.task('default', ['serve']);

gulp.task('default', ['build', 'files', 'server']);



