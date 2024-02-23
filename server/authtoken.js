
// 中間件函數，用於驗證用戶
// function ensuretoken(req, res, next) {
//     const bearerheader = req.headers["Authorization"];
//     if(typeof bearerheader !== 'undefined'){

//         req.token = bearerheader;
//         next();
//     }
//     else {
//         res.sendStatus(403);

//     }


//     // // 檢查 session 是否存在以及 user 屬性是否存在
//     // if (req.session && req.session.user) {
//     //     // 檢查 user 屬性中是否包含有效的 id 屬性
//     //     if (req.session.user.id) {
//     //         next(); // 用戶已經登錄，繼續執行下一個中間件
//     //     } else {
//     //         // user 屬性中缺少 id 屬性，返回 401 錯誤
//     //         return res.status(401).json({ message: '用戶信息無效，請重新登錄' });
//     //     }
//     // } else {
//     //     // session 或 user 屬性不存在，返回 401 錯誤
//     //     return res.status(401).json({ message: '未登錄，請先登錄' });
//     // }
// }
function ensuretoken(req, res, next) {
  const bearerheader = req.headers["authorization"];
  if(typeof bearerheader !== 'undefined'){
      console.log(bearerheader);
      req.token = bearerheader;
      next();
  }
  else {
      res.sendStatus(403);

  }

}

module.exports = ensuretoken;
