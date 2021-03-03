const aws = require('aws-sdk');

const process = require('./src/process');
const processMeta = require('./src/processMeta');
const prepareMeta = require('./src/prepareMeta');

const s3 = new aws.S3({
    apiVersion: '2006-03-01'
});

module.exports.processor = async ({
    allow_webp: allowWebp = false,
    bucket,
    filename,
    new_filename: newFilename,
    operations = [],
    quality = 82,
    'return': output,
}) => {
    const {
        ACL: acl,
        Body: body,
        Metadata: metadata,
    } = await s3.getObject({
        Bucket: bucket,
        Key: filename,
    }).promise();
    const { buffer, mime } = await process(body, operations, quality, allowWebp);

    if (output === 'stream') {
        return buffer.toString('base64');
    }

    const params = {
        ACL: acl,
        Body: buffer,
        Bucket: bucket,
        ContentType: mime,
        Key: newFilename,
    };

    if (!operations.length) {
        const meta = await processMeta(body);

        if (meta !== null) {
            params.Metadata = {
                ...metadata,
                ...prepareMeta(meta),
            };
        }
    }

    await s3.putObject(params).promise();

    return { mime };
};
