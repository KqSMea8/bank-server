/**
 * @file 用于fuzzing数据库查询语句
 *
 *
 */

const connectSql = require('../middlewares/connectSql'); // 数据库连接中间件

module.exports = {
    queryPrice(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id,name FROM c_car_price';
            if (parameter.enterpriseid !== 0) {
                sql += ' WHERE enterpriseid=' + parameter.enterpriseid;
            }
            connectSql.returnResults(sql).then(res => { // 查询车企
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryModel(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id,carpriceid,name FROM c_car_type WHERE carpriceid=' + parameter.carpriceid + ';';
            connectSql.returnResults(sql).then(res => { // 查询车型
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryTask(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id,name,DATE_FORMAT(update_time,"%Y-%m-%d %H:%i:%s") AS taskTime '
                + 'FROM c_task WHERE status=1 AND diff=0';

            if (parameter.enterpriseid !== 0) {
                sql += ' AND enterpriseid=' + parameter.enterpriseid;
            }

            if (parameter.carpriceid !== '') {
                sql += ' AND carpriceid = ' + parameter.carpriceid;
            }
            if (parameter.cartypeid !== '') {
                sql += ' AND carmodelid = ' + parameter.cartypeid;
            }
            if (parameter.timeRange !== '') {
                if (parameter.timeRange === 'week') {
                    sql += ' AND DATE_SUB(CURDATE(), INTERVAL 1 WEEK) <= c_task.create_time';
                }

                if (parameter.timeRange === 'month') {
                    sql += ' AND DATE_SUB(CURDATE(), INTERVAL 1 MONTH) <= c_task.create_time';
                }

                if (parameter.timeRange === 'year') {
                    sql += ' AND DATE_SUB(CURDATE(), INTERVAL 1 YEAR) <= c_task.create_time';
                }
            }
            sql += ' ORDER BY update_time';
            connectSql.returnResults(sql).then(res => { // 查询车型
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryTaskScanType(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT c_scan_type_task.scantypeid as id,c_scan_type.cn as name,c_scan_type.description,'
                + 'c_scan_type_task.logname,c_task.name AS taskname '
                + 'FROM (c_scan_type_task inner join c_scan_type on  c_scan_type_task.scantypeid = c_scan_type.id) '
                + 'inner join c_task on c_scan_type_task.taskid = c_task.id  WHERE '
                + 'c_scan_type.category_id != 6 AND taskid = ' + parameter.id;

            if (parameter.sort) {
                sql += 'ORDER BY c_scan_type_task.logname DESC';
            }
            connectSql.returnResults(sql).then(res => { // 查询车型
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryTaskRunScan(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id FROM c_scan_type WHERE type=\'' + parameter.type + '\';';
            let data = {};
            connectSql.returnResults(sql).then(res => { // 查询任务
                let scantypeid = res[0].id;
                let sql = 'SELECT taskid,parameter,logname,status FROM c_scan_type_task WHERE '
                    + 'status IN (0,1) AND scantypeid=' + scantypeid + ' AND enterpriseid=' + parameter.enterpriseid
                    + ' ORDER BY update_time DESC LIMIT 0,1';
                return connectSql.returnResults(sql);
            }).then(res => {
                data.scan = res[0];
                if (data.scan !== '' && data.scan !== undefined) {
                    let taskid = null;
                    if (parameter.type === 'can_replay') {
                        taskid = JSON.parse(data.scan.parameter).taskid;
                    } else {
                        taskid = data.scan.taskid;
                    }

                    let sql = 'SELECT name,DATE_FORMAT(update_time,"%Y-%m-%d %H:%i:%s") AS taskTime'
                        + ' FROM c_task WHERE id=' + taskid + ';'
                        + 'SELECT c_scan_type.cn as name, c_scan_type.description,c_scan_type_task.logname,'
                        + 'c_scan_type_task.scantypeid as id FROM c_scan_type_task INNER JOIN c_scan_type ON '
                        + 'c_scan_type.id = c_scan_type_task.scantypeid '
                        + 'WHERE c_scan_type.category_id !=6 AND c_scan_type_task.taskid =' + taskid
                        + ' ORDER BY sortId';
                    return connectSql.returnResults(sql);
                } else {
                    resolve({code: 400, msg: '没有数据'});
                }
            }).then(res => {
                if (data.scan !== '' && data.scan !== undefined) {
                    data.task = res[0][0];
                    data.scanList = res[1];
                    resolve(data);
                }
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryPacket(parameter) {
        return new Promise((resolve, reject) => {
                let sql = 'SELECT id,canid,timedelay,data FROM c_custom_packet_injection';
            let totalSql = 'SELECT COUNT(1) AS total FROM c_custom_packet_injection';

            if (parameter.enterpriseid !== 0) {
                sql += ' WHERE enterpriseid=' + parameter.enterpriseid;
                totalSql += ' WHERE enterpriseid=' + parameter.enterpriseid;
            }

            sql += ' ORDER BY create_time DESC LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';';
            connectSql.returnResults(sql + totalSql).then(res => { // 查询车型
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryHasRunning() {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT status FROM c_task WHERE status IN (0,-1);';
            let isHasRunning = null;
            connectSql.returnResults(sql).then(res => { // 查询车型
                isHasRunning = res;
                if (isHasRunning.length !== 0) {
                    resolve({code: 400, isHasRunning: true, msg: '当前有其他任务正在执行'});
                } else {
                    resolve({code: 200, isHasRunning: false, msg: '可以创建自定义测试'});
                }
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryCountPacket() {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT count(1) AS total FROM c_custom_packet_injection;';
            connectSql.returnResults(sql).then(res => { // 查询包注入数据统计
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    insertPacketData(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'INSERT c_custom_packet_injection(canid,timedelay,data,userid,enterpriseid) '
                + 'VALUE ("' + parameter.canid + '",' + parameter.timeDelay + ',"' + parameter.data + '",'
                + parameter.userid + ',' + parameter.enterpriseid + ')';
            connectSql.returnResults(sql).then(res => { // 查询车型
                resolve({code: 200, msg: '创建成功'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    deletePacketData(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'DELETE FROM c_custom_packet_injection WHERE id=' + parameter.id;
            connectSql.returnResults(sql).then(res => { // 删除包注入数据
                resolve({code: 200, msg: '删除成功'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    insertScanTypeTask(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id FROM c_scan_type WHERE type="' + parameter.type + '";';
            let scantypeid = '';
            let id = null;
            connectSql.returnResults(sql).then(res => { // 查询车型
                scantypeid = res[0].id;
                let name = scantypeid + '_' + new Date().getTime();
                let para = '{"timeout":25,"blacklist":10,"retry":3}';
                if (parameter.type === 'can_replay') {
                    para = '{"timeout":25,"blacklist":10,"retry":0}';
                }
                let status = -1;
                let diff = 1;
                let sql = 'INSERT c_task(name,parameter,status,diff,userid,enterpriseid) VALUE (\''
                    + name + '\',\'' + para + '\',' + status + ','
                    + diff + ',' + parameter.userid + ',' + parameter.enterpriseid + ')';
                return connectSql.returnResults(sql);

            }).then(res => {
                id = res.insertId;
                let sql = 'INSERT c_scan_type_task(taskid,scantypeid,parameter,userid,enterpriseid) VALUE '
                    + '(' + id + ',' + scantypeid + ',\'' + parameter.parameter
                    + '\',' + parameter.userid + ',' + parameter.enterpriseid + ')';
                return connectSql.returnResults(sql);

            }).then(res => {
                resolve({code: 200, msg: '创建成功', taskid: id});
            }).catch(err => {
                reject(err);
            });
        });
    },
    insertCkey(parameter) { // 注入时间戳md5
        return new Promise((resolve, reject) => {
            let sql = 'SElECT * FROM c_scan_type_task WHERE status=0';
            let data = null;
            connectSql.returnResults(sql).then(res => {
                data = res;
                if (data.length === 0) {
                    resolve({code: 400, msg: '没有正在执行的扫描项'});
                } else {
                    let sql = 'INSERT c_custom_comment (username,taskid,scantypeid,progress,'
                        + 'logname,ckey,enterpriseid) VALUES (\'' + parameter.username + '\','
                        + data[0].taskid + ',' + data[0].scantypeid + ',' + data[0].progress + ',\''
                        + data[0].logname + '\',\'' + parameter.ckey + '\',' + parameter.enterpriseid + ')';
                    return connectSql.returnResults(sql);
                }
            }).then(res => {
                if (data.length !== 0) {
                    resolve({code: 200, msg: '标注成功', commentId: res.insertId});
                }
            }).catch(err => {
                reject(err);
            });
        });
    },
    insertComment(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'UPDATE c_custom_comment set comment=\'' + parameter.comment
                + '\' WHERE id=' + parameter.commentId;
            connectSql.returnResults(sql).then(res => { // 包注入数据
                resolve({code: 200, msg: '标注成功'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    stopCustom() {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id FROM c_task WHERE status=0';
            let isHasRunning = null;
            connectSql.returnResults(sql).then(res => {
                isHasRunning = res;
                if (res.length !== 0) {
                    let id = isHasRunning[0].id;
                    let sql = 'UPDATE c_task,c_scan_type_task set c_scan_type_task.killflag=1 '
                        + 'WHERE c_task.id=c_scan_type_task.taskid AND c_task.id=' + id;
                    return connectSql.returnResults(sql);
                } else {
                    resolve({code: 400, msg: '没有正在执行的任务！'});
                }

            }).then(res => {
                if (isHasRunning.length !== 0) {
                    resolve({code: 200, msg: '成功停止'});
                }
            }).catch(err => {
                reject(err);
            });
        });
    }
};
