/**
 * @file 用于扫描项数据库查询语句
 * 引用mysql模块通过config配置文件中配置连接sql
 * queryALL：查询完成任务、扫描项与任务关联数据
 *   sql为查询完成任务、扫描项与任务关联数据
 *
 */

const connectSql = require('../middlewares/connectSql'); // 数据库连接中间件

module.exports = {
    queryTask(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id,name,description,DATE_FORMAT(c_task.create_time,"%Y-%m-%d") AS create_time '
                + 'FROM c_task WHERE status=1 AND diff=0';
            let scanSql = 'SELECT c_scan_type_task.taskid,c_scan_type_task.scantypeid AS scanid,'
                + ' c_scan_type.cn AS scanname FROM c_scan_type_task INNER JOIN c_scan_type '
                + ' ON c_scan_type_task.scantypeid= c_scan_type.id '
                + ' WHERE c_scan_type_task.taskid = '
                + 'ANY (SELECT id FROM c_task WHERE status=1';
            let totalSql = 'SELECT COUNT(1) AS total FROM c_task WHERE status=1 AND diff=0';

            if (parameter.enterpriseid !== 0) {
                sql += ' AND enterpriseid=' + parameter.enterpriseid;
                totalSql += ' AND enterpriseid=' + parameter.enterpriseid;
                scanSql += ' AND enterpriseid=' + parameter.enterpriseid;
            }
            sql += ' ORDER BY c_task.create_time DESC LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';';
            scanSql += ' );';
            connectSql.returnResults(sql + scanSql + totalSql).then(res => { // 查询结果
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryScan(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT c_scan_type_task.taskid,c_scan_type_task.scantypeid AS scanid, c_scan_type_task.status,'
                + ' c_scan_type_task.progress,c_scan_type.dataTable,c_scan_type.cn AS name,'
                + 'c_scan_type.description,c_scan_type.category_id AS categoryid FROM c_scan_type_task '
                + ' INNER JOIN c_scan_type ON c_scan_type_task.scantypeid= c_scan_type.id '
                + ' WHERE c_scan_type_task.taskid =' + parameter.id + ';';
            let scanList = null;
            let scanResultTotal = null;
            connectSql.returnResults(sql).then(res => { // 查询结果
                scanList = res;
                let sql = 'SELECT ';
                res.forEach(item => {
                    sql += '(SELECT COUNT(1) AS ' + item.dataTable + ' FROM ' + item.dataTable
                        + ' WHERE taskid=' + parameter.id + ') AS ' + item.dataTable + ',';
                });

                sql = sql.substring(0, sql.length - 1);
                return connectSql.returnResults(sql);
            }).then(res => {
                scanResultTotal = res;
                let data = {
                    scanList,
                    scanResultTotal
                };
                resolve(data);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryResult(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT c_scan_type.dataTable FROM c_scan_type_task INNER JOIN c_scan_type '
                + 'ON c_scan_type_task.scantypeid = c_scan_type.id '
                + 'WHERE taskid=' + parameter.id + ' AND c_scan_type_task.scantypeid=' + parameter.scanid + ';';
            sql += 'SELECT id, cn AS name FROM c_scan_category WHERE id IN '
                + '(SELECT c_scan_type.category_id FROM c_scan_type_task INNER JOIN c_scan_type '
                + 'ON c_scan_type.id=c_scan_type_task.scantypeid WHERE taskid = ' + parameter.id + ');';
            let data = {};
            connectSql.returnResults(sql).then(res => {
                data.scanList = res[1];
                let dataTable = res[0][0].dataTable;
                let sql = 'SELECT * FROM ' + dataTable + ' WHERE taskid=' + parameter.id
                    + ' LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
                    + 'SELECT * FROM c_scan_deploy WHERE dataTable="' + dataTable + '";';
                let totalSql = 'SELECT count(1) AS total FROM ' + dataTable + ' WHERE taskid=' + parameter.id + ';';
                return connectSql.returnResults(sql + totalSql);
            }).then(res => { // 查询结果
                let setRelevancyField = res[1][0].setRelevancyField;
                data.result = res;
                if (setRelevancyField !== '') {
                    let dataBase = JSON.parse(setRelevancyField).fields;
                    let sql = '';
                    dataBase.forEach(item => {
                        sql += 'SELECT * FROM ' + item.relevancyDataBase + ';';
                    });
                    return connectSql.returnResults(sql);
                } else {
                    resolve(data);
                }
            }).then(res => {
                data.relevancyData = res;
                resolve(data);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryCategory(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id, cn AS name FROM c_scan_category WHERE id IN '
                + '(SELECT c_scan_type.category_id FROM c_scan_type_task INNER JOIN c_scan_type '
                + 'ON c_scan_type.id=c_scan_type_task.scantypeid WHERE taskid = ' + parameter.id + ');';
            connectSql.returnResults(sql).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryCategoryScan(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT c_scan_type_task.scantypeid,c_scan_type.category_id,c_scan_type.cn AS name '
                + 'FROM c_scan_type_task INNER JOIN c_scan_type ON c_scan_type.id= c_scan_type_task.scantypeid'
                + ' WHERE c_scan_type_task.taskid=' + parameter.id
                + ' AND c_scan_type.category_id =' + parameter.categoryid;
            connectSql.returnResults(sql).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryScanStatus(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT c_scan_type_task.status,c_scan_type_task.progress,c_scan_type.dataTable '
                + 'FROM c_scan_type_task INNER JOIN c_scan_type ON c_scan_type.id=' + parameter.scantypeid
                + ' WHERE taskid= ' + parameter.id + ' AND scantypeid=' + parameter.scantypeid;
            let scantype = null;
            connectSql.returnResults(sql).then(res => {
                scantype = res[0];
                let sql = 'SELECT count(1) AS total FROM ' + scantype.dataTable + ' WHERE taskid=' + parameter.id;
                return connectSql.returnResults(sql);
            }).then(res => {
                let total = res[0].total;
                let data = {
                    scantype,
                    total
                };
                resolve(data);
            }).catch(err => {
                reject(err);
            });
        });
    },
    deleteTask(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT c_scan_type_task.scantypeid,c_scan_type.dataTable FROM c_scan_type_task '
                + 'INNER JOIN c_scan_type ON c_scan_type_task.scantypeid = c_scan_type.id '
                + 'WHERE taskid=' + parameter.id + ';';
            connectSql.returnResults(sql).then(res => {
                let sql = 'BEGIN;'
                    + 'DELETE c_task, c_scan_type_task FROM c_task,c_scan_type_task '
                    + 'WHERE (c_task.id=c_scan_type_task.taskid) AND c_task.id=' + parameter.id + ';';
                let tb = '';
                res.forEach(item => {
                    tb += 'DELETE FROM ' + item.dataTable + ' WHERE taskid=' + parameter.id + ';';
                });
                sql += tb + 'COMMIT;';
                return connectSql.returnResults(sql);
            }).then(res => { // 查询结果
                resolve({code: 200, msg: '删除成功'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    taskRun(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'select c_scan_type.dataTable from c_scan_type_task inner join c_scan_type on '
                + 'c_scan_type.id = c_scan_type_task.scantypeid  where c_scan_type_task.taskid = ' + parameter.id;
            connectSql.returnResults(sql).then(res => {
                let scanResult = res;
                let sql = 'BEGIN;UPDATE c_task SET status=2,break=0 WHERE id=' + parameter.id + ';'
                    + 'update c_scan_type_task set status=-1,progress=-1 where taskid=' + parameter.id + ';';

                scanResult.forEach(scanTable => {
                    sql += 'DELETE FROM ' + scanTable.dataTable + ' WHERE taskid=' + parameter.id + ';';
                });
                sql += ' commit;';
                return connectSql.returnResults(sql);
            }).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
                let sql = 'UPDATE c_task SET status=1 WHERE id=' + parameter.id;
                return connectSql.returnResults(sql);
            }).then(res => {
                resolve({code: 400, msg: '操作失败'});
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryReportTask(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT task.id,task.taskname,task.parameter, task.createTime,task.username,'
                + ' car.carname,car.pricename FROM (SELECT c_task.id AS id, c_task.name AS taskname, '
                + ' c_task.parameter AS parameter,c_task.carmodelid AS carmodelid,'
                + ' DATE_FORMAT(c_task.create_time,"%Y-%m-%d %H:%i:%s") AS createTime,user.username AS username '
                + 'FROM c_task  INNER JOIN user ON user.id=c_task.userid) AS task INNER JOIN '
                + ' (SELECT c_car_type.id AS id,c_car_type.name AS carname,c_car_price.name AS pricename'
                + ' FROM c_car_type  INNER JOIN c_car_price ON c_car_type.carpriceid=c_car_price.id) AS car '
                + 'ON car.id = task.carmodelid  WHERE task.id=' + parameter.id + ';';
            connectSql.returnResults(sql).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryReportCont(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT c_scan_type.cn AS name,c_scan_type_task.status AS status,'
                + 'c_scan_type_task.progress AS progress,c_scan_type.dataTable,c_scan_type.risk,'
                + 'c_scan_type.risk_description,c_scan_type.risk_detail,'
                + 'c_scan_type.risk_suggest FROM c_scan_type_task INNER JOIN c_scan_type '
                + 'ON c_scan_type.id = c_scan_type_task.scantypeid WHERE taskid =' + parameter.id + ';'
                + 'SELECT * FROM c_serv_risk; SELECT * FROM c_scan_deploy;'
                + 'SELECT * FROM c_scan_result_report;'
                + 'SELECT task.id,task.taskname,task.parameter, task.createTime,task.username,'
                + ' car.carname,car.pricename, task.startTime, task.endTime FROM (SELECT c_task.id AS id, '
                + 'c_task.name AS taskname,  c_task.parameter AS parameter,c_task.carmodelid AS carmodelid,'
                + ' DATE_FORMAT(c_task.create_time,"%Y-%m-%d %H:%i:%s") AS createTime,user.username AS username, '
                + ' DATE_FORMAT(c_task.startTime,"%Y-%m-%d %H:%i:%s") AS startTime,'
                + ' DATE_FORMAT(c_task.endTime,"%Y-%m-%d %H:%i:%s") AS endTime '
                + ' FROM c_task INNER JOIN user ON user.id=c_task.userid) AS task INNER JOIN '
                + ' (SELECT c_car_type.id AS id,c_car_type.name AS carname,c_car_price.name AS pricename '
                + 'FROM c_car_type INNER JOIN c_car_price ON c_car_type.carpriceid=c_car_price.id) AS car '
                + 'ON car.id = task.carmodelid WHERE task.id=' + parameter.id + ';'
                + 'SELECT DATE_FORMAT(startTime,"%Y-%m-%d %H:%i:%s") AS startTime FROM c_scan_type_task WHERE taskid= '
                + parameter.id + ' ORDER BY sortId LIMIT 0,1';
            let data = {};
            connectSql.returnResults(sql).then(res => { //
                data.scanType = res[0];
                data.risk = res[1];
                data.deploy = res[2];
                data.description = res[3];
                data.task = res[4];
                data.startTime = res[5][0].startTime;
                let sql = '';
                data.scanType.forEach(scan => {
                    sql += 'SELECT * FROM ' + scan.dataTable + ' WHERE taskid=' + parameter.id + ' limit 0,20; '
                        + 'SELECT count(1) AS total FROM ' + scan.dataTable + ' WHERE taskid=' + parameter.id + ';'
                        + 'show columns from ' + scan.dataTable + ';';
                });
                return connectSql.returnResults(sql);
            }).then(res => {
                let sql = '';
                const scopeData = [
                    'ecu_initiative_probing',
                    'ecu_uds_subfuncs',
                    'ecu_uds_services',
                    'ecu_xcp_probing',
                    'ecu_xcp_support_command'
                ];
                data.scanResult = res;
                data.scopeArray = [];
                data.scanType.forEach(scan => {
                    scopeData.forEach(scopeScan => {
                        if (scan.dataTable === scopeScan) {
                            data.scopeArray.push({table: scopeScan, data: []});
                            sql += 'SELECT reqId, respId, count(1), "' + scan.dataTable + '" FROM ' + scan.dataTable
                                + ' WHERE taskid=' + parameter.id + ' GROUP BY reqId, respId;';
                        }
                    });
                });
                return connectSql.returnResults(sql);
            }).then(res => {
                let scopeTable = res;
                if (scopeTable.length === 0) {
                    resolve(data);
                } else {
                    let sql = '';
                    let scopeMegre = [];
                    scopeTable.forEach(megre => {
                        scopeMegre.push.apply(scopeMegre, megre);
                    });
                    scopeMegre.forEach((scope, i) => {
                        if (scope.length !== 0) {
                            let table = scope[Object.keys(scope).pop()];
                            sql += 'SELECT *,"' + table + '" FROM ' + table + ' WHERE taskid='
                                + parameter.id + ' AND reqId ='
                                + scope.reqId + ' AND respId=' + scope.respId + ' LIMIT 0, 20;';
                        }
                    });
                    return connectSql.returnResults(sql);
                }
            }).then(res => {
                let scopeScanData = res;
                if (scopeScanData.length > 1) {
                    scopeScanData.forEach((scan, i) => {
                        if (scan[0] !== undefined) {
                            let json = scan[0];
                            let table = json[Object.keys(json).pop()];
                            data.scopeArray.forEach(arr => {
                                if (table === arr.table) {
                                    arr.data.push.apply(arr.data, scan);
                                }
                            });
                        }
                    });
                    resolve(data);
                } else if (scopeScanData.length === 1) {
                    scopeScanData.forEach((scan, i) => {
                        let json = scan;
                        let table = json[Object.keys(json).pop()];
                        data.scopeArray.forEach(arr => {
                            if (table === arr.table) {
                                arr.data.push.apply(arr.data, scopeScanData);
                            }
                        });
                    });
                    resolve(data);
                }
            }).catch(err => {
                reject(err);
            });
        });
    }
};
