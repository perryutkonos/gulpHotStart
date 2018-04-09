'use strict';

var path = {
   
    build: { //Тут мы укажем куда складывать готовые после сборки файлы
        html: 'build/html/',
        js: 'build/js/',
        css: 'build/css/',
        img: 'build/img/',
        images: 'build/images/',
        fonts: 'build/fonts/',

    },
    src: { 
        pug: 'src/templates/*.pug',
        pugDir: 'src/templates',
        js: 'src/js/main.js',
        styleDir: 'src/style/',
        styleLibsDir: 'src/style/libs/',
        style: 'src/style/style.scss',
        img: 'src/img/**/*.*',
        images: 'src/images/**/*.*',
        fonts: 'src/fonts/**/*.*',
        sprite: 'src/sprites/*.png'
    },
    watch: {
        html: 'src/**/*.html',
        js: 'src/js/**/*.js',
        style: 'src/style/**/*.scss',
        pug: 'src/templates/**/*.pug',
        img: 'src/img/**/*.*',
        imgSprites: 'src/sprites/**/*.*',
        images: 'src/images/**/*.*',
        fonts: 'src/fonts/**/*.*',
        resources: 'src/resources/**/*.*'
    },
    clean: '/build/'
};

var gulp = require('gulp'), //сам гулп
    watch = require('gulp-watch'),
    uglify = require('gulp-uglify'), //для минификации скриптов
    sass = require('gulp-sass'), //компилятор sass
    cssmin = require('gulp-clean-css'), //минификатор css
    imagemin = require('gulp-imagemin'), //оптимизатор картнок
    rigger = require('gulp-rigger'), //всткавка включашек в любый файлы
    bower = require('gulp-bower'), //менеджер подключаемых библиотек
    concat = require('gulp-concat'), //конкатинация файлов
    filter = require('gulp-filter'),
    prefixer = require('gulp-autoprefixer'), //автоматически добавляет вендрные префиксы
    sourcemaps = require('gulp-sourcemaps'),
    spritesmith = require('gulp.spritesmith'),
    rimraf = require('gulp-rimraf'),
    pug = require('gulp-pug'), // компилятор шаблонов jade/pug
    plumber = require('gulp-plumber'),
    gulpif = require('gulp-if'),
    emitty = require('emitty').setup(path.src.pugDir, 'pug'),
    normalize = require('normalize-path'),
    connect = require("gulp-connect"),
    babel = require("gulp-babel"),
    util = require('gulp-util');

const production = !!util.env.production;

// Server
gulp.task('connect', function () {
    return connect.server({
        port: 1378,
        livereload: true,
        root: 'build/'
    });
});

/* JS: берет все моудли из bower.json объединяет в один файл vendor.js скрипты, кладет их в паку дистрибутива
 CSS: берет все файлы, кладет их в _vendor.scss в папке приложения. Потом этот файл будет включаться другим таском в итоговый
 */
gulp.task('bower', function () {
    var bowerFiles = require('main-bower-files')({
        checkExistence: true
    });

    bowerFiles.push('./bower_components/jquery-ui/themes/ui-lightness/jquery-ui.css');

    var jsFilter = filter(function (file) {
        return file.path.match(/\.(js)$/i);
    });
    var cssFilter = filter(function (file) {
        return file.path.match(/\.(css)$/i);
    });
    gulp.src(bowerFiles)
        .pipe(jsFilter)
        .pipe(concat('_vendor.js'))
        .pipe(uglify())
        .pipe(gulp.dest(path.build.js))
    ;

    return gulp.src(bowerFiles)
        .pipe(cssFilter)
        .pipe(concat('_vendor.scss'))
        .pipe(gulp.dest(path.src.styleLibsDir));
});

//таска, которая собирает нам наши скрипты
gulp.task('js', function () {
    return gulp.src(path.src.js) //Найдем наш main файл
        .pipe(rigger())
        .pipe(gulpif(!production,sourcemaps.init()))
        .pipe(concat('_main.js'))
        .pipe(babel({
            presets: ['env']
        }))
        .pipe(gulpif(!production,sourcemaps.write()))
        .pipe(gulpif(production,uglify()))
        .pipe(gulp.dest(path.build.js)) //Выплюнем готовый файл в build
        .pipe(connect.reload());

});

gulp.task('sprite', function () {

    var spriteData =
        gulp.src(path.src.sprite)
            .pipe(spritesmith({
                imgName: '../img/sprite.png',
                cssName: 'sprite.scss',
                cssFormat: 'scss'
            }));

    spriteData.img.pipe(gulp.dest(path.build.img)); // путь, куда сохраняем картинку
    spriteData.css.pipe(gulp.dest(path.src.styleDir)); // путь, куда сохраняем стили

    return spriteData
});

//таска, которая собирает нам все наши стили
gulp.task('styles', function () {
    return gulp.src(path.src.style) 
        .pipe(plumber())
        .pipe(gulpif(!production,sourcemaps.init()))
        .pipe(sass()) 
        .pipe(prefixer())
        .pipe(gulpif(!production,sourcemaps.write()))
        .pipe(gulpif(production,cssmin()))
        .pipe(gulp.dest(path.build.css))
        .pipe(connect.reload());

});

// таск для компиляции шаблонов
gulp.task('pug', function () {
    
    return new Promise(function (resolve, reject) {
      
        emitty.scan(global.emittyChangedFile).then(function () {
            
            gulp.src(path.src.pug)
            //.pipe(plumber()) // предотвращаем вылет гальпа при ошибке
                .pipe(gulpif(global.watch, emitty.filter(global.emittyChangedFile)))
                .pipe(pug({pretty: true}))
                .pipe(gulp.dest(path.build.html))
                .pipe(connect.reload())
                .on('end', resolve)
                .on('error', reject);
        });
    })
});

//таска, которая собирает нам наши шрифты
gulp.task('fonts', function () {
    return gulp.src(path.src.fonts)
        .pipe(gulp.dest(path.build.fonts))

});

//таска оптимизирует нам картинки
gulp.task('images', function () {

    gulp.src(path.src.img) //Выберем наши картинки
        .pipe(gulpif(production,imagemin([
            imagemin.jpegtran({progressive: true}),
            imagemin.optipng({optimizationLevel: 2}),
            imagemin.svgo({
                plugins: [
                    {removeViewBox: true},
                    {cleanupIDs: false}
                ]
            })
        ])))
        .pipe(gulp.dest(path.build.img));
    

    return gulp.src(path.src.images) //Выберем наши картинки
        .pipe(gulpif(production,imagemin([
            imagemin.jpegtran({progressive: true}),
            imagemin.optipng({optimizationLevel: 2}),
            imagemin.svgo({
                plugins: [
                    {removeViewBox: true},
                    {cleanupIDs: false}
                ]
            })
        ])))
        .pipe(gulp.dest(path.build.images))
        .pipe(connect.reload())

});

// копирование html
gulp.task('html', function () {
    gulp.src(path.src.html) //Выберем файлы по нужному пути
        .pipe(rigger()) //Прогоним через rigger
        .pipe(gulp.dest(path.build.html)) //Выплюнем их в папку build
});

//очищает папку с билдом
gulp.task('clean', function () {
    var del = require('del');
    return del([path.clean]);
});

//собственно, вотчер
gulp.task('watch', function () {

    global.watch = true;

    gulp.watch(path.watch.pug, gulp.series('pug'))
        .on('all', function (event, filepath) {
            global.emittyChangedFile = normalize(filepath);
        });
    gulp.watch(path.watch.style, gulp.series('styles'));
    gulp.watch(path.watch.js, gulp.series('js'));
    gulp.watch(path.watch.img, gulp.series('images'));
    gulp.watch(path.watch.fonts, gulp.series('fonts'));
    gulp.watch(path.watch.imgSprites, gulp.series('sprite'));

});

//Сборщик
gulp.task('build',
    gulp.series('clean',gulp.parallel('sprite'), gulp.parallel('js', 'styles', 'pug', 'fonts', 'images'))
);

gulp.task('default', gulp.series('build', gulp.parallel('connect', 'watch')));
