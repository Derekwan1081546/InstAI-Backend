const express = require("express");
const path = require("path");
const fs = require("fs");
const axios = require('axios')
const router = express.Router();
const { pool, rdsConnection } = require("../../src/database.js");
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { createWriteStream } = require('fs');
const {s3Client} = require('../../awsconfig.js');
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

router.get("/getsdmodel", ensuretoken , async(req, res) => {
  console.log(req.token);
    jwt.verify(req.token, secretkey , async function(err,data){
        if(err){
        res.sendStatus(403);
        } else {
            try {
                //console.log(req.body);
                axios.get('http://3.209.60.70:7860/sdapi/v1/sd-models', { timeout: 1000000 * 10 ** 3 })
                .then(response => {
                  const data = response.data; // Get the response body data
                  console.log(data);
                  const currentDate = new Date();
                  const checksql='select checkpoint from SDModels where checkpoint=?';
                  const sql = 'INSERT INTO SDModels (model_path, model_name, checkpoint, createtime, LastUpdated) VALUES (?, ?, ?, ?, ?)';
                  const selectsql = 'select checkpoint,model_name, description from SDModels';
                  let allResults = []; // Array to store all results
                  // Loop through each data item and insert it into the table
                  data.forEach(item => {
                    const { filename, model_name, title } = item;
                    rdsConnection.query(checksql, [ title ], (err, results) => {
                      if (err) throw err;
                      if(results.length > 0){
                        console.log(`Model ${title} already exist!`);
                      }
                      else
                      {
                          rdsConnection.query(sql, [filename, model_name, title, currentDate, currentDate], (err, results) => {
                          if (err) {
                            console.error(err);
                          } else {
                            console.log(`Model ${model_name} inserted successfully.`);
                            console.log('Inserted ID:', results.insertId);
                          }
                        });
                      }
                    });
                  });
                  rdsConnection.query(selectsql, [], (err, results) => {
                    if (err) {
                      console.error(err);
                      res.status(500).send("error");
                    } else {
                      console.log(results);
                      results.forEach(result => {
                        allResults.push(result); // Push each result to the array
                      });
                      res.status(200).json(allResults); // Return data
                      // allResults.push(results); // Push results to the array
                      // res.status(200).json(allResults); // Return data      
                    }
                  });
                  
                })
                .catch(error => {
                  console.error(error);
                  res.status(500).send("error");
                });
            } catch (err) {
                console.log(err)
                res.status(500).send("error")
            }
        }
    })
});
//modifysdmodel
router.post("/modifysdmodel", ensuretoken, async function(req, res) {
  console.log(req.token);
  jwt.verify(req.token, secretkey , async function(err,data){
    if(err){
      res.sendStatus(403);
    } else {
      console.log(req.body);
      const description = req.body.description;
      const modelname = req.body.modelname;
      const checkpoint = req.body.checkpoint;
      console.log(description, modelname, checkpoint);
      const updatesql = "update SDModels set description = ? , model_name = ? , LastUpdated = ?  where checkpoint = ? ";
      const currentDate = new Date();
      rdsConnection.query(updatesql, [description, modelname, currentDate, checkpoint], (err, results) => {
        if (err) {
          console.error(err);
          res.status(500).send("error");
        }
        console.log("update description success!");
        res.status(200).send("update description success!");
      });

    }
  })
});


let arr = [];
router.get("/getmodel", (req, res) => {
  try {
    arr = [];
    console.log(req.body);
    const username = req.query.username;
    const user_path = path.join(__dirname, "../../uploads", username);
    console.log(username, user_path);
    if (fs.existsSync(user_path)) {
      console.log("folder exists");
      fs.readdirSync(user_path).forEach((folder) => {
        console.log(folder);
        arr.push(folder);
      });
      console.log(arr);
    } else {
      fs.mkdirSync(user_path);
    }
    res.status(200).json(arr);
  } catch (error) {
    res.status(500).json(error.message);
  }
});
const s3BucketName = process.env.AWS_BUCKET_NAME;
async function downloadFile() {
  const params = {
    Bucket: s3BucketName,
    Key: 'uploads/yolov3tiny.zip',
  };

  try {
    const { Body } = await s3Client.send(new GetObjectCommand(params));

    // 使用Writable Stream將檔案內容寫入本地檔案
    const writeStream = createWriteStream("D:/yolov3tiny.zip");
    Body.pipe(writeStream);

    // 等待檔案寫入完成
    await new Promise((resolve) => writeStream.on('close', resolve));

    console.log('檔案下載成功');
  } catch (error) {
    console.error('下載檔案時發生錯誤:', error);
  }
}


router.post("/downloadmodel", ensuretoken, async function(req, res) {
  console.log(req.token);
  jwt.verify(req.token, secretkey , async function(err,data){
    if(err){
      res.sendStatus(403);
    } else {
      console.log(req.body);
      const username = req.query.username;
      const projectname = req.query.projectname;
      const modelname = req.query.modelname;
      const versionnum =1;
      console.log(username, projectname);
      //downloadFile();
      const modelpath = `uploads/${username}/${projectname}/requirements.json`; // 指定資料夾路徑
      const insert = 'INSERT INTO Models (project_id, model_path, model_name, version_number, createtime) VALUES (?, ?, ?, ?, ?)';
      const check = 'select id from Projects where project_name=?';
      rdsConnection.query(check, [projectname], async(err, data) => {
          if (err) {
              console.log(err);
          }
          if(data.length>0){
              const project_id=data[0].id;
              const currentDate = new Date();
              console.log(currentDate);
              rdsConnection.query(insert, [project_id, modelpath, modelname, versionnum, currentDate], async(err, results) => {
                  if (err) throw err;
                  console.log("insert Model success.");
                  //return res.status(200).send("模型下載成功!");
                  //const key = `uploads/${username}/${projectname}/yolov3tiny.zip`;
                  const key = 'uploads/yolov3tiny.zip';
                  const params = {
                    Bucket: s3BucketName,
                    Key: key,
                  };
                  
                  try {
                    const { Body } = await s3Client.send(new GetObjectCommand(params));
                    const key= 'yolov3tiny.zip';
                    // 設定HTTP標頭，告訴瀏覽器應該如何處理檔案
                    res.setHeader('Content-Disposition', `attachment; filename=${key}`);
                    res.setHeader('Content-Type', 'application/octet-stream');
                
                    // 將S3的檔案內容直接傳送到HTTP回應
                    Body.pipe(res);
                  } catch (error) {
                    console.error('下載檔案時發生錯誤:', error);
                
                    // 如果出現錯誤，回傳錯誤訊息給前端
                    res.status(500).json({ success: false, message: '下載檔案時發生錯誤' });
                  }
                
              });
          }
          else
          {
              console.log("project not found.");
              return res.status(404).json({ error: "Project not found" });
          }
      });
    }
  })
    
  });


module.exports = { router };
