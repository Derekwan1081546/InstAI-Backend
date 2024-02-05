const express = require('express')
const cors = require('cors');
const path = require('path')
const { WebSocket } = require('ws')
const bodyParser=require('body-parser')
const app = express()
// 👇️ configure CORS
app.use(cors());
const api = require('./routes/api')
const { HeadBucketCommand } = require('@aws-sdk/client-s3'); // 引入 AWS SDK S3 的客戶端和命令
const {s3Client} = require('./awsconfig.js');
require('dotenv').config(); //載入.env環境檔
// function getEnvVariable () {
//     const env_variable= process.env.YOUR_VARIABLE;// 取出環境變數
//     console.log(env_variable);
// }
// getEnvVariable()

// AWS 設定
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const s3BucketName = process.env.AWS_BUCKET_NAME;
const S3_BUCKET_REGION= process.env.AWS_REGION;

// // 建立新的 S3 用戶端實例，設定區域和認證資訊
// const s3Client = new S3Client({
//     region: S3_BUCKET_REGION,
//     credentials: {
//       accessKeyId: awsAccessKeyId,
//       secretAccessKey: awsSecretAccessKey,
//     },
// });


// // 連線到 S3
// const s3 = new AWS.S3({
//     region: S3_BUCKET_REGION,
//     credentials: {
//       accessKeyId: awsAccessKeyId,
//       secretAccessKey: awsSecretAccessKey,
//     },
// });



// List objects in the S3 bucket
// s3Client.listObjects({ Bucket: s3BucketName }, (err, data) => {
//   if (err) {
//     console.error('Error listing objects:', err);
//   } else {
//     console.log('成功連線到 S3');
//     console.log('Objects in the bucket:', data.Contents.length);
//   }
// });


// 使用 HeadBucketCommand 检查存储桶是否存在，表示连接成功
const headBucketCommand = new HeadBucketCommand({ Bucket: s3BucketName });

s3Client.send(headBucketCommand)
  .then(() => {
    console.log('Connected to S3 successfully!');
  })
  .catch((err) => {
    console.error('Error connecting to S3:', err.message);
  });

//* server setup
app.use(bodyParser.json({limit:'100mb'}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// app.use(express.static(path.join(__dirname, '../client')))
app.use('/api', api.router)


//* open server
const port = process.env.PORT || 8080
const server = app.listen(port, () => { console.log(`CORS-enabled web server listening on port ${port}`);console.log('working to open') })

//* websocket
const wss = new WebSocket.Server({ server })
wss.on('connection', (ws) => {
    console.log('client connected')

    //! message from client
    ws.on('message', (message) => {
        console.log(message)





    })

    //! disconnect
    ws.on('close', () => {
        console.log('leave socket')
    })
})