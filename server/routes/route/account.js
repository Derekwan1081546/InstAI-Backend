const express = require('express')
const router = express.Router()
const { rdsConnection } = require('../../src/database.js')
const { PutObjectCommand  } = require('@aws-sdk/client-s3');
const {s3Client} = require('../../awsconfig.js');
const ensuretoken = require('../../authtoken.js');
const jwt = require('jsonwebtoken');
const s3BucketName = process.env.AWS_BUCKET_NAME;
const INSTANCE_IP = process.env.INSTANCE_IP;
const secretkey = process.env.SECRETKEY;
router.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', `http://localhost:3000`);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    console.log(req.method, req.url)
    next()
})

//* signup
router.post('/signup', async(req, res) => {
    console.log(req.body);
    const selectsql = "SELECT * FROM Users WHERE `email`=(?) AND `password`=(?)";
    const sql = "INSERT INTO Users (`firstname`,`lastname`,`email`,`password`,`createtime`) VALUES (?)";
    const currentDate = new Date();
    const values = [
        req.body.fname,
        req.body.lname,
        req.body.email,
        req.body.password,
        currentDate
    ]

    rdsConnection.query(selectsql, [req.body.email, req.body.password], (err, data) => {
        if (err) {
            return res.json("Error");
        }
        if (data.length > 0) {
            return res.json("register failed!此Email已使用過!");
        }
        else{
            
            rdsConnection.query(sql, [values], (err, data) => {
                if (err) {
                    return res.json("error");
                }
                const insertedId = data.insertId;
                console.log(`Inserted userID: ${insertedId}`);
                return res.json("register success!" + insertedId);
            })
        }
    })
      
    
})

//* login
router.post('/login', async(req, res) => {
    const sql = "SELECT * FROM Users WHERE `email`=(?) AND `password`=(?)";
    console.log(req.body)
    const folderName='uploads/';
    const { email, password } = req.body;
    const putObjectCommand = new PutObjectCommand({
    Bucket: s3BucketName,
    Key: folderName,
    Body: '',
    });

    s3Client.send(putObjectCommand)
    .then((data) => {
        console.log('uploads Folder created successfully:', data);
    })
    .catch((err) => {
        console.error('Error creating folder:', err);
    });

    rdsConnection.query(sql, [req.body.email, req.body.password], (err, data) => {
        if (err) {
            return res.json("Error");
        }
        if (data.length > 0) {
            // 使用者驗證成功，生成 session
            // req.session.user = data[0];
            // console.log(req.session.user);
            const options = {
                expiresIn: '1h' 
              };
            const user = data[0].id;
            const token = jwt.sign({user}, secretkey, options);
            console.log(token);
            console.log(data[0].id);
            return res.json({message:"Success"+ data[0].id,token: token});
            //return res.json("Success"+ data[0].id);
        }
        else {
            return res.json("Faile");
        }
    })
})

module.exports = { router }