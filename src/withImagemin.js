const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');

module.exports = (body, quality) => imagemin.buffer(body, {
    plugins: [
        imageminMozjpeg({
            quality,
            sample: ['1x1'], // For better quality.
        }),
        imageminPngquant({
            strip: true,
            quality: [quality/100, 1.0],
        }),
    ],
});
