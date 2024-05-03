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
let desc = [];
router.get("/getproject", ensuretoken, async function(req, res) {
  console.log(req.token);
  jwt.verify(req.token, secretkey , async function(err,data){
    if(err){
      res.sendStatus(403);
    }else{
      arr = [];
      desc = [];
      console.log(req.body);
      const username = req.query.username;
      const folderPath = `uploads/${username}/`;
      console.log('Decoded JWT payload:', data);
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

            // for (const file of data.Contents) {
            //   console.log('Processing file:', file.Key);
            //   arr.push(file.Key);
            // }
          }

          if (data.CommonPrefixes && data.CommonPrefixes.length > 0) {
            console.log("Processing folders");

            for (const folder of data.CommonPrefixes) {
              console.log('Processing folder:', folder.Prefix);
              const parts = folder.Prefix.split('/');
              arr.push(parts[parts.length - 2]);
              console.log(arr);
              // 使用 await 等待查詢的完成
              try {
                const results = await new Promise((resolve, reject) => {
                  const check = 'select project_description from Projects where project_name=? and user_id=?';
                  rdsConnection.query(check, [parts[parts.length - 2], username], (err, results) => {
                    if (err) {
                      console.error("Error executing SQL query:", err);
                      reject(err);
                    } else {
                      resolve(results);
                    }
                  });
                });

                if (results.length > 0) {
                  const project_description = results[0].project_description;
                  console.log("description:", project_description);
                  desc.push(project_description);
                } else {
                  console.log("Folder does not exist");
                }
              } catch (err) {
                console.error("Error executing SQL query:", err);
                throw err;
              }
            }
          }
        } else {
          console.log("Folder does not exist");
        }
        // console.log(arr);
        // res.status(200).json(arr);
        //console.log(desc);
        console.log({arr,desc});
        return res.status(200).json({projectname: arr,desc});
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
      const projectdesc = req.body.projectDescription;
      const projecttype = req.body.type;
      const projectstatus = projecttype === 'AI Model training' ? 'Image upload':'Image generation';
      const currentDate = new Date();
      console.log(username, projectname,  projectdesc, currentDate);
      const query = 'INSERT INTO Projects (user_id, project_name, project_description, status, img_generation_remaining_count, CreateTime, Type, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      const check = 'select * from Projects where project_name=? and user_id=?';
      rdsConnection.query(check, [projectname, username], (err, results) => {
        if (err) throw err;
        if(results.length>0)
        {
          console.log("專案已存在");
          return res.status(200).json("專案已存在");
        }
        else
        {
          const selectsql='select * from Users where id = ?'
          rdsConnection.query(selectsql, [username], (err, results) => {
            if (err) throw err;
            if (results.length > 0) {
              const email = results[0].email;
              rdsConnection.query(query, [username, projectname, projectdesc, projectstatus, 4, currentDate, projecttype, email], (err, results) => {
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
        }
      })
        }
      });

      

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
      const status = req.body.step;
      const username = req.body.username;
      const projectname = req.body.projectname;
      console.log(status, username, projectname);
      const currentDate = new Date();
      const updatestatus = "update Projects set status = ?, LastUpdated = ? where user_id = ? and project_name = ?";
      rdsConnection.query(updatestatus, [status, currentDate, username, projectname], (err, results) => {
        if (err) throw err;
        console.log("update Project status to " + status + "success!");
        res.status(200).send("update Project status to " + status + "success!");
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
      const username = req.query.username;
      const projectname = req.query.projectname;
      console.log(username, projectname);

      const getstep = "select status from  Projects where user_id = ? and project_name = ?";
      rdsConnection.query(getstep, [username, projectname], (err, results) => {
        if (err) {
          console.error("Error executing SQL query:", err);
          return res.status(500).json({ error: "Internal server error" });
        }

        if (results.length > 0) {
          const status = results[0].status;
          console.log("status:", status);
          return res.status(200).send(status);
        } else {
          return res.status(404).json({ error: "Project not found" });
        }
      });
    }
  })
  
});

router.post("/modifyimgcount", ensuretoken, async function(req, res) {
  console.log(req.token);
  jwt.verify(req.token, secretkey , async function(err,data){
    if(err){
      res.sendStatus(403);
    } else {
      console.log(req.body);
      const count = req.body.count;
      const username = req.body.username;
      const projectname = req.body.projectname;
      console.log(count, username, projectname);

      const updatecount = "update Projects set img_generation_remaining_count = ? where user_id = ? and project_name = ?";
      rdsConnection.query(updatecount, [count,username, projectname], (err, results) => {
        if (err) throw err;
        console.log("update Project img_generation_remaining_count to " + count + "success!");
        res.status(200).send(count);
      });

    }
  })
  
});

router.get("/getimgcount", ensuretoken, async function(req, res) {
  console.log(req.token);
  jwt.verify(req.token, secretkey , async function(err,data){
    if(err){
      res.sendStatus(403);
    } else {
      console.log(req.body);
      const username = req.body.username;
      const projectname = req.body.projectname;
      console.log(projectname);

      const getcount = "select img_generation_remaining_count from  Projects where user_id = ? and project_name = ?";
      rdsConnection.query(getcount, [username, projectname], (err, results) => {
        if (err) {
          console.error("Error executing SQL query:", err);
          return res.status(500).json({ error: "Internal server error" });
        }

        if (results.length > 0) {
          const count = results[0].img_generation_remaining_count;
          console.log("img_generation_remaining_count:", count);
          return res.status(200).send(count);
        } else {
          return res.status(404).json({ error: "Project not found" });
        }
      });
    }
  })
  
});

//list all project's info
// let allprojects = [];
router.get("/getallproject", ensuretoken, async function(req, res) {
  console.log(req.token);
  jwt.verify(req.token, secretkey, async function(err, data) {
    if (err) {
      res.sendStatus(403);
    } else {
      const getsql = "select * from Projects";
      rdsConnection.query(getsql, [], async (err, results) => {
        if (err) {
          console.error("Error executing SQL query:", err);
          return res.status(500).json({ error: "Internal server error" });
        }
        let allprojects = [];
        if (results.length > 0) {
          for (const result of results) {
            // const selectsql = "select email from Users where id = ?";
            // let user_email = '';
            // try {
            //   const queryResult = await new Promise((resolve, reject) => {
            //     rdsConnection.query(selectsql, [result.user_id], (err, results) => {
            //       if (err) {
            //         reject(err);
            //       } else {
            //         resolve(results);
            //       }
            //     });
            //   });
              
            //   if (queryResult.length > 0) {
            //     user_email = queryResult[0].email;
            //     // console.log('user email:', user_email);
            //   }
            // } catch (err) {
            //   console.error("Error querying user email:", err);
            // }

            const project = {
              id: result.id,
              userid: result.user_id,
              email: result.email,
              project_name: result.project_name,
              status: result.status,
              project_description: result.project_description,
              Type: result.Type,
              CreateTime: result.CreateTime,
              img_generation_remaining_count: result.img_generation_remaining_count
            };
            allprojects.push(project);
          }
          return res.status(200).send(allprojects);
        } else {
          return res.status(404).json({ error: "No projects found." });
        }
      });
    }
  });
});

module.exports = { router };
