'use strict';

const execBuffer = require('exec-buffer');

module.exports = (operations, callback) => {
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
