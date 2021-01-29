const { handler } = require('./');
handler({
    "bucket": "wp-multi-stage",
    "filename": "2021/01/GettyImages-1289597688.jpg",
    "new_filename": "2021/01/GettyImages-1289597688-min.jpg",
}, {
    succeed(...args) {
        console.log(args);
    },
    done(...args) {
        console.log(args);
    },
} , () => {});
