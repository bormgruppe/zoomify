var gulp = require('gulp');
var webserver = require('gulp-webserver');

gulp.task('serve-example', function(){
    return gulp.src('./')
        .pipe(webserver({
            open: 'index.html'
        }));
});
