const execBuffer = require('exec-buffer');
const gifsicle = require('gifsicle');

const getGifsicleArgs = require('../getGifsicleArgs');

module.exports = async (body, operations) => {
    const buffer = await execBuffer({
        input: body,
        bin: gifsicle,
        args: getGifsicleArgs(operations),
    });

    return {
        buffer,
        mime: 'image/gif',
    };
};