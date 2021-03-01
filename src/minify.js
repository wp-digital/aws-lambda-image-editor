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
const isCWebpReadable = require('is-cwebp-readable');

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

            ({ mime } = await fileType(body));

            if (operations.length) {
                doOperations(image, operations, callback);
            } else if (['image/jpeg', 'image/png'].includes(mime)) {
                try {
                    meta = await exifr.parse(body, {
                        iptc: true,
                        xmp: true,
                    });
                } catch {}
            }

            buffer = await image.toBuffer();

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
                quality: [quality/100, 1.0],
                speed: 4,
            }),
            imageminSvgo({
                plugins: [{
                    removeViewBox: false,
                }],
            }),
        ],
    });

    if (isCWebpReadable(buffer)) {
        const webp = sharp(buffer).webp({
            quality,
        });
        const withWebp = await webp.toBuffer();

        if (withWebp.byteLength < buffer.byteLength) {
            buffer = withWebp;
            mime = 'image/webp';
        }
    }

    return {
        buffer,
        meta,
        mime,
    };
};
