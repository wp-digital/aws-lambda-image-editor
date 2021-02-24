'use strict';

const isGif = require('is-gif');
const isSvg = require('is-svg');
const fileType = require('file-type');
const execBuffer = require('exec-buffer');
const gifsicle = require('gifsicle');
const sharp = require('sharp');
const exifr = require('exifr');
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const imageminSvgo = require('imagemin-svgo');
const imageminWebp = require('imagemin-webp');

const getGifsicleArgs = require('./getGifsicleArgs');
const doOperations = require('./doOperations');

module.exports = async (body, operations, quality, callback) => {
    let buffer;
    let meta = null;
    let mime;

    switch (true) {
        case isGif(body):
            buffer = await execBuffer({
                input: body,
                bin: gifsicle,
                args: getGifsicleArgs(operations, callback),
            });
            mime = 'image/gif';

            break;
        case isSvg(body):
            buffer = body;
            mime = 'image/svg+xml';

            break;
        default: {
            const image = sharp(body);

            if (operations.length) {
                doOperations(image, operations, callback);
            } else {
                meta = await exifr.parse(body, {
                    iptc: true,
                    xmp: true,
                });
            }

            buffer = await image.toBuffer();
            ({ mime } = await fileType(body));

            break;
        }
    }

    buffer = await imagemin.buffer(buffer, {
        plugins: [
            imageminMozjpeg({
                progressive: true,
                quality,
            }),
            imageminPngquant({
                quality: [(quality - 10)/100, quality/100],
                speed: 4,
            }),
            imageminSvgo({
                plugins: [{
                    removeViewBox: false,
                }],
            }),
        ],
    });

    const withWebp = await imagemin.buffer(buffer, {
        plugins: [
            imageminWebp({
                quality,
            }),
        ],
    });

    return {
        buffer: withWebp.byteLength < buffer.byteLength ? withWebp : buffer,
        meta,
        mime,
    };
};
