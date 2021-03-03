const fileType = require('file-type');
const sharp = require('sharp');

const applyOperations = require('../applyOperations');
const withImagemin = require('../withImagemin');
const withWebp = require('../withWebp');

module.exports = async (body, operations, quality, allowWebp) => {
    let image = sharp(body);

    applyOperations(image, operations);

    const { mime } = await fileType(body);

    if (mime === 'image/jpeg') {
        // Lets use Imagemin for optimization.
        image = image.jpeg({
            chromaSubsampling: '4:4:4',
            quality: 100,
        });
    }

    const rawBuffer = await image.toBuffer();
    const buffer = await withImagemin(rawBuffer, quality);

    if (allowWebp) {
        const webpBuffer = await withWebp(rawBuffer, quality);

        if (webpBuffer.byteLength < buffer.byteLength) {
            return {
                buffer: webpBuffer,
                mime: 'image/webp',
            };
        }
    }

    return {
        buffer,
        mime,
    };
};