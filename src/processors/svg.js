const imagemin = require('imagemin');
const imageminSvgo = require('imagemin-svgo');

module.exports = async (body) => {
    const buffer = await imagemin.buffer(body, {
        plugins: [
            imageminSvgo({
                plugins: [{
                    removeViewBox: false,
                }],
            }),
        ],
    });

    return {
        buffer,
        mime: 'image/svg+xml',
    };
};
