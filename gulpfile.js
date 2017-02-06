var gulp = require('gulp');
var stripDebug = require('gulp-strip-debug');
var replace = require('gulp-token-replace');
var eslint = require('gulp-eslint');
var clean = require('gulp-clean');
var exec = require('child_process').exec;
var watch = require('gulp-watch');
var browserSync = require('browser-sync');
var reload = browserSync.reload;

var srcJsFiles = 'js/**/*.js';
var srcHtmlFiles = 'js/**/*.html';
var srcCssFiles = 'js/**/*.css';

var p = require('./package.json');
p.buildDate = new Date();

// lint source javascript files. example taken from https://github.com/Esri/angular-esri-map/blob/master/gulpfile.js
gulp.task('lint', function() {
  return gulp.src([srcJsFiles])
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
    return gulp.src([srcJsFiles])
    .pipe(stripDebug())
    .pipe(gulp.dest('dist'))
});

gulp.task('html', function(){
    return gulp.src(['index.html', srcHtmlFiles])
    .pipe(replace({tokens:{
        'buildDate': p.buildDate,
        'version': p.version
    }}))
    .pipe(gulp.dest('dist'))
});

gulp.task('styles', function(){
    return gulp.src([srcCssFiles])
    .pipe(gulp.dest('dist'))
});

gulp.task('build', ['html', 'styles', 'scripts']);

gulp.task('intern', function (cb) {
    exec('./node_modules/.bin/intern-runner config=tests/intern', function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
});

gulp.task('watch', function () {
    watch('**/*.js', function() {
        exec('./node_modules/.bin/intern-runner config=tests/intern', function (err, stdout, stderr) {
            console.log(stdout);
            console.log(stderr);
        });
    });
}); 

gulp.task('serve', function() {
    //TODO why can't this call the scripts task?
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

    gulp.watch(['**/*.html', 'css/**/*.css', 'js/**/*.js'], {cwd: '.'}, reload);
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

gulp.task('default', ['serve']);
