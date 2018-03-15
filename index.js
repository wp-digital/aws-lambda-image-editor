let gm = require('gm').subClass({
    imageMagick: true
});
let Sharp = require('sharp');
let imagemin = require('imagemin');
let imageminJpegoptim = require('imagemin-jpegoptim');
let imageminPngquant = require('imagemin-pngquant');
let imageminGifsicle = require('imagemin-gifsicle');
let imageminSvgo = require('imagemin-svgo');

let aws = require('aws-sdk');
let s3 = new aws.S3({
    apiVersion: '2006-03-01'
});

let mime = require('mime');

let promisify = require('es6-promisify').promisify;

let getObject = promisify(s3.getObject.bind(s3));
let putObject = promisify(s3.putObject.bind(s3));

let do_operations = (image, operations, callback) => {
    for (let operation of operations) {
        switch (operation.action) {
            case 'resize': {
                image.resize(operation.width, operation.height);

                break;
            }

            case 'crop': {
                image.crop(operation.src_width, operation.src_height, operation.src_x, operation.src_y);

                if (operation.destination_width || operation.destination_height) {
                    if (!operation.destination_width) {
                        operation.destination_width = operation.src_width;
                    }

                    if (!operation.destination_height) {
                        operation.destination_height = operation.src_height;
                    }

                    image.resize(operation.destination_width, operation.destination_height);
                }

                break;
            }

            case 'rotate': {
                image.rotate(360 - operation.angle);

                break;
            }

            case 'flip': {
                if (operation.horizontal) {
                    image.flip()
                }

                if (operation.vertical) {
                    image.flop()
                }

                break;
            }

            default: {
                callback(`Invalid operation action: ${operation.action}`);
            }
        }
    }
};

let do_operations_gm = (image, operations, callback) => {
    for (let operation of operations) {
        switch (operation.action) {
            case 'resize': {
                image.scale(operation.width, operation.height);

                break;
            }

            case 'crop': {
                image.crop(operation.src_width, operation.src_height, operation.src_x, operation.src_y);

                if (operation.destination_width || operation.destination_height) {
                    if (!operation.destination_width) {
                        operation.destination_width = operation.src_width;
                    }

                    if (!operation.destination_height) {
                        operation.destination_height = operation.src_height;
                    }

                    image.scale(operation.destination_width, operation.destination_height);
                }

                break;
            }

            case 'rotate': {
                image.rotate('none', 360 - operation.angle);

                break;
            }

            case 'flip': {
                if (operation.horizontal) {
                    image.flip()
                }

                if (operation.vertical) {
                    image.flop()
                }

                break;
            }

            default: {
                callback(`Invalid operation action: ${operation.action}`);
            }
        }
    }
};

exports.handler = ({
    bucket,
    filename,
    new_filename,
    quality = 80,
    operations = [],
    'return': output
}, context, callback) => getObject({
    Bucket: bucket,
    Key: filename
}).catch(err => callback(err))
    .then(({
        ACL: acl,
        Body: body,
        Metadata: meta
    }) => {
        if (mime.getType(new_filename) === 'image/gif') {
            let image = gm(new Buffer(body, 'binary'), filename);

            image.quality(quality);
            do_operations_gm(image, operations);

            return Promise.all([promisify(image.toBuffer.bind(image))(new_filename), acl, meta]);
        } else {
            let image = Sharp(body);

            do_operations(image, operations, callback);

            return Promise.all([promisify(image.toBuffer.bind(image))(), acl, meta]);
        }
    })
    .then(([buffer, acl, meta]) => Promise.all([imagemin.buffer(buffer, {
        plugins: [
            imageminJpegoptim({
                progressive: true,
                max: quality
            }),
            imageminGifsicle({
                interlaced: true
            }),
            imageminPngquant({
                quality: (quality - 10) + '-' + quality,
                speed: 4
            }),
            imageminSvgo({
                plugins: [{
                    removeViewBox: false
                }]
            })
        ]
    }), acl, meta]))
    .then(([body, acl, meta]) => {
        if (output === 'stream') {
            context.succeed(body.toString('base64'));
        } else {
            return putObject({
                Bucket: bucket,
                Key: new_filename,
                Body: body,
                ACL: acl,
                ContentType: mime.getType(new_filename),
                Metadata: meta
            });
        }
    })
    .catch(err => callback(err))
    .then(() => context.done());