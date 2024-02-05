const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require('axios');
const router = express.Router();
const { rdsConnection } = require("../../src/database.js");
const { PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand  } = require('@aws-sdk/client-s3'); // 引入 AWS SDK S3 的客戶端和命令
const {s3Client, storage} = require('../../awsconfig.js');
require('dotenv').config(); //載入.env環境檔
router.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  console.log(req.method, req.url);
  next();
});

const s3BucketName = process.env.AWS_BUCKET_NAME;
const S3_BUCKET_REGION= process.env.AWS_REGION;

const bucketName = s3BucketName; // 替換為實際的 S3 存儲桶名稱
//const key = awsAccessKeyId; // 上傳到 S3 的路徑和檔名

// const s3 = new S3Client({
//   region: S3_BUCKET_REGION,
//   credentials: {
//     accessKeyId: awsAccessKeyId,
//     secretAccessKey: awsSecretAccessKey,
//   },
// });



// 上傳圖片函式
async function uploadImageToS3(bucketName, filepath, file) {
  // 讀取圖片檔案
  // const fileContent = fs.readFileSync(filePath);
  // console.log(fileContent);
  // 上傳到 S3
  const params = {
    Bucket: bucketName,
    Key: filepath,
    Body: file.buffer,
    //ContentType: 'image/*' // 替換為實際的檔案類型
    //ContentType:  ['image/jpeg', 'image/png'],
    ContentType: file.mimetype,
  };

  try {
    const command = new PutObjectCommand(params);
    const response = await s3Client.send(command);
    console.log(`成功上傳到 S3，ETag: ${response.ETag}`);
    // 創建 S3 的 URL
    const imageUrl = `https://${bucketName}.s3.${S3_BUCKET_REGION}.amazonaws.com/${file}`;
    console.log('圖片網址:',imageUrl);
  } catch (err) {
    console.error(`無法上傳到 S3: ${err.message}`);
  }
}



async function uploadImageFromS3( key, username, projectname) {
  try {
    const query = 'INSERT INTO Images (image_name, project_id, image_path, uploader, LastUpdated) VALUES (?, ?, ?, ?, ?)';
    // 將圖片資料插入到 RDS 資料庫
    const currentDate = new Date();
    const fileName = path.basename(key);
    rdsConnection.query('select * from Images where image_name=? and project_id=?', [fileName,projectname], (err, data) => {
      if (err) {
          console.log(err)
      }
      if(data.length!=0)
      {
        console.log(data)
      }
      else
      {
      rdsConnection.query(query, [fileName, projectname, key, username, currentDate], (err, results) => {
        if (err) throw err;
        console.log(results.insertId)
      });
      }    
    });
    console.log('image upload success!');
  } catch (err) {
    console.error('Error getting image from S3:', err);
  }
}

async function checkS3FolderExists(folderPath, username, projectname) {
  try {
    const data = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: folderPath,
      Delimiter: '/',
    }));

    if (data.Contents.length > 0 || data.CommonPrefixes.length > 0) {
      console.log("Folder exists");

      // 如果有文件，處理每個文件
      for (const file of data.Contents) {
        if(!file.Key.endsWith('/')){
          console.log('Processing file:', file.Key);

          // 從 S3 讀取圖片並上傳到 RDS
          await uploadImageFromS3( file.Key, username, projectname);
        } 
      }
      return true;
    } else {
      console.log("Folder does not exist");
      return false;
    }
  } catch (err) {
    console.error("Error checking S3 folder:", err);
    return false;
  }
}

//* upload image to SQL
const uploads = multer({ storage: storage });
router.post("/upload", uploads.array("file"), (req, res) => {
  // //! prepare
  const username = req.query.username;
  const filename =  req.files[0].originalname;
  const projectname = req.query.projectname;
  const currentDate = new Date();
  console.log(currentDate);
  console.log(username, filename, projectname);
  //! insert image(buffer)
  const folderPath = `uploads/${username}/${projectname}/`; // 指定資料夾路徑
  if(checkS3FolderExists(folderPath,username,projectname)){
    res.json({ message: 'Image uploaded successfully!'});  
  }
  
});

//* download image from SQL
router.get("/download", async(req, res) => {
  const username = req.query.username;
  const projectname = req.query.projectname;

  console.log(username, projectname);

  const folderPath = `uploads/${username}/${projectname}/`; // 指定資料夾路徑

  const images = [];
  try {
    const data = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: folderPath,
      Delimiter: '/',
    }));

    if (data.Contents.length > 0 || data.CommonPrefixes.length > 0) {
      console.log("Folder exists");

      // 如果有文件，處理每個文件
      for (const file of data.Contents) {
        if(!file.Key.endsWith('/')){
          console.log('Processing file:', file.Key);
          //const imageName=path.basename(file.Key);
          images.push(file.Key);
        } 
      }
      console.log(images);
      res.json({ images: images } );
      return true;
    } else {
      console.log("Folder does not exist");
      return false;
    }
  } catch (err) {
    console.error("Error checking S3 folder:", err);
    return false;
  }

});


router.post("/deleteimg", async(req, res) => {
  const username = req.query.username;
  const projectname = req.query.projectname;
  const imageName = req.body.filename;
  console.log(username, projectname, imageName);
  
  const delsql = "delete from  Images where image_path = ?" ;
  rdsConnection.query(delsql, [imageName], (err, data) => {
    if (err) console.log("delete image error.");
    else console.log("delete image success.");
  });
  //const imagePath = `uploads/${username}/${projectname}/${imageName}`; // 指定資料夾路徑
  // 設定 DeleteObjectCommand 參數
  const deleteParams = {
    Bucket: bucketName,
    Key: imageName,  // 圖片路徑，包含圖片名稱
  };

  // 使用 DeleteObjectCommand 刪除指定路徑下的單一圖片
  s3Client.send(new DeleteObjectCommand(deleteParams))
    .then(data => {
      console.log("圖片刪除成功:", data);
      res.send("圖片已刪除!"); 
    })
    .catch(error => {
      console.error("Error deleting image in S3:", error);
      res.status(500).send("刪除圖片時發生錯誤"); 
  });


  // fs.unlink(imagePath, (err) => {
  //   if (err) {
  //     console.error(err);
  //     return res.status(500).send('刪除圖片失敗');
  //   }
  //   res.status(200).send('圖片刪除成功');
  // });
});

//TODO search under the user of files
let arr = [];
router.get("/checkdata", (req, res) => {
  try {
    arr = [];
    const username = req.query.username;
    const check = req.query.check;
    const user_path = path.join(__dirname, "../../uploads", username, check);
    console.log(username, user_path);
    if (fs.existsSync(user_path)) {
      console.log("folder exists");
      fs.readdirSync(user_path).forEach((file) => {
        console.log(file);
        arr.push(file);
      });
      console.log(arr);
    } else {
      console.log("no such folder");
      res.status(500).json("no such folder");
    }
    res.status(200).json(arr);
  } catch (error) {
    res.status(500).json(error.message);
  }
});

router.post("/requirement", (req, res) => {
  // //! prepare
  const username = req.query.username;
  const requirement_path = JSON.stringify(req.body.request);
  const projectname = req.query.projectname;
  const currentDate = new Date();
  console.log(currentDate);
  console.log(username, projectname);



  const s3path= `uploads/${username}/${projectname}/requirement/requirements.json`;
  // 設定 S3 上傳參數
  const params = {
    Bucket: bucketName,
    Key: s3path,
    Body: requirement_path,
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
    




  const insert = 'INSERT INTO Requirements (project_id, requirement_path, uploader, LastUpdated) VALUES (?, ?, ?, ?)';
  
  rdsConnection.query('select id from Projects where project_name=?', [projectname], (err, data) => {
    if (err) {
        console.log(err);
    }
    if(data.length>0)
    {
      const project_id=data[0].id;
      const currentDate = new Date();
      console.log(currentDate);
      
      console.log(requirement_path);
      //console.log(finalpath);
      const updatesql = "update Requirements set LastUpdated = ? where project_id = ?" ;
      rdsConnection.query('select * from Requirements where project_id=?', [project_id], (err, results) => {
        if (err) throw err;
        if(results.length>0)
        {
          rdsConnection.query(updatesql, [currentDate, project_id], (err, results) => {
            if (err) throw err;
            console.log("update Requirements success.");
          });
        }
        else
        {
          rdsConnection.query(insert, [project_id, s3path, username, currentDate], (err, results) => {
            if (err) throw err;
            console.log(results.insertId);
            console.log("insert Requirements success.");
          });
        }
      });    
    }
    else
    {
      console.log("project not found.");
    }
  })
  
  res.json({ message: 'requirement uploaded successfully!'});  

});


router.get("/getrequirement", async(req, res) => {
  const username = req.query.username;
  const projectname = req.query.projectname;

  console.log(username, projectname);
  let content = [];
  const startKeyword1 = '"Requirement1":{';
  const endKeyword1 = ',"Requirement2"';
  const startKeyword2 = '"Requirement2":{';
  const endKeyword2 = ',"ID"';

  const filepath= `uploads/${username}/${projectname}/requirement/requirements.json`;
  console.log(filepath);

  const s3Url = `https://instaiweb-bucket.s3.us-east-1.amazonaws.com/${filepath}`;
  

  try {
    const response = await axios.get(s3Url);
    
    if (response.status === 200) {
      const jsonData = response.data;
      console.log("JSON 檔案內容:", jsonData);
      const jsonString = JSON.stringify(jsonData);
      const startIndex = jsonString.indexOf(startKeyword1);

      if (startIndex !== -1) {
        const endIndex = jsonString.indexOf(endKeyword1, startIndex);

        if (endIndex !== -1) {
          const selectedContent = jsonString.slice(startIndex, endIndex);
          console.log('所需範圍的內容：', selectedContent);
          content.push(selectedContent);
        } else {
          console.log(`未找到 "${endKeyword1}"。`);
        }
      } else {
        console.log(`未找到 "${startKeyword1}"。`);
      }

      const startIndex2 = jsonString.indexOf(startKeyword2);

      if (startIndex2 !== -1) {
        const endIndex = jsonString.indexOf(endKeyword2, startIndex2);

        if (endIndex !== -1) {
          const selectedContent = jsonString.slice(startIndex2, endIndex);
          console.log('所需範圍的內容：', selectedContent);
          content.push(selectedContent);
        } else {
          console.log(`未找到 "${endKeyword2}"。`);
        }
      } else {
        console.log(`未找到 "${startKeyword2}"。`);
      }

      console.log(content);
      res.json({ content });
    } else {
      console.error("Failed to fetch JSON from S3. Status:", response.status);
    }
    
  } catch (error) {
    console.error("Error fetching JSON from S3:", error.message);
  }
  
});


module.exports = { router };
