'use strict';

const path = {

  build: {
    html: 'build/',
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
  clean: 'build/'
};

const gulp = require('gulp'),
  uglify = require('gulp-uglify'),
  sass = require('gulp-sass'),
  cssmin = require('gulp-clean-css'),
  imagemin = require('gulp-imagemin'),
  rigger = require('gulp-rigger'),
  concat = require('gulp-concat'),
  prefixer = require('gulp-autoprefixer'),
  sourcemaps = require('gulp-sourcemaps'),
  spritesmith = require('gulp.spritesmith'),
  pug = require('gulp-pug'),
  plumber = require('gulp-plumber'),
  gulpif = require('gulp-if'),
  emitty = require('emitty').setup(path.src.pugDir, 'pug'),
  normalize = require('normalize-path'),
  connect = require("gulp-connect"),
  babel = require("gulp-babel"),
  del = require('del'),
  util = require('gulp-util');

const production = !!util.env.production;

gulp.task('connect', () => connect.server({
    port: 1378,
    livereload: true,
    root: 'build/'
  })
);

gulp.task('js', () => gulp.src(path.src.js)
  .pipe(rigger())
  .pipe(gulpif(!production, sourcemaps.init()))
  .pipe(concat('_main.js'))
  .pipe(babel({
    presets: ['env']
  }))
  .pipe(gulpif(!production, sourcemaps.write()))
  .pipe(gulpif(production, uglify()))
  .pipe(gulp.dest(path.build.js))
  .pipe(connect.reload())
);

gulp.task('sprite', () => {

  const spriteData =
    gulp.src(path.src.sprite)
      .pipe(spritesmith({
        imgName: '../img/sprite.png',
        cssName: 'sprite.scss',
        cssFormat: 'scss'
      }));

  spriteData.img.pipe(gulp.dest(path.build.img));
  spriteData.css.pipe(gulp.dest(path.src.styleDir));

  return spriteData
});

gulp.task('styles', () => gulp.src(path.src.style)
  .pipe(plumber())
  .pipe(gulpif(!production, sourcemaps.init()))
  .pipe(sass())
  .pipe(prefixer())
  .pipe(gulpif(!production, sourcemaps.write()))
  .pipe(gulpif(production, cssmin()))
  .pipe(gulp.dest(path.build.css))
  .pipe(connect.reload())
);

gulp.task('pug', () => new Promise((resolve, reject) => {

    emitty.scan(global.emittyChangedFile).then(function () {

      gulp.src(path.src.pug)
      //.pipe(plumber())
        .pipe(gulpif(global.watch, emitty.filter(global.emittyChangedFile)))
        .pipe(pug({pretty: true}))
        .pipe(gulp.dest(path.build.html))
        .pipe(connect.reload())
        .on('end', resolve)
        .on('error', reject);
    })
  })
);

gulp.task('fonts', () => gulp.src(path.src.fonts).pipe(gulp.dest(path.build.fonts)));

gulp.task('images', () =>  gulp.src(path.src.images)
    .pipe(gulpif(production, imagemin([
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
);

gulp.task('img', () => gulp.src(path.src.img)
    .pipe(gulpif(production, imagemin([
      imagemin.jpegtran({progressive: true}),
      imagemin.optipng({optimizationLevel: 2}),
      imagemin.svgo({
        plugins: [
          {removeViewBox: true},
          {cleanupIDs: false}
        ]
      })
    ])))
    .pipe(gulp.dest(path.build.img))
);

gulp.task('html', () => gulp.src(path.src.html)
    .pipe(rigger())
    .pipe(gulp.dest(path.build.html))
);

gulp.task('clean', () => del([path.clean]));

gulp.task('watch', () => {

  global.watch = true;

  gulp.watch(path.watch.pug, gulp.series('pug'))
    .on('all', function (event, filepath) {
      global.emittyChangedFile = normalize(filepath);
    });
  gulp.watch(path.watch.style, gulp.series('styles'));
  gulp.watch(path.watch.js, gulp.series('js'));
  gulp.watch(path.watch.images, gulp.series('images'));
  gulp.watch(path.watch.img, gulp.series('img'));
  gulp.watch(path.watch.fonts, gulp.series('fonts'));
  gulp.watch(path.watch.imgSprites, gulp.series('sprite'));

});

gulp.task(
  'build',
  gulp.series(
    'clean',
    gulp.parallel('sprite'),
    gulp.parallel('js', 'styles', 'pug', 'fonts', 'images'))
);

gulp.task(
  'default',
  gulp.series(
    'build',
    gulp.parallel('connect', 'watch')
  )
);
