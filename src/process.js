'use strict';

const isGif = require('is-gif');
const isSvg = require('is-svg');
const fileType = require('file-type');
const execBuffer = require('exec-buffer');
const gifsicle = require('gifsicle');
const sharp = require('sharp');
const exifr = require('exifr');

const getGifsicleArgs = require('./getGifsicleArgs');
const applyOperations = require('./applyOperations');
const withImagemin = require('./withImagemin');
const withWebp = require('./withWebp');

module.exports = async (
    body,
    operations,
    quality,
    shouldParseMeta,
    callback
) => {
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

            applyOperations(image, operations, callback);

            if (
                shouldParseMeta &&
                ['image/jpeg', 'image/png'].includes(mime)
            ) {
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

    const bufferWithImagemin = await withImagemin(buffer, quality);
    const bufferWithWebp = await withWebp(buffer, quality);
    const bufferWithImageminAndWebp = await withWebp(
        bufferWithImagemin, quality
    );

    buffer = [
        bufferWithImagemin,
        bufferWithWebp,
        bufferWithImageminAndWebp,
    ].reduce((min, current) => (
        current.byteLength < min.byteLength ? current : min
    ));

    if (buffer !== bufferWithImagemin) {
        mime = 'image/webp';
    }

    return {
        buffer,
        meta,
        mime,
    };
};
