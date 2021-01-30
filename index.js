const Sharp = require('sharp');
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const imageminSvgo = require('imagemin-svgo');
const gifsicle = require('gifsicle');
const exifr = require('exifr');
const execBuffer = require('exec-buffer');
const aws = require('aws-sdk');
const s3 = new aws.S3({
    apiVersion: '2006-03-01'
});
const mime = require('mime');
const { promisify } = require('es6-promisify');
const has = require('lodash.has');

const getObject = promisify(s3.getObject.bind(s3));
const putObject = promisify(s3.putObject.bind(s3));

const doOperations = (image, operations, callback) => {
    for (const operation of operations) {
        switch (operation.action) {
            case 'resize': {
                image.resize(
                    parseInt(operation.width, 10),
                    parseInt(operation.height, 10)
                );

                break;
            }

            case 'crop': {
                image.extract({
                    left: parseInt(operation.src_x, 10),
                    top: parseInt(operation.src_y, 10),
                    width: parseInt(operation.src_width, 10),
                    height: parseInt(operation.src_height, 10)
                });

                if (operation.destination_width || operation.destination_height) {
                    if (!operation.destination_width) {
                        operation.destination_width = parseInt(operation.src_width, 10);
                    }

                    if (!operation.destination_height) {
                        operation.destination_height = parseInt(operation.src_height, 10);
                    }

                    image.resize(
                        parseInt(operation.destination_width, 10),
                        parseInt(operation.destination_height, 10)
                    );
                }

                break;
            }

            case 'rotate': {
                image.rotate(360 - operation.angle);

                break;
            }

            case 'flip': {
                if (operation.horizontal) {
                    image.flip();
                }

                if (operation.vertical) {
                    image.flop();
                }

                break;
            }

            default: {
                callback(`Invalid operation action: ${operation.action}`);
            }
        }
    }
};

const getGifsicleArgs = (operations, callback) => {
    const args = ['--no-warnings', '--no-app-extensions', '--careful'];

    for (const operation of operations) {
        switch (operation.action) {
            case 'resize': {
                args.push(
                    `--resize=${parseInt(operation.width, 10)}x${parseInt(operation.height, 10)}`
                );

                break;
            }

            case 'crop': {
                args.push(
                    `--crop=${parseInt(operation.src_x, 10)},${parseInt(operation.src_y, 10)}+${parseInt(operation.src_width, 10)}x${parseInt(operation.src_height, 10)}`
                );

                if (operation.destination_width || operation.destination_height) {
                    if (!operation.destination_width) {
                        operation.destination_width = parseInt(operation.src_width, 10);
                    }

                    if (!operation.destination_height) {
                        operation.destination_height = parseInt(operation.src_height, 10);
                    }

                    args.push(
                        `--resize=${parseInt(operation.destination_width, 10)}x${parseInt(operation.destination_height, 10)}`
                    );
                }

                break;
            }

            case 'rotate': {
                const angle = Math.round(operation.angle / 90) * 90 % 360;

                if (angle) {
                    args.push(`--rotate-${angle > 0 ? 360 - angle : Math.abs(angle)}`);
                }

                break;
            }

            case 'flip': {
                if (operation.horizontal) {
                    args.push('--flip-vertical');
                }

                if (operation.vertical) {
                    args.push('--flip-horizontal');
                }

                break;
            }

            default: {
                callback(`Invalid operation action: ${operation.action}`);
            }
        }
    }

    return [...args, '--output', execBuffer.output, execBuffer.input];
};

const prepareMeta = value => {
    // Taken from wp_read_image_metadata.
    const meta = {
        aperture: '0',
        credit: '',
        camera: '',
        caption: '',
        created: '',
        copyright: '',
        focal_length: '0',
        iso: '0',
        shutter_speed: '0',
        title: '',
        orientation: '0',
        keywords: '',
    };

    if (has(value, 'ApertureValue')) {
        meta.aperture = value.ApertureValue;
    } else if (has(value, 'FNumber')) {
        meta.aperture = value.FNumber;
    }

    if (has(value, 'Credit')) {
        meta.credit = value.Credit;
    } else if (has(value, 'Artist')) {
        meta.credit = value.Artist;
    } else if (has(value, 'XPAuthor')) {
        meta.credit = value.XPAuthor;
    }

    if (has(value, 'Model')) {
        meta.camera = value.Model;
    }

    if (has(value, 'Caption')) {
        meta.caption = value.Caption;
    } else if (has(value, 'ImageDescription')) {
        meta.caption = value.ImageDescription;
    } else if (has(value, 'UserComment')) {
        meta.caption = value.UserComment;
    } else if (has(value, 'XPComment')) {
        meta.caption = value.XPComment;
    }

    if (has(value, 'DateCreated')) {
        meta.created = value.DateCreated;

        if (has(value, 'TimeCreated')) {
            meta.created += ' ' + value.TimeCreated;
        }
    } else if (has(value, 'DateTimeOriginal')) {
        meta.created = value.DateTimeOriginal.getTime();
    } else if (has(value, 'CreateDate')) {
        meta.created = value.CreateDate;
    }

    if (has(value, 'CopyrightNotice')) {
        meta.copyright = value.CopyrightNotice;
    } else if (has(value, 'Copyright')) {
        meta.copyright = value.Copyright
    }

    if (has(value, 'FocalLength')) {
        meta.focal_length = value.FocalLength;
    }

    if (has(value, 'ISO')) {
        meta.iso = value.ISO;
    }

    if (has(value, 'ExposureTime')) {
        meta.shutter_speed = value.ExposureTime;
    }

    if (has(value, 'Headline')) {
        meta.title = value.Headline;
    } else if (has(value, 'Caption') && value.Caption < 80) {
        meta.title = value.Caption;
    } else if (has(value, 'ImageDescription') && value.ImageDescription < 80) {
        meta.title = value.ImageDescription;
    }

    if (has(value, 'ImageOrientation')) {
        meta.orientation = value.ImageOrientation;
    } else if (has(value, 'Orientation')) {
        meta.orientation = value.Orientation;
    }

    if (has(value, 'Keywords')) {
        meta.keywords = value.Keywords;
    } else if (has(value, 'XPKeywords')) {
        meta.keywords = value.XPKeywords;
    }

    return Object.keys(meta)
        .reduce((formatted, key) => ({
            ...formatted,
            [key]: '' + meta[key],
        }), {});
};

exports.handler = ({
    bucket,
    filename,
    new_filename,
    quality = 80,
    operations = [],
    'return': output,
}, context, callback) =>
    getObject({
        Bucket: bucket,
        Key: filename,
    })
    .catch(err => callback(err))
    .then(({
        ACL: acl,
        Body: body,
        Metadata: meta,
    }) => {
        if (mime.getType(new_filename) === 'image/gif') {
            return Promise.allSettled([
                execBuffer({
                    input: body,
                    bin: gifsicle,
                    args: getGifsicleArgs(operations, callback),
                }),
                acl,
                meta,
                Promise.reject('Sorry, it\'s not possible to parse GIF.'),
            ]);
        } else {
            const image = Sharp(body);

            doOperations(image, operations, callback);

            return Promise.allSettled([
                promisify(image.toBuffer.bind(image))(),
                acl,
                meta,
                exifr.parse(body, {
                    iptc: true,
                    xmp: true,
                }),
            ]);
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
        parsed.status === 'fulfilled' ? parsed.value : {},
    ]))
    .then(([body, acl, meta, parsed]) => {
        if (output === 'stream') {
            context.succeed(body.toString('base64'));
        } else {
            return putObject({
                Bucket: bucket,
                Key: new_filename,
                Body: body,
                ACL: acl,
                ContentType: mime.getType(new_filename),
                Metadata: {
                    ...meta,
                    ...prepareMeta(parsed),
                },
            });
        }
    })
    .catch(err => callback(err))
    .then(() => context.done());
