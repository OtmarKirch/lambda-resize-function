import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

export const handler = async (event) => {
    const s3 = new S3Client();
    console.log('Event:', JSON.stringify(event, null, 2)); // Log the event object

    const bucket = event.Records[0].s3.bucket.name;
    const key = event.Records[0].s3.object.key;

    // Create object for retrieving image
    const GetObjectParams = {
        Bucket: bucket,
        Key: key
    };

    // Create object for storing image
    const PutObjectParams = {
        Bucket: bucket,
        Key: `resized-images/${key.split('/').pop()}` // Assuming you want to keep the same file name
    };

    try {
        // Get the image from original-images
        const image = await s3.send(new GetObjectCommand(GetObjectParams));
        console.log('ContentType: ', image.ContentType);

        // Read the image data from the stream
        const imageData = await streamToBuffer(image.Body);
        console.log('Image data read from stream');

        // Resize the image using sharp
        let resizedImageData = imageData;
         try {
            resizedImageData = await sharp(imageData)
                .resize(200, 200, { fit: "inside", withoutEnlargement: true }) // Example dimensions, adjust as needed
                .toBuffer();
            console.log('Image resized successfully');
        } catch (sharpError) {
            console.error('Error resizing image with sharp:', sharpError);
            throw sharpError;
        } 

        // Upload the resized image to resized-images
        await s3.send(new PutObjectCommand({
            ...PutObjectParams,
            Body: resizedImageData,
            ContentType: image.ContentType // Preserve the original content type
        }));
        console.log('Resized image uploaded successfully');

        const response = {
            statusCode: 200,
            body: JSON.stringify('Image processed and moved successfully!'),
        };
        return response;
    } catch (error) {
        console.error('Error processing the object', error);
        return {
            statusCode: 500,
            body: JSON.stringify('Error processing the file'),
        };
    }
};

// Helper function to convert a stream to a buffer
const streamToBuffer = (stream) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });