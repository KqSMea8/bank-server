/**
 * @file 用于扫描项数据库查询语句
 * 引用mysql模块通过config配置文件中配置连接sql
 * queryAll：查询所有任务
 *   sql为查询扫描策略、扫描项与扫描策略关联数据
 * queryAllTactics: 查询所有扫描策略
 *   sql为扫描项与扫描策略关联表
 * insertByOne: 创建任务
 * queryTaskName: 查询任务名称
 * deleteByOne: 删除任务
 * editByOne: 编辑任务
 * setTask: 编辑任务状态
 * queryChangeData: 查询任务详情
 * editTaskScan: 编辑任务下扫描项
 * editTaskSort: 编辑任务排序
 *
 */

const connectSql = require('../middlewares/connectSql'); // 数据库连接中间件

module.exports = {
    queryAll(parameter) {
        return new Promise((resolve, reject) => {
            let taskSql = 'SELECT c_task.id AS taskid,c_task.scanpolicyid, c_task.name AS taskname,c_task.parameter,'
                + 'c_task.description,c_task.progress,c_task.status,c_task.queueid,c_task.carmodelid,c_task.carpriceid,'
                + 'c_task.policyname FROM c_task WHERE (status!=1) AND diff=0';
            let totalSql = 'SELECT count(1) AS total FROM c_task WHERE (status!=1) AND diff=0';
            let tactics = ';SELECT id,name FROM c_scan_policy ';
            let carType = ';SELECT * FROM c_car_type';
            let scanSql = ';SELECT c_scan_type_task.taskid,c_scan_type_task.scantypeid, c_scan_type.cn AS name'
                + ' FROM c_scan_type_task INNER JOIN c_scan_type ON c_scan_type_task.scantypeid= c_scan_type.id'
                + ' ORDER BY c_scan_type_task.sortId;';
            if (parameter.enterpriseid !== 0) {
                taskSql += ' AND c_task.enterpriseid=' + parameter.enterpriseid;
                totalSql += ' AND c_task.enterpriseid=' + parameter.enterpriseid;
                tactics += ' WHERE enterpriseid=' + parameter.enterpriseid;
                carType += ' WHERE enterpriseid=' + parameter.enterpriseid;
            }
            if (parameter.taskname) {
                taskSql += ' AND c_task.name LIKE "%' + parameter.taskname + '%"';
                totalSql += ' AND c_task.name LIKE "%' + parameter.taskname + '%"';
            }

            taskSql += ' ORDER BY FIELD(c_task.status,0) DESC,FIELD(c_task.status,-1) DESC,'
                + 'c_task.queueid ASC,c_task.create_time DESC LIMIT ' + parameter.limitStart
                + ',' + parameter.limitEnd + ';';
            connectSql.returnResults(taskSql + totalSql + tactics + carType + scanSql).then(res => { // 查询任务
                let data = {
                    taskList: res[0],
                    totalSql: res[1],
                    tactics: res[2],
                    carType: res[3],
                    scanList: res[4]
                };
                resolve(data);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryAllTactics(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id,name FROM c_scan_policy WHERE enterpriseid=' + parameter.enterpriseid;
            connectSql.returnResults(sql).then(res => { // 查询扫描策略
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    insertByOne(parameter) {
        return new Promise((resolve, reject) => {
            let id = '';
            let sql = 'INSERT c_task (name,scanpolicyid,parameter,description,carmodelid,carpriceid,userid,'
                + 'enterpriseid,policyname,policydescription,policyuserid) VALUES'
                + '("' + parameter.name + '",' + parameter.scanpolicyid + ',\'' + parameter.parameter + '\',"'
                + parameter.description + '",' + parameter.carmodelid + ',' + parameter.carpriceid + ','
                + parameter.userid + ',' + parameter.enterpriseid + ','
                + '(select name as policyname from c_scan_policy where id=' + parameter.scanpolicyid + '),'
                + '(select description as policydescription from c_scan_policy where id='
                + parameter.scanpolicyid + '),'
                + '(select userid as policyuserid from c_scan_policy where id=' + parameter.scanpolicyid + '));';

            connectSql.returnResults(sql).then(res => {
                id = res.insertId;
                let sql = 'INSERT INTO c_scan_type_task (taskid,userid,enterpriseid,scantypeid,parameter,sortId)'
                    + 'SELECT ' + id + ' AS taskid,' + parameter.userid + ' AS userid,' + parameter.enterpriseid + ','
                    + 'c_scan_type_policy.scantypeid, c_scan_type_policy.parameter,'
                    + 'c_scan_type_policy.sortId FROM c_scan_type_policy '
                    + 'WHERE scanpolicyid=' + parameter.scanpolicyid + ';';
                return connectSql.returnResults(sql);
            }).then(res => {
                resolve({code: 200, msg: '创建成功'});
            }).catch(err => {
                if (id !== '') {
                    let sql = 'DELETE FROM c_task WHERE id=' + id;
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
    queryTaskName(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id,name FROM c_task WHERE name="' + parameter.name + '"';
            connectSql.returnResults(sql).then(res => { // 查询任务名称是否已存在
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    deleteByOne(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT queueid FROM c_task WHERE id=' + parameter.id;
            let deleteQueueId = null;
            connectSql.returnResults(sql).then(res => { // 删除任务
                deleteQueueId = res[0].queueid;
                let sql = 'DELETE c_task,c_scan_type_task FROM c_task LEFT JOIN c_scan_type_task ON '
                    + 'c_task.id = c_scan_type_task.taskid WHERE c_task.status!=0 AND c_task.id=' + parameter.id;
                return connectSql.returnResults(sql);
            }).then(res => {
                if (deleteQueueId !== 0) {
                    let sql = 'UPDATE c_task SET queueid=queueid-1 WHERE queueid>' + deleteQueueId;
                    return connectSql.returnResults(sql);
                }
            }).then(res => {
                resolve({code: 200, msg: '删除成功'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    editByOne(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'BEGIN;';
            sql += 'UPDATE c_task SET name="' + parameter.name + '",scanpolicyid=' + parameter.scanpolicyid + ','
                + 'description="' + parameter.description + '",parameter=\'' + parameter.parameter + '\' '
                + 'WHERE id=' + parameter.id + ';';
            sql += 'DELETE FROM c_scan_type_task WHERE taskid=' + parameter.id + ';';
            sql += 'INSERT INTO c_scan_type_task (taskid,scantypeid,parameter,sortId)'
                + 'SELECT ' + parameter.id + ' AS taskid,c_scan_type_policy.scantypeid, '
                + 'c_scan_type_policy.parameter,c_scan_type_policy.sortId FROM c_scan_type_policy '
                + 'WHERE scanpolicyid=' + parameter.scanpolicyid + '; COMMIT;';
            connectSql.returnResults(sql).then(res => { // 编辑任务
                resolve({code: 200, msg: '修改成功'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    setTask(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT max(queueid) AS max FROM c_task';
            let queueid = null;
            let initMax = null;
            connectSql.returnResults(sql).then(res => { // 运行任务
                queueid = res[0].max;
                initMax = res[0].max;

                if (queueid === 0) {
                    queueid = 1;
                } else {
                    queueid = queueid + 1;
                }

                let sql = 'UPDATE c_task SET status=' + parameter.status;
                if (parameter.status === 2) {
                    sql += ',queueid=0';
                }
                if (parameter.status === -1) { // 加入排队
                    sql += ',queueid=' + queueid;
                }
                sql += ' WHERE id=' + parameter.id + ';';

                if (parameter.status === 1) {
                    sql = null;
                    sql = 'UPDATE c_task SET status=1,break=1,queueid=0 WHERE id = ' + parameter.id + ';';
                }
                return connectSql.returnResults(sql);
            }).then(res => {
                if (parameter.status === 1) {
                    let sql = 'BEGIN;UPDATE c_scan_type_task SET status=1 WHERE taskid = ' + parameter.id + ';'
                        + 'UPDATE c_task SET queueid=queueid-1 WHERE queueid>0;'
                        + 'commit;';
                    return connectSql.returnResults(sql);
                } else if (parameter.status === 2 && parameter.queueid !== initMax) {
                    let sql = 'UPDATE c_task SET queueid=queueid-1 WHERE queueid>' + parameter.queueid;
                    return connectSql.returnResults(sql);
                } else {
                    resolve({code: 200, msg: '操作成功'});
                }
            }).then(res => {
                resolve({code: 200, msg: '操作成功'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryChangeData(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id,name FROM c_scan_policy WHERE enterpriseid=' + parameter.enterpriseid
                + ' ORDER BY create_time DESC;'
                + 'SELECT id,name FROM c_car_price WHERE enterpriseid=' + parameter.enterpriseid
                + ' ORDER BY create_time DESC;'
                + 'select id,name from c_car_type WHERE enterpriseid=' + parameter.enterpriseid + ' AND carpriceid=';
            if (parameter.carpriceid) {
                sql += parameter.carpriceid + ';';
            } else {
                sql += '(select id from c_car_price ORDER BY create_time DESC LIMIT 1);';
            }
            let globalSql = 'SELECT parameter FROM c_base;';
            connectSql.returnResults(sql + globalSql).then(res => { // 删除任务
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    updateProgress(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'UPDATE c_task SET progress=' + parameter.progress + ' WHERE id=' + parameter.id;
            connectSql.returnResults(sql).then(res => { // 更新progress
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryProgress() {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT c_scan_type_task.taskid,c_scan_type_task.scantypeid,c_scan_type_task.progress,'
                + 'c_task.status AS taskStatus FROM c_scan_type_task INNER JOIN c_task ON '
                + 'c_task.id=c_scan_type_task.taskid WHERE taskid = ( SELECT id FROM c_task WHERE status=0);';
            connectSql.returnResults(sql).then(res => { // 获取任务所有进度
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryTaskData(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT c_scan_type_task.id,c_scan_type_task.taskid,c_scan_type_task.scantypeid,'
                + 'c_scan_type_task.progress,c_scan_type_task.status,c_scan_type_task.parameter,'
                + 'c_scan_type_task.durationTime,c_scan_type.cn AS name,c_scan_type.dependence,'
                + 'DATE_FORMAT(c_scan_type_task.startTime,"%Y-%m-%d %H:%i:%s") AS startTime,'
                + 'DATE_FORMAT(c_scan_type_task.endTime,"%Y-%m-%d %H:%i:%s") AS endTime '
                + 'FROM c_scan_type_task INNER JOIN c_scan_type ON c_scan_type_task.scantypeid=c_scan_type.id '
                + 'WHERE taskid=' + parameter.id + ' ORDER BY c_scan_type_task.sortId;';
            connectSql.returnResults(sql).then(res => { // 获取任务详情
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryTaskScanRunning(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT c_scan_type_task.scantypeid,c_scan_type_task.progress,c_scan_type_task.status,'
                + 'c_scan_type_task.startTime, c_scan_type_task.endTime '
                + 'FROM c_scan_type_task INNER JOIN c_scan_type ON c_scan_type_task.scantypeid=c_scan_type.id '
                + 'WHERE taskid= ' + parameter.id + ' AND status=0';
            connectSql.returnResults(sql).then(res => { // 获取任务详情
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    editTaskScan(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'UPDATE c_scan_type_task SET ';
            if (parameter.parameter !== '') {
                sql += ',parameter=\'' + parameter.parameter + '\'';
            }
            if (parameter.stop) {
                sql += ' killflag=1 WHERE taskid=' + parameter.taskid + ' AND scantypeid=' + parameter.scantypeid + ';';
            } else {
                sql += 'status =' + parameter.status
                    + ' WHERE status!=0 AND taskid=' + parameter.taskid + ' AND scantypeid='
                    + parameter.scantypeid + ';';
            }
            connectSql.returnResults(sql).then(res => { // 获取任务扫描项详情
                resolve({code: 200, msg: '修改成功'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    editTaskSort(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT max(queueid) AS max FROM c_task';
            connectSql.returnResults(sql).then(res => { // 任务排序
                let max = res[0].max;
                if (parameter.newQueue > max) {
                    resolve({code: 400, msg: '已经是最后一个了'});
                } else {
                    let sql = 'UPDATE c_task AS s1 JOIN c_task AS s2 ON(s1.queueid=' + parameter.initQueue + ' AND '
                        + 's2.queueid =' + parameter.newQueue + ')'
                        + 'OR (s1.queueid=' + parameter.newQueue + ' AND s2.queueid=' + parameter.initQueue + ') '
                        + 'SET s1.queueid = s2.queueid,s2.queueid=s1.queueid;';
                    return connectSql.returnResults(sql);
                }
            }).then(res => {
                resolve({code: 200, msg: '修改成功'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryScanParameter(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT parameter FROM c_scan_type_task WHERE id=' + parameter.id;
            connectSql.returnResults(sql).then(res => { // 获取任务详情
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    }
};
