const express = require('express')
const router = express.Router()
const { rdsConnection } = require('../../src/database.js')
const { PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand  } = require('@aws-sdk/client-s3');
const {s3Client} = require('../../awsconfig.js');
const ensuretoken = require('../../authtoken.js');
const jwt = require('jsonwebtoken');
const s3BucketName = process.env.AWS_BUCKET_NAME;
const INSTANCE_IP = process.env.INSTANCE_IP;
const secretkey = process.env.SECRETKEY;
const adminemail = process.env.REACT_APP_EMAIL;
const adminpassword = process.env.REACT_APP_PASSWORD;
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
    const sql = "INSERT INTO Users (`firstname`,`lastname`,`email`,`password`,`createtime`,`role`) VALUES (?)";
    const currentDate = new Date();
    const values = [
        req.body.fname,
        req.body.lname,
        req.body.email,
        req.body.password,
        currentDate,
        req.body.role || 'normal_user'
    ]

    rdsConnection.query(selectsql, [req.body.email, req.body.password], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
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
              const folderName = `uploads/${insertedId}/`;
              const putObjectCommand = new PutObjectCommand({
              Bucket: s3BucketName,
              Key: folderName,
              Body: '',
              });
          
              s3Client.send(putObjectCommand)
              .then((data) => {
                  console.log('user Folder created successfully:', data);
              })
              .catch((err) => {
                  console.error('Error creating folder:', err);
              });
              return res.json("register success!");
          })
        }
    })
      
    
})

//* login
router.post('/login', async(req, res) => {
    const sql = "SELECT * FROM Users WHERE `email`=(?) AND `password`=(?)";
    console.log(req.body)
    const { email, password } = req.body;

    if (email === process.env.REACT_APP_EMAIL && password === process.env.REACT_APP_PASSWORD) {
        // Generate a special JWT token for admin user
        const options = {
            expiresIn: '2h' 
        };
        const token = jwt.sign({user: 'admin',email:email,password:password,role:'admin_user'}, secretkey, options);
        return res.json({message:"Admin Success", token: token});
    }

    rdsConnection.query(sql, [req.body.email, req.body.password], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        
        if (data.length > 0) {
            const options = {
                expiresIn: '2h' 
            };
            const user = data[0].id;
            const user_role = data[0].role;
            const token = jwt.sign({user:user,email:email,password:password,role:user_role}, secretkey, options);
            console.log(token);
            console.log(data[0].id);
            return res.json({message:"Success"+ data[0].id,token: token});
        }
        else {
            return res.json("Failed");
        }
    })
})

//list all user's info
let allusers = [];
router.get("/getuser", ensuretoken, async function(req, res) {
  console.log(req.token);
  jwt.verify(req.token, secretkey , async function(err,data){
    if(err){
      res.sendStatus(403);
    }else{
      allusers = [];
      console.log(req.body);
      console.log('Decoded JWT payload:', data);
      const selectsql = "select id, firstname, lastname, email, password, role, createtime from Users where `email`!=(?) AND `password`!=(?) ";
      rdsConnection.query(selectsql, [adminemail, adminpassword], (err, results) => {
        if (err) {
          console.error(err);
          res.status(500).send("error");
        }
        console.log(results);
        results.forEach(result => {
          const user = {
            id: result.id,
            firstname: result.firstname,
            lastname: result.lastname,
            email: result.email,
            password: result.password,
            role: result.role,
            createtime: result.createtime,
          };

          // Push the new user object to the allusers array
          allusers.push(user);
          // allusers.push(result); // Push each result to the array
        });
        res.status(200).json(allusers); // Return data
      });
    }
  })

});

//modifyuserinfo
router.post("/modifyuser", ensuretoken, async function(req, res) {
    console.log(req.token);
    jwt.verify(req.token, secretkey , async function(err,data){
      if(err){
        res.sendStatus(403);
      } else {
        console.log(req.body);
        console.log('Decoded JWT payload:', data);
        const user_role = req.body.role;
        const user_firstname = req.body.firstname;
        const user_lastname = req.body.lastname;    
        const email = req.body.email;
        const password = req.body.password;
        const user_id = req.body.userid;
        console.log(user_role, user_firstname, user_lastname, email, password, user_id);
        const updatesql = "update Users set role = ? , firstname = ?, lastname = ?, email = ?, password = ?, LastUpdated = ? where id = ?";
        const currentDate = new Date();
        rdsConnection.query(updatesql, [user_role, user_firstname, user_lastname, email, password, currentDate, user_id], (err, results) => {
          if (err) {
            console.error(err);
            res.status(500).send("error");
          }
          console.log("update user's information success!");
          res.status(200).send("update user's information success!");
        });
  
      }
    })
})

//delete A user (including it's all project's and imgs and requirement)
router.post("/deleteuser", ensuretoken, async function(req, res) {
    console.log(req.token);
    jwt.verify(req.token, secretkey , async  function(err,data){
      if(err){
        res.sendStatus(403);
      } else {
        console.log(req.body);
        console.log('Decoded JWT payload:', data);
        const user_id = req.body.userid;
        console.log(user_id);

        const delprojectsql = "delete from  Projects where user_id = ?" ;
        rdsConnection.query(delprojectsql, [user_id], (err, data) => {
          if (err) console.log("delete Projects error.");
          else console.log("delete Projects success.");
        });

        const delreqsql = "delete from  Requirements where uploader = ?" ;
        rdsConnection.query(delreqsql, [user_id], (err, data) => {
            if (err) console.log("delete Requirements error.");
            else console.log("delete Requirements success.");
        });
  
        const delimgsql = "delete from  Images where uploader = ?" ;
        rdsConnection.query(delimgsql, [user_id], (err, data) => {
          if (err) console.log("delete Images error.");
          else console.log("delete Images success.");
        });
  
        const delusersql = "delete from  Users where id = ?" ;
        rdsConnection.query(delusersql, [user_id], (err, data) => {
            if (err) console.log("delete User error.");
            else console.log("delete User success.");
        });

        const folderName=`uploads/${user_id}/`;
  
        // 使用 ListObjectsV2Command 列舉資料夾下的所有物件
        const listParams = {
          Bucket: s3BucketName,
          Prefix: folderName, // 資料夾路徑
        };
  
        s3Client.send(new ListObjectsV2Command(listParams))
          .then(data => {
            // 取得資料夾下的所有物件的 Key
            const keysToDelete = data.Contents.map(object => ({ Key: object.Key }));
  
            // 設定 DeleteObjectCommand 參數
            const deleteParams = {
              Bucket: s3BucketName,
              Delete: {
                Objects: keysToDelete,
                Quiet: false,
              },
            };
  
            // 使用 DeleteObjectCommand 刪除資料夾下的所有物件
            return s3Client.send(new DeleteObjectsCommand (deleteParams));
          })
          .then(data => {
            console.log("資料夾刪除成功:", data);
            res.status(200).send("已刪除此使用者所有資訊!"); 
          })
          .catch(error => {
            console.error("Error deleting folder in S3:", error);
            res.status(500).send("刪除專案時發生錯誤"); 
          });
  
      }
    })
    
  });
module.exports = { router }