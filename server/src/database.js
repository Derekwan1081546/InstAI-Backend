const mysql = require("mysql2");
require('dotenv').config(); //載入.env環境檔

const rdsHost = process.env.AWS_RDS_HOST;
const rdsUsername = process.env.AWS_RDS_USERNAME;
const rdsPassword = process.env.AWS_RDS_PASSWORD;
const rdsDBName = process.env.RDS_DATABASE;
const rdsPORT = process.env.RDS_PORT
// 連線到 RDS
const rdsConnection = mysql.createConnection({
  host: rdsHost,
  user: rdsUsername,
  password: rdsPassword,
  database: rdsDBName,
  port: rdsPORT
  // authPlugins: {
  //     auth_gssapi_client: require('mysql2/lib/auth_plugins/mysql_clear_password.js')
  // }
});

rdsConnection.connect((err) => {
  if (err) {
    console.error(`無法連線到 RDS: ${err}`);
    return;
  }
  console.log('成功連線到 RDS');
  const login = "CREATE TABLE login( id INT AUTO_INCREMENT PRIMARY KEY,  firstname VARCHAR(255),  lastname VARCHAR(255),  email VARCHAR(255),  password VARCHAR(255))";
  rdsConnection.query(login, null, (err, data) => {
      if (!err)
      console.log("login create success.");
  });
  const photos =
  "CREATE TABLE photos" +
  "(  id INT AUTO_INCREMENT PRIMARY KEY, image_name VARCHAR(255) NOT NULL, project_id VARCHAR(255) NOT NULL,image_path VARCHAR(255) NOT NULL, author VARCHAR(255) NOT NULL, LastUpdated VARCHAR(255) NOT NULL)";
  rdsConnection.query(photos, null, (err, data) => {
      if (!err)
      console.log("photos create success.");
  });
  const projects =
      "CREATE TABLE " +
      "projects" +
      "(  id INT AUTO_INCREMENT PRIMARY KEY,  user_id VARCHAR(255) ,organization_id VARCHAR(255),project_name VARCHAR(255),  step VARCHAR(255))";
  rdsConnection.query(projects, null, (err, data) => {
      if (!err)
      console.log("projects create success.");
  });
  const requirements =
      "CREATE TABLE requirements" +
      "(  id INT AUTO_INCREMENT PRIMARY KEY,  project_id VARCHAR(255) NOT NULL, requirement_path VARCHAR(255) NOT NULL, author VARCHAR(255) NOT NULL, LastUpdated VARCHAR(255) NOT NULL, status VARCHAR(255) )";
  rdsConnection.query(requirements, null, (err, data) => {
      if (!err)
          console.log("requirements create success.");
  });
  const version =
      "CREATE TABLE version" +
      "(  id INT AUTO_INCREMENT PRIMARY KEY,  project_id VARCHAR(255) NOT NULL, model_path VARCHAR(255) , model_name VARCHAR(255) , performance_path VARCHAR(255) , version_number VARCHAR(255), createtime VARCHAR(255) )";
  rdsConnection.query(version, null, (err, data) => {
      if (!err)
          console.log("version create success.");
  });
});

module.exports = { rdsConnection };
