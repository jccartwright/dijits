var gulp = require('gulp');
var exec = require('child_process').exec;
var watch = require('gulp-watch');
var browserSync = require('browser-sync');
var reload = browserSync.reload;

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
