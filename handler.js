const aws = require('aws-sdk');

const process = require('./src/process');
const prepareMeta = require('./src/prepareMeta');

const s3 = new aws.S3({
    apiVersion: '2006-03-01'
});

module.exports.processor = async ({
    bucket,
    filename,
    new_filename: newFilename,
    operations = [],
    quality = 82,
    'return': output,
}, context, callback) => {
    let acl;
    let body;
    let metadata;

    try {
        ({
            ACL: acl,
            Body: body,
            Metadata: metadata,
        } = await s3.getObject({
            Bucket: bucket,
            Key: filename,
        }).promise());
    } catch (e) {
        callback(e);

        return;
    }

    const { buffer, meta, mime } = await process(
        body,
        operations,
        quality,
        newFilename === filename,
        callback
    );

    if (output === 'stream') {
        context.succeed(buffer.toString('base64'));

        return;
    }

    try {
        await s3.putObject({
            ACL: acl,
            Body: buffer,
            Bucket: bucket,
            ContentType: mime,
            Key: newFilename,
            Metadata: meta !== null ? {
                ...metadata,
                ...prepareMeta(meta),
            } : metadata,
        }).promise();
    } catch (e) {
        callback(e);

        return;
    }

    context.done();
};
