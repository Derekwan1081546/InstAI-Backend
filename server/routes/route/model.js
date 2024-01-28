const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const { pool, rdsConnection } = require("../../src/database.js");

router.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  console.log(req.method, req.url);
  next();
});
let arr = [];
router.get("/getmodel", (req, res) => {
  try {
    arr = [];
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

router.post("/downloadmodel", (req, res) => {
    const username = req.query.username;
    const projectname = req.query.projectname;
    const modelname = req.query.modelname;
    const versionnum =1;
    console.log(username, projectname);
    const modelpath = `uploads/${username}/${projectname}/requirements.json`; // 指定資料夾路徑
    const insert = 'INSERT INTO version (project_id, model_path, model_name, version_number, createtime) VALUES (?, ?, ?, ?, ?)';
    const check = 'select id from projects where project_name=?';
    rdsConnection.query(check, [projectname], (err, data) => {
        if (err) {
            console.log(err);
        }
        if(data.length>0){
            const project_id=data[0].id;
            const currentDate = new Date();
            console.log(currentDate);
            rdsConnection.query(insert, [project_id, modelpath, modelname, versionnum, currentDate], (err, results) => {
                if (err) throw err;
                console.log("insert version success.");
                return res.status(200).send("模型下載成功!");
            });
        }
        else
        {
            console.log("project not found.");
            return res.status(404).json({ error: "Project not found" });
        }
    });
  });


module.exports = { router };
