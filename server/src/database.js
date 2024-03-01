// const mysql = require("mysql2");
// require('dotenv').config(); //載入.env環境檔

// const rdsHost = process.env.AWS_RDS_HOST;
// const rdsUsername = process.env.AWS_RDS_USERNAME;
// const rdsPassword = process.env.AWS_RDS_PASSWORD;
// const rdsDBName = process.env.RDS_DATABASE;
// const rdsPORT = process.env.RDS_PORT
// // 連線到 RDS
// const rdsConnection = mysql.createConnection({
//   host: rdsHost,
//   user: rdsUsername,
//   password: rdsPassword,
//   database: rdsDBName,
//   port: rdsPORT
//   // authPlugins: {
//   //     auth_gssapi_client: require('mysql2/lib/auth_plugins/mysql_clear_password.js')
//   // }
// });

// rdsConnection.connect((err) => {
//   if (err) {
//     console.error(`無法連線到 RDS: ${err}`);
//     return;
//   }
//   console.log('成功連線到 RDS');
//   const login = "CREATE TABLE Users( id INT AUTO_INCREMENT PRIMARY KEY,  firstname VARCHAR(255),  lastname VARCHAR(255),  email VARCHAR(255),  password VARCHAR(255),  bucketname VARCHAR(255),  createtime VARCHAR(255))";
//   rdsConnection.query(login, null, (err, data) => {
//       if (!err)
//       console.log("login create success.");
//   });
//   const photos =
//   "CREATE TABLE Images" +
//   "(  id INT AUTO_INCREMENT PRIMARY KEY, image_name VARCHAR(255) NOT NULL, project_id VARCHAR(255) NOT NULL,image_path VARCHAR(255) NOT NULL, uploader VARCHAR(255) NOT NULL,  img_info JSON,  label_path VARCHAR(255),  img_type VARCHAR(255), LastUpdated VARCHAR(255) NOT NULL)";
//   rdsConnection.query(photos, null, (err, data) => {
//       if (!err)
//       console.log("photos create success.");
//   });
//   const projects =
//       "CREATE TABLE " +
//       "Projects" +
//       "(  id INT AUTO_INCREMENT PRIMARY KEY,  user_id VARCHAR(255) ,organization_id VARCHAR(255),project_name VARCHAR(255),  step VARCHAR(255))";
//   rdsConnection.query(projects, null, (err, data) => {
//       if (!err)
//       console.log("projects create success.");
//   });
//   const requirements =
//       "CREATE TABLE Requirements" +
//       "(  id INT AUTO_INCREMENT PRIMARY KEY,  project_id VARCHAR(255) NOT NULL, requirement_path VARCHAR(255) NOT NULL, uploader VARCHAR(255) NOT NULL, LastUpdated VARCHAR(255) NOT NULL, status VARCHAR(255) )";
//   rdsConnection.query(requirements, null, (err, data) => {
//       if (!err)
//           console.log("requirements create success.");
//   });
//   const version =
//       "CREATE TABLE Models" +
//       "(  id INT AUTO_INCREMENT PRIMARY KEY,  project_id VARCHAR(255) NOT NULL, model_path VARCHAR(255) , model_name VARCHAR(255) , performance_path VARCHAR(255) , version_number VARCHAR(255), createtime VARCHAR(255) )";
//   rdsConnection.query(version, null, (err, data) => {
//       if (!err)
//           console.log("version create success.");
//   });
// });

// module.exports = { rdsConnection };
const mysql = require("mysql2");
require('dotenv').config(); //載入.env環境檔

const pool = mysql.createPool({
  connectionLimit: 10, // 連線池中允許的最大連線數量
  host: process.env.AWS_RDS_HOST,
  user: process.env.AWS_RDS_USERNAME,
  password: process.env.AWS_RDS_PASSWORD,
  database: process.env.RDS_DATABASE,
  port: process.env.RDS_PORT
});

// 檢查並重新連線函數
function checkAndReconnect(connection) {
  if (!connection || !connection.threadId) {
    console.log('MySQL connection lost. Reconnecting...');
    pool.getConnection((err, newConnection) => {
      if (err) {
        console.error('Error reconnecting to MySQL: ' + err.message);
      } else {
        console.log('Reconnected to MySQL.');
        connection = newConnection;
      }
    });
  }
}

// 封裝連線函數
function getConnection(callback) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting MySQL connection: ' + err.message);
    }
    checkAndReconnect(connection); // 檢查並重新連線
    console.log('Connected to RDS successfully!');
    callback(err, connection);
  });
}

// 在啟動應用程序時創建資料表
function createTables() {
  const tables = [
    "CREATE TABLE IF NOT EXISTS Users( id INT AUTO_INCREMENT PRIMARY KEY,  firstname VARCHAR(255),  lastname VARCHAR(255),  email VARCHAR(255),  password VARCHAR(255),  bucketname VARCHAR(255),  createtime VARCHAR(255))",
    "CREATE TABLE IF NOT EXISTS Images( id INT AUTO_INCREMENT PRIMARY KEY, image_name VARCHAR(255) NOT NULL, project_id VARCHAR(255) NOT NULL,image_path VARCHAR(255) NOT NULL, uploader VARCHAR(255) NOT NULL,  img_info JSON,  label_path VARCHAR(255),  img_type VARCHAR(255), LastUpdated VARCHAR(255) NOT NULL)",
    "CREATE TABLE IF NOT EXISTS Projects( id INT AUTO_INCREMENT PRIMARY KEY,  user_id VARCHAR(255) ,organization_id VARCHAR(255),project_name VARCHAR(255),  step VARCHAR(255))",
    "CREATE TABLE IF NOT EXISTS Requirements( id INT AUTO_INCREMENT PRIMARY KEY,  project_id VARCHAR(255) NOT NULL, requirement_path VARCHAR(255) NOT NULL, uploader VARCHAR(255) NOT NULL, LastUpdated VARCHAR(255) NOT NULL, status VARCHAR(255) )",
    "CREATE TABLE IF NOT EXISTS Models( id INT AUTO_INCREMENT PRIMARY KEY,  project_id VARCHAR(255) NOT NULL, model_path VARCHAR(255) , model_name VARCHAR(255) , performance_path VARCHAR(255) , version_number VARCHAR(255), createtime VARCHAR(255) )"
  ];
  const Tables = [
    "Users",
    "Images",
    "Projects",
    "Requirements",
    "Models"
  ];
  getConnection((err, connection) => {
    if (err) {
      console.error('Error establishing MySQL connection: ' + err.message);
      return;
    }

    // tables.forEach(table => {
    //   connection.query(table, (err, result) => {
    //     if (err) {
    //       console.error('Error creating table: ' + err.message);
    //     } else {
    //       console.log('Table created successfully.');
    //     }
    //   });
    // });

    tables.forEach(table => {
        connection.query(table, (err, result) => {
          if (err) {
            console.error(`Error creating table ${Tables}: ${err.message}`);
          } else {
            if (result.warningStatus === 0) {
              console.log(`Table ${Tables} created successfully.`);
            }
          }
        });
    });

    connection.release(); // 釋放連線
  });
}

createTables(); // 創建資料表

module.exports = { rdsConnection: pool };
