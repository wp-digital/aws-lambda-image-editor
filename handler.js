const { promisify } = require('es6-promisify');
const allSettled = require('promise.allsettled');
const aws = require('aws-sdk');
const mime = require('mime');
const execBuffer = require('exec-buffer');
const gifsicle = require('gifsicle');
const Sharp = require('sharp');
const exifr = require('exifr');
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const imageminSvgo = require('imagemin-svgo');

const doOperations = require('./src/doOperations');
const getGifsicleArgs = require('./src/getGifsicleArgs');

const prepareMeta = require('./src/prepareMeta');

const s3 = new aws.S3({
    apiVersion: '2006-03-01'
});

module.exports.imageProcessor = ({
    bucket,
    filename,
    new_filename,
    quality = 80,
    operations = [],
    'return': output,
}, context, callback) =>
    s3.getObject({
        Bucket: bucket,
        Key: filename,
    })
    .promise()
    .catch(err => callback(err))
    .then(({
        ACL: acl,
        Body: body,
        Metadata: meta,
    }) => {
        switch (mime.getType(new_filename)) {
            case 'image/gif':
                return allSettled([
                    execBuffer({
                        input: body,
                        bin: gifsicle,
                        args: getGifsicleArgs(operations, callback),
                    }),
                    acl,
                    meta,
                    Promise.reject('Sorry, it\'s not possible to parse .gif.'),
                ]);
            case 'image/svg+xml':
                return allSettled([
                    body,
                    acl,
                    meta,
                    Promise.reject('Sorry, it\'s not possible to parse .svg.'),
                ]);
            default: {
                const image = Sharp(body);

                doOperations(image, operations, callback);

                return allSettled([
                    promisify(image.toBuffer.bind(image))(),
                    acl,
                    meta,
                    exifr.parse(body, {
                        iptc: true,
                        xmp: true,
                    }),
                ]);
            }
        }
    })
    .then(([buffer, acl, meta, parsed]) => Promise.all([
        imagemin.buffer(buffer.value, {
            plugins: [
                imageminMozjpeg({
                    progressive: true,
                    quality,
                }),
                imageminPngquant({
                    quality: [(quality - 10)/100, quality/100],
                    speed: 4,
                }),
                imageminSvgo({
                    plugins: [{
                        removeViewBox: false,
                    }],
                }),
            ],
        }),
        acl.value,
        meta.value,
        parsed.status === 'fulfilled' ? parsed.value : null,
    ]))
    .then(([body, acl, meta, parsed]) => {
        if (output === 'stream') {
            context.succeed(body.toString('base64'));
        } else {
            return s3.putObject({
                Bucket: bucket,
                Key: new_filename,
                Body: body,
                ACL: acl,
                ContentType: mime.getType(new_filename),
                Metadata: parsed !== null ? {
                    ...meta,
                    ...prepareMeta(parsed),
                } : meta,
            }).promise();
        }
    })
    .catch(err => callback(err))
    .then(() => context.done());
