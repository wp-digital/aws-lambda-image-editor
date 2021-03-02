const imagemin = require('imagemin');
const imageminSvgo = require('imagemin-svgo');
const { extendDefaultPlugins } = require('svgo');

module.exports = async (body) => {
    const buffer = await imagemin.buffer(body, {
        plugins: [
            imageminSvgo({
                plugins: extendDefaultPlugins([
                    {
                        name: 'removeViewBox',
                        active: false,
                    },
                ]),
            }),
        ],
    });

    return {
        buffer,
        mime: 'image/svg+xml',
    };
};
