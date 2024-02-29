const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const { pool,rdsConnection } = require("../../src/database.js");
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand   } = require('@aws-sdk/client-s3');
const {s3Client} = require('../../awsconfig.js');
const s3BucketName = process.env.AWS_BUCKET_NAME;
const INSTANCE_IP = process.env.INSTANCE_IP;
const ensuretoken = require('../../authtoken.js');
const jwt = require('jsonwebtoken');
const secretkey = process.env.SECRETKEY;
router.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", `http://localhost:3000`);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  console.log(req.method, req.url);
  next();
});

// async function checkS3FolderExists(folderPath, username, projectname) {
//   try {
//     const data = await s3Client.send(new ListObjectsV2Command({
//       Bucket: s3BucketName,
//       Prefix: folderPath,
//       Delimiter: '/',
//     }));

//     if (data.Contents.length > 0 || data.CommonPrefixes.length > 0) {
//       console.log("Folder exists");

//       // 如果有文件，處理每個文件
//       for (const file of data.Contents) {
//         if(!file.Key.endsWith('/')){
//           console.log('Processing file:', file.Key);
//         } 
//       }
//       return true;
//     } else {
//       console.log("Folder does not exist");
//       return false;
//     }
//   } catch (err) {
//     console.error("Error checking S3 folder:", err);
//     return false;
//   }
// }
let arr = [];
router.get("/getproject", ensuretoken, async function(req, res) {
  console.log(req.token);
  jwt.verify(req.token, secretkey , async function(err,data){
    if(err){
      res.sendStatus(403);
    }else{
      arr = [];
      console.log(req.body);
      const username = req.query.username;
      const folderPath = `uploads/${username}/`;

      try {
        const data = await s3Client.send(new ListObjectsV2Command({
          Bucket: s3BucketName,
          Prefix: folderPath,
          Delimiter: '/',
        }));

        if (data && (data.Contents || data.CommonPrefixes)) {
          console.log("Folder exists");

          if (data.Contents && data.Contents.length > 0) {
            console.log("Processing files");

            for (const file of data.Contents) {
              console.log('Processing file:', file.Key);
              arr.push(file.Key);
            }
          }

          if (data.CommonPrefixes && data.CommonPrefixes.length > 0) {
            console.log("Processing folders");

            for (const folder of data.CommonPrefixes) {
              console.log('Processing folder:', folder.Prefix);
              const parts = folder.Prefix.split('/');
              arr.push(parts[parts.length - 2]);
              
            }
          }
        } else {
          console.log("Folder does not exist");
        }
        console.log(arr);
        res.status(200).json(arr);
      } catch (err) {
        console.error("Error checking S3 folder:", err);
        res.status(500).json(err.message);
      }
    }
  })

});

router.post("/addproject", ensuretoken, async function(req, res) {
  console.log(req.token);
  jwt.verify(req.token, secretkey , async function(err,data){
    if(err){
      res.sendStatus(403);
    }else{
      console.log(req.body);
      const username = req.query.username;
      const projectname = req.body.projectName;
      console.log(username, projectname);
      const query = 'INSERT INTO Projects (user_id, project_name, step) VALUES (?, ?, ?)';
      const check = 'select * from Projects where project_name=?';
      rdsConnection.query(check, [projectname], (err, results) => {
        if (err) throw err;
        if(results.length>0)
        {
          console.log("專案已存在");
        }
        else
        {
          rdsConnection.query(query, [username, projectname, '0'], (err, results) => {
            if (err) throw err;
            console.log(results.insertId)
            console.log("project insert success.")
          });
        }
      });

      const folderName=`uploads/${username}/${projectname}/`;

      //先檢查專案是否存在
      // 設定參數
      const params = {
        Bucket: s3BucketName,
        Prefix: folderName, // 資料夾路徑
        Delimiter: '/',    // 以 / 作為分隔符
        MaxKeys: 1,         // 最多返回一個結果
      };

      // 使用 ListObjectsV2Command 檢查資料夾是否存在
      s3Client.send(new ListObjectsV2Command(params))
        .then(data => {
          // 檢查 data.Contents 是否已定義並且有 length 屬性
          if (data.Contents && data.Contents.length > 0) {
            console.log("資料夾存在");
            res.send("專案已存在!");
          } else {
            console.log("資料夾還不存在");
            const putObjectCommand = new PutObjectCommand({
              Bucket: s3BucketName,
              Key: folderName,
              Body: '',
              });
          
              s3Client.send(putObjectCommand)
              .then((data) => {
                  console.log('username and projectname Folder created successfully:', data);
                  res.send("專案新增成功!");
              })
              .catch((err) => {
                  console.error('Error creating folder:', err);
              });
          }
        })
        .catch(error => {
          console.error("Error checking folder in S3:", error);
        });
          // res.json({
          //   terxt:"test123"
          // });
    }
  })

});

router.post("/deleteproject", ensuretoken, async function(req, res) {
  console.log(req.token);
  jwt.verify(req.token, secretkey , async  function(err,data){
    if(err){
      res.sendStatus(403);
    } else {
      console.log(req.body);
      const username = req.query.username;
      console.log(username);
      const projectname = req.body.projectName;
      console.log(projectname);

      rdsConnection.query('select id from Projects where project_name=?', [projectname], (err, data) => {
        if (err) {
            console.log(err);
        }
        if(data.length>0)
        {
          const project_id=data[0].id;
          const delreqsql = "delete from  Requirements where project_id = ?" ;
          rdsConnection.query(delreqsql, [project_id], (err, data) => {
            if (err) console.log("delete Requirements error.");
            else console.log("delete Requirements success.");
          });
        }
        else
        {
          console.log("Project not found.");
        }
      });

      const delsql = "delete from  Images where project_id = ?" ;
      rdsConnection.query(delsql, [projectname], (err, data) => {
        if (err) console.log("delete Image error.");
        else console.log("delete image success.");
      });

      const sql = "delete from  Projects where project_name = ?" ;
      rdsConnection.query(sql, [projectname], (err, data) => {
        if (err) console.log("delete error.");
        else console.log("delete Project success.");
      });

      const folderName=`uploads/${username}/${projectname}/`;

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
          res.send("專案已刪除!"); 
        })
        .catch(error => {
          console.error("Error deleting folder in S3:", error);
          res.status(500).send("刪除專案時發生錯誤"); 
        });

    }
  })
  
});

router.post("/confirmstep", ensuretoken, async function(req, res) {
  console.log(req.token);
  jwt.verify(req.token, secretkey , async function(err,data){
    if(err){
      res.sendStatus(403);
    } else {
      console.log(req.body);
      const step = req.query.step;
      const username = req.query.username;
      const projectname = req.query.projectname;
      console.log(projectname);

      const updatestep = "update Projects set step = ? where user_id = ? and project_name = ?";
      rdsConnection.query(updatestep, [step,username, projectname], (err, results) => {
        if (err) throw err;
        console.log("update Project step to " + step + "success!");
        res.status(200).send(step);
      });

    }
  })
  
});

router.get("/getstep", ensuretoken, async function(req, res) {
  console.log(req.token);
  jwt.verify(req.token, secretkey , async function(err,data){
    if(err){
      res.sendStatus(403);
    } else {
      console.log(req.body);
      const username = req.query.username;
      const projectname = req.query.projectname;
      console.log(projectname);

      const getstep = "select step from  Projects where user_id = ? and project_name = ?";
      rdsConnection.query(getstep, [username, projectname], (err, results) => {
        if (err) {
          console.error("Error executing SQL query:", err);
          return res.status(500).json({ error: "Internal server error" });
        }

        if (results.length > 0) {
          const step = results[0].step;
          console.log("Step:", step);
          return res.status(200).send(step);
        } else {
          return res.status(404).json({ error: "Project not found" });
        }
      });
    }
  })
  
});

module.exports = { router };
