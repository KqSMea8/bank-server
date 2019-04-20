/**
 * @file 用于扫描项数据库查询语句
 * 引用mysql模块通过config配置文件中配置连接sql
 * queryPrice：查询车型车厂
 * queryPriceType: 查询车型
 * queryCheckName: 查询车型车厂名称
 * createCar:创建车型车厂
 * editCar: 编辑车型车厂
 * deleteCar: 删除车型车厂
 */

const connectSql = require('../middlewares/connectSql'); // 数据库连接中间件

module.exports = {
    queryPrice(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id,name,description FROM c_car_price';
            let carTypeSql = 'SELECT c_car_type.id,c_car_type.carpriceid,c_car_type.name,c_car_type.description,'
                + 'c_car_price.name AS pricename FROM c_car_type INNER JOIN c_car_price '
                + 'ON c_car_price.id = c_car_type.carpriceid';
            let totalSql = ';SELECT count(1) AS total FROM c_car_price ';
            if (parameter.enterpriseid !== 0) {
                sql += ' WHERE enterpriseid=' + parameter.enterpriseid;
                carTypeSql += ' WHERE c_car_type.enterpriseid=' + parameter.enterpriseid;
                totalSql += ' WHERE enterpriseid=' + parameter.enterpriseid;
            }
            sql += ' ORDER BY create_time DESC LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';';

            connectSql.returnResults(sql + carTypeSql + totalSql).then(res => { // 查询
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryPriceType(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id,name FROM c_car_type WHERE carpriceid=' + parameter.priceTypeid + ';';
            connectSql.returnResults(sql).then(res => { // 查询日志
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryCheckName(parameter) {
        return new Promise((resolve, reject) => {
            let sql = '';
            if (parameter.type === 'price') {
                sql = 'SELECT id,name FROM c_car_price WHERE name="' + parameter.name + '";';
            } else {
                sql = 'SELECT id,name FROM c_car_type WHERE name="' + parameter.name + '" AND carpriceid='
                    + parameter.carpriceid + ';';
            }
            connectSql.returnResults(sql).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    createCar(parameter) {
        return new Promise((resolve, reject) => {
            let sql = '';
            if (parameter.type === 'price') {
                sql = 'INSERT c_car_price(name,description,userid,enterpriseid) VALUE '
                    + '("' + parameter.name + '","' + parameter.description + '",' + parameter.userid + ','
                    + parameter.enterpriseid + ');';
            } else {
                sql = 'INSERT c_car_type(name,carpriceid,description,userid,enterpriseid) VALUE'
                    + '("' + parameter.name + '",' + parameter.carpriceid + ',"' + parameter.description + '",'
                    + parameter.userid + ',' + parameter.enterpriseid + ');';
            }
            connectSql.returnResults(sql).then(res => { // 查询日志
                let id = res.insertId;
                resolve({code: 200, msg: '创建成功', id: id});
            }).catch(err => {
                reject(err);
            });
        });
    },
    editCar(parameter) {
        return new Promise((resolve, reject) => {
            let sql = '';
            if (parameter.type === 'price') {
                sql = 'UPDATE c_car_price SET name="' + parameter.name + '",description="' + parameter.description + '"'
                    + ' WHERE id=' + parameter.id + ';';
            } else {
                sql = 'UPDATE c_car_type SET name="' + parameter.name + '",description="' + parameter.description + '"'
                    + ' WHERE id=' + parameter.id + ';';
            }
            connectSql.returnResults(sql).then(res => { // 查询日志
                resolve({code: 200, msg: '修改成功'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    deleteCar(parameter) {
        return new Promise((resolve, reject) => {
            let sql = '';
            if (parameter.type === 'price') {
                sql = 'SELECT * FROM c_car_type WHERE c_car_type.carpriceid = ' + parameter.id;
            } else {
                sql = 'DELETE c_car_type FROM c_car_type WHERE c_car_type.id=' + parameter.id;
            }
            connectSql.returnResults(sql).then(res => { // 查询日志
                let data = res;
                if (parameter.type === 'price') {
                    if (data.length === 0) {
                        sql = 'DELETE FROM c_car_price WHERE id=' + parameter.id;
                    }
                    if (data.length !== 0) {
                        sql = 'DELETE c_car_price, c_car_type FROM c_car_price,c_car_type '
                            + 'WHERE (c_car_price.id = c_car_type.carpriceid) AND c_car_price.id = ' + parameter.id;
                    }
                    return connectSql.returnResults(sql);
                } else {
                    resolve(res);
                }
            }).then(res => {
                resolve({code: 200, msg: '删除成功'});
            }).catch(err => {
                reject(err);
            });
        });
    }
};
