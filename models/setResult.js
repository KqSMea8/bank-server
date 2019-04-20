/**
 * @file 用于请求结果数据
 * use: 连接数据库中c_scan_deploy 扫描项配置表
 * point:
 *   queryConfig: 查询所有结果表配置
 */

const connectSql = require('../middlewares/connectSql'); // 数据库连接中间件

module.exports = {
    queryConfig(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id,dataTable,setHide AS hideField, setRelevancyField As relevancyShow,'
                + 'setChangeData AS hexField,setNewField AS newField FROM c_scan_deploy '
                + 'LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + '; '
                + 'SELECT count(1) AS total FROM c_scan_deploy;';
            connectSql.returnResults(sql).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryResultData(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'show columns from ' + parameter.dataTable;
            connectSql.returnResults(sql).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    insertConfigData(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'UPDATE c_scan_deploy SET setHide="' + parameter.hideField + '", '
                + 'setRelevancyField="' + parameter.relevancyShow + '",setChangeData="' + parameter.hexField + '",'
                + 'setNewField="' + parameter.newField + ' WHERE id=' + parameter.id;
            connectSql.returnResults(sql).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    }
};
