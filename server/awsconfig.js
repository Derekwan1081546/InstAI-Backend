const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const multer = require("multer");
const iconv = require('iconv-lite');
// AWS 設定
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const s3BucketName = process.env.AWS_BUCKET_NAME;
const S3_BUCKET_REGION = process.env.AWS_REGION;

// Create an instance of the S3 client with the specified configuration
const s3Client = new S3Client({
  region: S3_BUCKET_REGION,
  credentials: {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  },
});

const storage = multerS3({
  s3: s3Client,
  bucket: s3BucketName,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    const username = req.query.username;
    const projectname = req.query.projectname;
    const folderPath = `uploads/${username}/${projectname}/`; // 指定資料夾路徑
    const fileName = `${folderPath}${Buffer.from(file.originalname,'binary').toString()}`; // 保留原始檔名
    cb(null, fileName);
  },
  contentDisposition: function (req, file, cb) {
    const fileName = encodeURIComponent(file.originalname);
    cb(null, `inline; filename*=UTF-8''${fileName}`);
  }
});

// function checkFileType(file, cb) {
//   const filetypes = /jpeg|jpg|png|json|png/;

//   const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

//   const mimetype = filetypes.test(file.mimetype);
  

//   if (extname && mimetype) {
//     return cb(null, true);
//   } else {
//     cb('Error: Images only (jpeg, jpg, png, gif, mp4, mov, png)!');
//   }
// }

// const upload = multer.diskStorage({
//   storage: storage,
//   fileFilter: function (req, file, cb) {
//     checkFileType(file, cb);
//   },
// }); 

// const upload = multer.diskStorage({
//   storage: multerS3({
//     s3: s3Client,
//     bucket: s3BucketName,
//     // Set public read permissions
//     acl: 'public-read',
//     // Set key/ filename as original uploaded name
//     key: function (req, file, cb) {
//       const username = req.query.username;
//       const projectname = req.query.projectname;
//       const folderPath = `uploads/${username}/${projectname}/`; // 指定資料夾路徑
//       const fileName = `${folderPath}${file.originalname}`;
//       cb(null, fileName);
//     }
//   })
// })


// Export the configured AWS SDK client
module.exports ={s3Client, storage};