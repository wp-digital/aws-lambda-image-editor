const isCWebpReadable = require('is-cwebp-readable');
const sharp = require('sharp');

module.exports = (body, quality) => {
    if (!isCWebpReadable(body)) {
        return body;
    }

    const webp = sharp(body).webp({
        quality,
        smartSubsample: true,
    });

    return webp.toBuffer();
};
