'use strict';

const has = require('lodash.has');

module.exports = value => {
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
