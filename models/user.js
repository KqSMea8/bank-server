/**
 * @file 用于扫描项数据库查询语句
 * 引用connectSql模块配置连接sql
 * queryUser：查询用户
 * queryUserName: 查询用户名称
 * insertUser: 创建用户
 * updateUser: 编辑用户
 * deleteUser: 删除用户
 * queryPrise: 查询车企
 * queryPriseName: 查询车企名称
 * queryPriseUserName: 查询车企用户名称
 * insertPrise: 创建车企
 * updatePrise: 编辑车企
 * deletePrise: 删除车企
 */

const connectSql = require('../middlewares/connectSql'); // 数据库连接中间件

module.exports = {
    queryUser(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT user.id,user.username AS name,user.description,'
                + 'user.enterpriseid,user.email,user.phone,'
                + 'user.description,c_enterprise.name AS prisename FROM user INNER JOIN c_enterprise '
                + 'ON user.enterpriseid = c_enterprise.id WHERE 1=1';
            let total = 'SELECT COUNT(1) AS total FROM user WHERE roleid!=1';
            if (parameter.enterpriseid !== 0) {
                sql += ' AND user.roleid!=2 AND enterpriseid=' + parameter.enterpriseid;
                total += ' AND roleid!=2 AND enterpriseid=' + parameter.enterpriseid;
            }
            sql += ' LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';';
            connectSql.returnResults(sql + total).then(res => { // 查询用户
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryUserName(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT * FROM user WHERE username="' + parameter.name + '"';
            connectSql.returnResults(sql).then(res => { // 查询用户名称
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    insertUser(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'INSERT user(username,enterpriseid,password,email,phone,description) VALUE '
                + '("' + parameter.name + '",' + parameter.enterpriseid + ',"' + parameter.password + '",'
                + '"' + parameter.email + '","' + parameter.phone + '","' + parameter.description + '")';
            connectSql.returnResults(sql).then(res => { // 写入用户数据
                resolve({code: 200, msg: '创建成功'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    updateUser(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'UPDATE user SET username="' + parameter.name + '",'
                + 'email="' + parameter.email + '",phone="' + parameter.phone + '",'
                + 'description="' + parameter.description + '" WHERE id=' + parameter.id + ';';
            connectSql.returnResults(sql).then(res => { // 更新用户信息
                resolve({code: 200, msg: '修改成功'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    checkPassword(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT password FROM user WHERE id=' + parameter.userId;
            connectSql.returnResults(sql).then(res => { // 检测用户密码是否一直
                let pwd = res[0].password;
                if (pwd !== parameter.oldPwd) {
                    resolve({code: 400, msg: '初始密码输入有误'});
                } else {
                    resolve({code: 200, msg: '初始密码不对'});
                }
            }).catch(err => {
                reject(err);
            });
        });
    },
    updatePassword(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'UPDATE user SET password=\'' + parameter.newPwd + '\' WHERE id=' + parameter.userId;
            connectSql.returnResults(sql).then(res => { // 更新用户密码
                resolve({code: 200, msg: '修改成功'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    deleteUser(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'DELETE user FROM user WHERE id=' + parameter.id;
            connectSql.returnResults(sql).then(res => { // 删除用户
                resolve({code: 200, msg: '删除成功'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryPrise(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT c_enterprise.id,c_enterprise.name,c_enterprise.email,c_enterprise.phone,'
                + 'c_enterprise.mobile,c_enterprise.address,user.username,user.description'
                + ' FROM c_enterprise inner join user on user.enterpriseid = c_enterprise.id AND user.roleid=2';
            if (parameter.enterpriseid !== 0) {
                sql += ' WHERE c_enterprise.id=' + parameter.enterpriseid;
            } else {
                sql += ' LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd;
                sql += ';SELECT COUNT(1) AS total FROM c_enterprise;';
            }
            connectSql.returnResults(sql).then(res => { // 查询车企
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryPriseName(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT * FROM c_enterprise WHERE name="' + parameter.name + '"';
            connectSql.returnResults(sql).then(res => { // 查询车企名称
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryPriseUserName(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT * FROM user WHERE username="' + parameter.username + '"';
            if (parameter.id !== undefined && parameter.id !== '') {
                sql += ' AND enterpriseid=' + parameter.id;
            }
            connectSql.returnResults(sql).then(res => { // 查询车企用户名称
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    insertPrise(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'INSERT c_enterprise(name,email,phone,mobile,address) VALUE '
                + '("' + parameter.name + '","' + parameter.email + '","' + parameter.phone + '","' + parameter.mobile + '",'
                + '"' + parameter.address + '");';
            let enterpriseid = '';
            connectSql.returnResults(sql).then(res => { // 写入车企用户
                enterpriseid = res.insertId;
                let sql = 'INSERT user(username,roleid,enterpriseid,password,email,phone,description) VALUE '
                    + '("' + parameter.username + '",2,' + enterpriseid + ',"' + parameter.password + '",'
                    + '"' + parameter.email + '","' + parameter.phone + '","' + parameter.description + '");';
                return connectSql.returnResults(sql);
            }).then(res => {
                resolve({code: 200, msg: '创建成功'});
            }).catch(err => {
                if (enterpriseid !== '') {
                    let sql = 'DELETE FROM c_enterprise WHERE id=' + enterpriseid;
                    return connectSql.returnResults(sql);
                } else {
                    reject(err);
                }
            }).then(res => {
                resolve({code: 400, msg: '创建失败'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    updatePrise(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'UPDATE c_enterprise inner join user on user.enterpriseid = '
                + 'c_enterprise.id SET c_enterprise.name="'
                + parameter.prisename + '",user.username="' + parameter.username + '",'
                + 'c_enterprise.email="' + parameter.email + '",c_enterprise.phone="'
                + parameter.phone + '",' + 'c_enterprise.mobile="' + parameter.mobile + '",c_enterprise.address="'
                + parameter.address + '",user.description="' + parameter.description
                + '" WHERE c_enterprise.id=' + parameter.id;
            connectSql.returnResults(sql).then(res => { // 更新车企用户
                resolve({code: 200, msg: '修改成功'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    deletePrise(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT * FROM user WHERE enterpriseid=' + parameter.id;
            connectSql.returnResults(sql).then(res => { // 更新车企用户
                let sql = '';
                if (res.length === 0) {
                    sql = 'DELETE c_enterprise FROM c_enterprise WHERE c_enterprise.id=' + parameter.id;
                } else {
                    sql = 'DELETE c_enterprise,user FROM c_enterprise,user '
                        + 'WHERE (c_enterprise.id=user.enterpriseid) AND c_enterprise.id=' + parameter.id;
                }
                return connectSql.returnResults(sql);
            }).then(res => {
                resolve({code: 200, msg: '删除成功'});
            }).catch(err => {
                reject(err);
            });
        });
    }
};
