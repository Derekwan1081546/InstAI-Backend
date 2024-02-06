const express = require('express')
const router = express.Router()
const { rdsConnection } = require('../../src/database.js')
const { PutObjectCommand  } = require('@aws-sdk/client-s3');
const {s3Client} = require('../../awsconfig.js');

const s3BucketName = process.env.AWS_BUCKET_NAME;
const INSTANCE_IP = process.env.INSTANCE_IP;

router.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', `http://${INSTANCE_IP}:3000`);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    console.log(req.method, req.url)
    next()
})

//* signup
router.post('/signup', (req, res) => {
    console.log(req.body)
    console.log(req.body)
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
router.post('/login', (req, res) => {
    const sql = "SELECT * FROM Users WHERE `email`=(?) AND `password`=(?)";
    console.log(req.body)
    const folderName='uploads/';

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
            console.log(data[0].id);
            return res.json("Success"+ data[0].id);
        }
        else {
            return res.json("Faile");
        }
    })
})

module.exports = { router }