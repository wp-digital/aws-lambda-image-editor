const isGif = require('is-gif');
const isSvg = require('is-svg');

const gif = require('./processors/gif');
const svg = require('./processors/svg');
const image = require('./processors/image');

module.exports = async (body, operations, quality, allowWebp) => {
    if (isGif(body)) {
        return gif(body, operations);
    }

    if (isSvg(body)) {
        return svg(body);
    }

    return image(body, operations, quality, allowWebp);
};
