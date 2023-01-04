module.exports = async (image, operations) => {
    const { width, height } = await image.metadata();

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
                    width: Math.min(width, parseInt(operation.src_width, 10)),
                    height: Math.min(height, parseInt(operation.src_height, 10))
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
                throw new Error(`Invalid operation action: ${operation.action}`);
            }
        }
    }
};
