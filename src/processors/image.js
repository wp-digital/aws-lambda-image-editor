const fileType = require('file-type');
const sharp = require('sharp');

const applyOperations = require('../applyOperations');
const withImagemin = require('../withImagemin');
const withWebp = require('../withWebp');

module.exports = async (body, operations, quality) => {
    const image = sharp(body);
    let { mime } = await fileType(body);

    applyOperations(image, operations);

    let buffer = await image.toBuffer();
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
        mime,
    };
};