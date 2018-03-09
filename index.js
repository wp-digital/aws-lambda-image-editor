var gm = require('gm').subClass({
    imageMagick: true
});
var imagemin = require('imagemin');
var imageminJpegoptim = require('imagemin-jpegoptim');
var imageminPngquant = require('imagemin-pngquant');
var imageminGifsicle = require('imagemin-gifsicle');
var imageminSvgo = require('imagemin-svgo');

var aws = require('aws-sdk');
var s3 = new aws.S3({
    apiVersion: '2006-03-01'
});

var mime = require('mime');

function do_operations(image, operations) {
    for(var i = 0; i < operations.length; i++) {
        var operation = operations[i];
        switch (operation.action) {

            case 'resize': {
                image.scale(operation.width, operation.height);
                break;
            }

            case 'crop': {
                image.crop(operation.src_width, operation.src_height, operation.src_x, operation.src_y);
                if(operation.destination_width || operation.destination_height) {
                    if(!operation.destination_width) {
                        operation.destination_width = operation.src_width;
                    }
                    if(!operation.destination_height) {
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
                if(operation.horizontal) {
                    image.flip()
                }
                if(operation.vertical) {
                    image.flop()
                }
                break;
            }

            default: {
                console.error("Invalid operation action: " + operation.action);
            }
        }
    }
}

exports.handler = function( event, context ) {
    var bucket = event.bucket;
    var filename = event.filename;
    var new_filename = event.new_filename;
    var quality = event.quality  || 80;
    var operations = event.operations || [];

    //todo: validate params

    s3.getObject({
        Bucket: bucket,
        Key: filename
    }, function(err, data) {
        if (err) {
            throw err;
        }

        var meta = data.Metadata;
        var image = gm(new Buffer(data.Body, 'binary'), filename);

        image.quality(quality);
        do_operations(image, operations);

        image.toBuffer( new_filename, function(err, buffer) {
            if (err) throw err;

            imagemin.buffer(buffer, {
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
            }).then(function (body) {
                if(event.return === 'stream') {
                    context.succeed(body.toString('base64'));
                } else {
                    s3.putObject({
                        Bucket: bucket,
                        Key: new_filename,
                        Body: body,
                        //ACL: acl, todo: clone acl
                        ContentType: mime.getType(new_filename),
                        Metadata: meta
                    }, function(err) {
                        if (err) throw err;
                        context.done();
                    });
                }
            });
        });
    });
};