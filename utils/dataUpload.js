const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const multer = require("multer");

// Use memory storage for Multer (no local disk usage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Single file upload handler
const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded");
  }

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${Date.now()}_${req.file.originalname}`,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    const objectUrl = `https://${params.Bucket}.s3.amazonaws.com/${params.Key}`;
    res.status(200).send({ message: "File uploaded", objectUrl });
  } catch (err) {
    console.error("S3 Upload Error:", err);
    res.status(500).send("Failed to upload file: " + err.message);
  }
};

// Multiple files upload handler
const uploadFiles = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send("No files uploaded");
  }

  const ObjectUrls = [];

  try {
    for (const file of req.files) {
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      await s3Client.send(new PutObjectCommand(params));
      const objectUrl = `https://${params.Bucket}.s3.amazonaws.com/${params.Key}`;
      ObjectUrls.push(objectUrl);
    }

    res.status(200).send({ message: "Files uploaded", ObjectUrls });
  } catch (err) {
    console.error("S3 Upload Error:", err);
    res.status(500).send("Failed to upload files: " + err.message);
  }
};

module.exports = {
  upload,
  uploadFile,    
  uploadFiles,   
};
