/**
 * @file 用于扫描项数据库查询语句
 * 引用mysql模块通过config配置文件中配置连接sql
 * queryAll：查询扫描项全部数据、扫描策略列表数据，默认查询条件lang
 *   page为每页多少条数据
 *   curpage为当前页面
 *   limitStart/limitEnd为开始、结束位置
 *   sql为查询扫描项、扫描策略、扫描项与扫描策略关联、
 *   total为查询扫描策略统计
 *   scan为扫描项数据、policy为扫描策略数据、typepolicy为扫描项与扫描策略关联数据、total为统计数据
 * insertByOne: 写入扫描策略并写入扫描项与扫描策略贯标表
 *   id为扫描策略唯一标识
 *   name为扫描策略名称
 *   description为扫描策略描述
 *   scanList为扫描项数组
 *   parameter为扫描策略基础参数，每个扫描项参数一致
 *   sql为写入扫描策略、扫描项与扫描策略关联
 * deleteByOne: 删除扫描策略并删除扫描项与扫描策略关联数据
 *   id为扫描策略唯一标识
 *   sql为删除扫描项与扫描策略、扫描策略
 * editByOne: 编辑扫描策略并更新扫描项与扫描策略
 *   id为扫描策略唯一标识
 *   name为扫描策略名称
 *   description为扫描策略描述
 *   parameter为扫描策略基础参数
 *   scanList为扫描策略相关扫描项数组数据
 *   sql为删除扫描项和扫描策略关联、更新扫描策略数据、写入扫描项与扫描策略关联数据
 * runByOne: 修改扫描策略执行状态
 *   id为扫描策略唯一标识
 *   status为扫描策略执行状态
 *   sql为更新扫描策略状态
 *
 */

const connectSql = require('../middlewares/connectSql'); // 数据库连接中间件

module.exports = {
    queryAll(parameter) {
        return new Promise((resolve, reject) => {
            let policySql = 'SELECT id,name,description FROM c_scan_policy WHERE 1=1';
            let typepolicySql = 'SELECT c_scan_type_policy.scanpolicyid as tactics,'
                + ' c_scan_type_policy.scantypeid AS type, c_scan_type_policy.parameter,c_scan_type.cn As name '
                + 'FROM c_scan_type_policy INNER JOIN c_scan_type '
                + 'ON c_scan_type_policy.scantypeid=c_scan_type.id ORDER BY c_scan_type_policy.sortId;';
            let totalSql = 'SELECT count(1) AS total FROM c_scan_policy where 1=1';
            let taskSql = '; SELECT scanpolicyid,group_concat(scanpolicyid) FROM c_task where 1=1';
            if (parameter.enterpriseid !== 0) {
                policySql += ' AND enterpriseid=' + parameter.enterpriseid;
                totalSql += ' AND enterpriseid=' + parameter.enterpriseid;
                taskSql += ' AND enterpriseid=' + parameter.enterpriseid;
            }

            if (parameter.policyname) {
                policySql += ' AND c_scan_policy.name LIKE "%' + parameter.policyname + '%"';
                totalSql += ' AND c_scan_policy.name LIKE "%' + parameter.policyname + '%"';
            }
            policySql += ' ORDER BY c_scan_policy.create_time DESC LIMIT ' + parameter.limitStart + ','
                + parameter.limitEnd + ';';
            taskSql += ' GROUP BY scanpolicyid;';
            connectSql.returnResults(policySql + typepolicySql + totalSql + taskSql).then(res => { // 查询扫描策略
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryScanType() {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id,cn AS name FROM c_scan_category;'
                + 'SELECT id,cn AS name,category_id,parameter,dependence AS dependency FROM c_scan_type '
                + 'WHERE category_id!=6 AND enable=1;';
            connectSql.returnResults(sql).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryPolicyName(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id,name FROM c_scan_policy WHERE name="' + parameter.name + '"';
            connectSql.returnResults(sql).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryScanParameter(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id,name,description FROM c_scan_policy WHERE id=' + parameter.id + ';'
                + 'SELECT scantypeid AS id,parameter FROM c_scan_type_policy WHERE scanpolicyid=' + parameter.id
                + ' ORDER BY sortId';
            connectSql.returnResults(sql).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryEditVerify(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT * FROM c_task WHERE scanpolicyid=' + parameter.id;
            connectSql.returnResults(sql).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    insertByOne(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'INSERT INTO c_scan_policy(name,description,userid,enterpriseid) VALUES '
                + '("' + parameter.name + '","' + parameter.description + '",' + parameter.userid + ','
                + parameter.enterpriseid + ');';
            let id = '';
            connectSql.returnResults(sql).then(res => {
                id = res.insertId;
                let sql = 'INSERT INTO c_scan_type_policy(scanpolicyid,scantypeid,parameter,'
                    + 'userid,enterpriseid,sortId) VALUES ';
                parameter.scanList.forEach(value => {
                    sql += '(' + id + ', ' + value.id + ',\'' + value.parameter + '\',' + parameter.userid + ','
                        + parameter.enterpriseid + ',' + value.index + '),';
                });
                sql = sql.substring(0, sql.length - 1) + ';';
                return connectSql.returnResults(sql);
            }).then(res => {
                resolve({code: 200, scanpolicyid: id, msg: '创建成功'});
            }).catch(err => {
                if (id !== '') {
                    let sql = 'DELETE FROM c_scan_policy WHERE id=' + id;
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
    deleteByOne(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT * from c_task WHERE scanpolicyid=' + parameter.id;
            connectSql.returnResults(sql).then(res => {
                if (res.length > 0) {
                    resolve({code: 400, msg: '删除失败'});
                } else {
                    let sql = 'DELETE c_scan_policy, c_scan_type_policy FROM c_scan_policy, c_scan_type_policy '
                        + 'WHERE (c_scan_policy.id=c_scan_type_policy.scanpolicyid) AND '
                        + 'c_scan_policy.id=' + parameter.id + ';';
                    return connectSql.returnResults(sql);
                }
            }).then(res => {
                if (res === 'undefined') {
                    resolve({code: 400, msg: '删除失败'});
                } else {
                    resolve({code: 200, msg: '删除成功'});
                }
            }).catch(err => {
                reject(err);
            });
        });
    },
    editByOne(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'BEGIN; '
                + ' DELETE FROM c_scan_type_policy WHERE scanpolicyid = ' + parameter.id + ';'
                + ' UPDATE c_scan_policy SET name="' + parameter.name + '",description="' + parameter.description + '"'
                + ' WHERE c_scan_policy.id=' + parameter.id + ';'
                + ' INSERT INTO c_scan_type_policy(scanpolicyid,scantypeid,parameter,sortId) VALUES ';
            parameter.scanList.forEach(function (value) {
                sql += '(' + parameter.id + ', ' + value.id + ',\'' + value.parameter + '\',' + value.index + '),';
            });

            sql = sql.substring(0, sql.length - 1) + '; COMMIT;';
            connectSql.returnResults(sql).then(res => {
                resolve({code: 200, msg: '修改成功'});
            }).catch(err => {
                reject(err);
            });
        });
    }
};
