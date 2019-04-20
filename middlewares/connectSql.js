const mysql = require('mysql');
const config = require('../config/config');
const pool = mysql.createPool(config.mysql);
const dataBaseLog = require('./dataBaseLogOutput');

module.exports = {
    returnResults (sql) {
        return new Promise((resolve, reject) => {
            pool.getConnection(function (err, connection) {
                if (err) {
                    dataBaseLog.errLogger(err);
                    let results = {code: 400, msg: '连接数据库失败'};
                    reject(results);
                }
                connection.query(sql, function (err, results, fields) {
                    if (err) {
                        dataBaseLog.errLogger(err);
                        let results = {code: 400, msg: '操作失败'};
                        reject(results);
                    }
                    connection.release();
                    resolve(results);
                });
            });
        });
    }
};
