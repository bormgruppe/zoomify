var gulp = require('gulp');
var gutil = require('gulp-util');

// used to serve the example
var webserve = require('web-serve');

gulp.task('serve-example', function(){
    gutil.log('Starting webserver at http://localhost:8000/index.html');
    webserve();
});
