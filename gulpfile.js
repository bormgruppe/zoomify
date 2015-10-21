var gulp = require('gulp');
var gutil = require('gulp-util');

// used to serve the example
var connect = require('connect');
var static = require('serve-static');
var open = require('open');

// Serve dir at port and open the browser at path (relative to dir)
var serveAndOpen = function(dir, port, path) {
    connect()
        .use(static(dir))
        .listen(port, function() {
            gutil.log('Starting webserver on port ' + port);
            var openPath = 'http://localhost:' + port + '/' + path;
            gutil.log('Opening browser at ' + openPath);
            open(openPath);
        });
};

gulp.task('serve-example', function(){
    serveAndOpen('./', 8000, 'index.html');
});
