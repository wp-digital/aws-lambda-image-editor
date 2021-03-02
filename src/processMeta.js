const exifr = require('exifr');

module.exports = async (body) => {
    let meta = null;

    try {
        meta = await exifr.parse(body, {
            iptc: true,
            xmp: true,
        });
    } catch {}

    return meta;
};
