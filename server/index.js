const express = require('express')
const session = require('express-session');
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
const s3BucketName = process.env.AWS_BUCKET_NAME;
const secretkey = process.env.SECRETKEY;
// 👇️ 設置 session 中間件
app.use(session({
  secret: secretkey, // 建議將密鑰放到環境變數中
  resave: false,
  saveUninitialized: true
}));

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
const server = app.listen(port, () => { console.log(`CORS-enabled web server listening on port ${port}`);console.log('working to open'); })

//* websocket
const wss = new WebSocket.Server({ server })
wss.on('connection', (ws) => {
    console.log('client connected')
    ws.send("hello welcome to websocket server!")
    //! message from client
    ws.on('message', (message) => {
        console.log(message)
        ws.send(data + " (from server)")




    })

    //! disconnect
    ws.on('close', () => {
        console.log('leave socket')
    })
})

// const client = new WebSocket('ws://localhost:8080');

// client.on('open', function() {
//     console.log('WebSocket 已建立');
//     client.send('111');
// });

// client.on('message', function(message) {
//     console.log('收到消息:', message);
// });

// client.on('close', function() {
//     console.log('WebSocket 连接已关闭');
// });