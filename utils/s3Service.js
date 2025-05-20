// utils/s3Service.js
const AWS = require("aws-sdk");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

const uploadToS3 = async (buffer, key, contentType = "application/pdf") => {
  try {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    };

    const uploadResult = await s3.upload(params).promise();

    // Generate pre-signed URL valid for 1 day
    const signedUrl = await s3.getSignedUrlPromise("getObject", {
      Bucket: params.Bucket,
      Key: params.Key,
      Expires: 86400,
    });

    return signedUrl;
  } catch (error) {
    console.error("❌ Error uploading to S3:", error);
    throw new Error("Failed to upload file to S3.");
  }
};

module.exports = { uploadToS3 };
