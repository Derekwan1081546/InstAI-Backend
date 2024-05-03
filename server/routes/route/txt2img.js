const express = require('express')
const axios = require('axios')
const fs = require('fs');
const { error } = require('console');
const router = express.Router()
const INSTANCE_IP = process.env.INSTANCE_IP;
const ensuretoken = require('../../authtoken.js');
const { pool,rdsConnection } = require("../../src/database.js");
const jwt = require('jsonwebtoken');
const { PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand  } = require('@aws-sdk/client-s3'); // 引入 AWS SDK S3 的客戶端和命令
const {s3Client} = require('../../awsconfig.js');
const secretkey = process.env.SECRETKEY;
const bucketName = process.env.AWS_BUCKET_NAME;
//* middleware
router.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', `http://localhost:3000`);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    console.log(req.method, req.url)
    next()
})

//* send to img2img api (stable diffusion)
//TODO edit request to requestData
router.post('/process', ensuretoken, async function (req, res) {
    console.log(req.token);
    jwt.verify(req.token, secretkey , async function(err,data){
        if(err){
        res.sendStatus(403);
        } else {
            try {
                //! transfer data
                // const raw_image = req.body.raw_image
                // const prompt = req.body.prompt
                // const negative_prompt = req.body.negative_prompt
                // const resize_mode = req.body.resize_mode
                // const denoising_strength = req.body.denoising_strength
                // const inpaint_full_res = req.body.inpaint_full_res
                // const inpaint_full_res_padding = req.body.inpaint_full_res_padding
        
                //! read image from directory & send json(request) to stable diffusion
                // if (err) {
                //     console.log(err)
                //     return res.status(500).send('error')
                // }
                // const requestData =
                // {
                //     // main argument
                //     "prompt": "a dog",
                //     "negative_prompt": "",
                //     "denoising_strength": 0.6,
                //     "styles": [],
                //     "seed": -1,
                //     "batch_size": 1,
                //     "n_iter": 1,
                //     "steps": 50,
                //     "cfg_scale": 7,
                //     "width": 512,
                //     "height": 512,
                //     "restore_faces": false,
                //     "tiling": false,
                //     "eta": 0,
                //     "sampler_index": "Euler",
                //     "alwayson_scripts": "",
        
                //     // setup argument
                //     "override_settings": {
                //         "sd_model_checkpoint": "v1-5-pruned-emaonly.ckpt"
                //     },
                //     "send_images": true,
                //     "save_images": false,
                // }
                //? send json(request) to stable diffusion
                console.log(req.body);
                axios.post('http://3.209.60.70:7860/sdapi/v1/txt2img', req.body, { timeout: 1000000 * 10 ^ 3 })//http://3.209.60.70:7860/sdapi/v1/txt2img
                    .then(reponse => {
                        const username = req.query.username;
                        const projectname = req.query.projectname;
                        const count = req.query.count;
                        const data_image = reponse.data.images;
                        dataImageString = String(data_image);

                        if (data_image.toString) {
                            dataImageString = data_image.toString();
                        }
                        console.log(typeof dataImageString);
                        const base64Array = dataImageString.split(',');

                        const jsonObject = {};
                        base64Array.forEach((base64String, index) => {
                            const key = `img${index + 1}`;
                            jsonObject[key] = base64String;
                        });
                        const jsonString = JSON.stringify(jsonObject, null, 2);
                        const s3path= `uploads/${username}/${projectname}/SDImages/SDImages${count}.json`;
                        // 設定 S3 上傳參數
                        const params = {
                            Bucket: bucketName,
                            Key: s3path,
                            Body: jsonString,
                            ContentType: 'application/json'
                        };

                        // 使用 PutObjectCommand 上傳 JSON 檔案到 S3
                        const command = new PutObjectCommand(params);

                        s3Client.send(command)
                            .then(data => {
                            console.log("JSON 檔案成功上傳到 S3 的", s3path);
                            })
                            .catch(error => {
                            console.error("Error uploading file to S3:", error);
                        });
                        const insertsql = "INSERT INTO  SDImages (user_id, project_name, count, base64, CreateTime) values (?, ?, ?, ?, ?) ";
                        const currentDate = new Date();
                        rdsConnection.query(insertsql, [username, projectname, count, s3path, currentDate], (err, results) => {
                            if (err) {
                            console.error(err);
                            res.status(500).send("error");
                            }
                            console.log("insert into SDImages success!");
                            res.status(200).json(data_image);
                        });
                    })
                    .catch(error => {
                        console.log(error)
                        res.status(500).send("error")
                    })
            } catch (err) {
                console.log(err)
                res.status(500).send("error")
            }
        }
    })
    

})


//提供前端於Internal_user顯示該專案上傳模型的資訊
router.get("/getsdimg", ensuretoken, async function (req, res) {
    console.log(req.token);
    jwt.verify(req.token, secretkey, async function(err, data) {
      if (err) {
        res.sendStatus(403);
      } else {
        const username = req.query.username;
        const projectname = req.query.projectname;
        const count = req.query.count;
        console.log(username, projectname,count);
        const getsql = "select * from SDImages where user_id = ?  and project_name = ? and count = ?";
        rdsConnection.query(getsql, [username, projectname, count], async (err, results) => {
          if (err) {
            console.error("Error executing SQL query:", err);
            return res.status(500).json({ error: "Internal server error" });
          }
          //let allImages = [];
          if (results.length > 0) {
            // for (const result of results) {
            //   const data = {
            //     id: result.id,
            //     user_id: result.user_id,
            //     projectname: result.project_name,
            //     count: result.count,
            //     base64: result.base64,
            //     createtime: result.CreateTime
            //   };
            //   allImages.push(data);
            // }
            return res.status(200).send(results[0].base64);
          } else {
            return res.status(404).json({ error: "No SDImages found." });
          }
        });
      }
    });
  });

module.exports = { router }