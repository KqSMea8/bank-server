/**
 * @file 用于fuzzing数据库查询语句
 *
 *
 */

const connectSql = require('../middlewares/connectSql'); //数据库连接中间件

module.exports = {
    userLogin(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT * FROM user WHERE username="' + parameter.name + '";';
            connectSql.returnResults(sql).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    }
};
