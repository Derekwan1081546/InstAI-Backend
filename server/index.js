const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { WebSocket } = require('ws');
const bodyParser = require('body-parser');
const app = express();

const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

// 👇️ configure CORS
app.use(cors());
const api = require('./routes/api');
const { HeadBucketCommand } = require('@aws-sdk/client-s3'); // 引入 AWS SDK S3 的客戶端和命令
const { s3Client } = require('./awsconfig.js');
require('dotenv').config(); //載入.env環境檔
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
app.use(bodyParser.json({ limit: '100mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', api.router);

if (cluster.isMaster) {
  console.log(`Primary ${process.pid} is running`);
  console.log("master process:" + process.pid);
  console.log("cpu num: " + numCPUs.toString());
  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  const port = process.env.PORT || 8080;
  // Workers can share any TCP connection
  // In this case it is an HTTP server

  const server = http.createServer(app).listen(port, () => {
    console.log(`Worker ${process.pid} started`);
    console.log(`CORS-enabled web server listening on port ${port}`);
  });

  console.log(`Worker ${process.pid} started`);
  //* open server
  
  const wss = new WebSocket.Server({ server });
  wss.on('connection', (ws) => {
    console.log('client connected');
    ws.send("hello welcome to websocket server!");

    //! message from client
    ws.on('message', (message) => {
      console.log(message);
      ws.send(message + " (from server)");
    });

    //! disconnect
    ws.on('close', () => {
      console.log('leave socket');
    });
  });
}
