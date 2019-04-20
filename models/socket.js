/**
 * @file 用于扫描项数据库查询语句
 * 引用mysql模块通过config配置文件中配置连接sql
 * queryTask：查询当前执行任务的实时进度
 * queryByOne：查询整个扫描策略、扫描项与扫描策略关联
 *   sql为查询扫描策略、扫描项与扫描策略关联数据
 * updateByOne:更新扫描项下参数
 *   sql为扫描项与扫描策略关联表
 */

const connectSql = require('../middlewares/connectSql'); // 数据库连接中间件

module.exports = {
    queryTask() {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT progress FROM c_task WHERE status=0;';
            connectSql.returnResults(sql).then(res => { // 查询车企
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryByOne(socket, data) {
        return new Promise((resolve, reject) => {
            let taskid = data.taskid;
            let sql = 'SELECT name FROM c_task WHERE id=' + taskid + ';';
            connectSql.returnResults(sql).then(res => { // 查询车企
                res[1].forEach((item, index) => {
                    item.index = index + 1;
                });

                let result = {
                    name: res[0][0].name,
                    scanList: res[1]
                };
                resolve(result);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryScanning(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id FROM c_scan_type WHERE type="' + parameter.type + '";'
                + 'SELECT id,status FROM c_task WHERE status IN (0,-1);';
            let isRunning = null;
            connectSql.returnResults(sql).then(res => {
                let id = res[0][0].id;
                isRunning = res[1];
                let sql = 'SELECT taskid FROM c_scan_type_task WHERE status=0 AND scantypeid=' + id;
                return connectSql.returnResults(sql);
            }).then(res => {
                let customTask = res;
                if (customTask.length === 0) {
                    resolve({code: 400, msg: '当前还有其他任务执行'});
                } else if (isRunning[0].id === customTask[0].taskid) {
                    resolve(res);
                } else {
                    resolve({code: 400, msg: '当前还有其他任务执行'});
                }
            }).catch(err => {
                reject(err);
            });
        });
    },
    stopScanning() {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id FROM c_task WHERE status=0';
            connectSql.returnResults(sql).then(res => {
                let id = res[0].id;
                let sql = 'UPDATE c_task,c_scan_type_task set c_task.status=1, '
                    + 'c_scan_type_task.status=1 WHERE c_task.id=c_scan_type_task.taskid AND c_task.id=' + id;
                return connectSql.returnResults(sql)
            }).then(res => {
                resolve({code: 200, msg: '成功停止'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    // stopScanning(parameter) {
    //     return new Promise((resolve, reject) => {
    //         let sql = 'SELECT id FROM c_scan_type WHERE type="' + parameter.type + '"';
    //         connectSql.returnResults(sql).then(res => {
    //             let id = res[0].id;
    //             let sql = 'SELECT id FROM c_scan_type_task WHERE scantypeid=' + id + ' AND status=0';
    //             return connectSql.returnResults(sql);
    //         }).then(res => {
    //             if (res.length !== 0) {
    //                 let id = res[0].id;
    //                 let sql = 'UPDATE c_scan_type_task set status=1 WHERE id=' + id;
    //                 return connectSql.returnResults(sql);
    //             } else {
    //                 resolve({code: 400, msg: '还没开始'});
    //             }
    //         }).then(res => {
    //             resolve({code: 200, msg: '成功停止'});
    //         }).catch(err => {
    //             reject(err);
    //         });
    //     });
    // },
    queryLogReplay() {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id FROM c_scan_type_task WHERE scantypeid=37 AND status=0';
            connectSql.returnResults(sql).then(res => {
                if (res.length === 0) {
                    resolve({code: 400, msg: '还没开始了'});
                } else {
                    resolve(res);
                }
            }).catch(err => {
                reject(err);
            });
        });
    },
    stopLogReplay(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id FROM c_task WHERE status=0';
            connectSql.returnResults(sql).then(res => {
                let id = res[0].id;
                let sql = 'UPDATE c_task,c_scan_type_task set c_task.status=1, '
                    + 'c_scan_type_task.status=1 WHERE c_task.id=c_scan_type_task.taskid AND c_task.id=' + id;
                return connectSql.returnResults(sql)
            }).then(res => {
                resolve({code: 200, msg: '成功停止'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    insertDetection(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'INSERT c_custom_detection(comment) VALUE("' + parameter.note + '")';
            connectSql.returnResults(sql).then(res => {
                resolve({code: 200, msg: '写入成功'});
            }).catch(err => {
                reject(err);
            });
        });
    }
};
