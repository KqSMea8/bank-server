/**
 * @file 用于扫描项数据库查询语句
 * 引用mysql模块通过config配置文件中配置连接sql
 * queryAll：查询所有日志
 *   sql为查询日志
 * uploadByOne:上传日志文件
 *   sql写入日志数据
 * updateByOne：编辑数据
 * deleteByOne：删除日志
 * changeLog：写入日志并读取过滤条件数据
 * queryLogData：读取过滤条件数据
 * getLogName：根据日志id查询日志名称
 * downLogData：下载分析数据
 */
const sortby = require('lodash.sortby');
const chunk = require('lodash.chunk');
const fsOperation = require('../middlewares/fsOperation');
const connectSql = require('../middlewares/connectSql'); // 数据库连接中间件

module.exports = {
    queryAll(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'select c_scan_type_task.id,c_task.name AS description,c_scan_type.cn,'
                + 'c_scan_type_task.logname,c_car_type.name as device,'
                + 'DATE_FORMAT(c_task.update_time,"%Y-%m-%d %H:%i:%s") AS upload_time from c_scan_type_task '
                + 'inner join c_task on c_task.id=c_scan_type_task.taskid '
                + 'left join  c_scan_type on c_scan_type.id = c_scan_type_task.scantypeid '
                + 'left join c_car_type on c_car_type.id=c_task.carmodelid '
                + 'where c_scan_type_task.status=1 AND c_task.status=1 AND c_task.diff=0 '
                + 'AND (c_scan_type.cn like \'%' + parameter.searchText + '%\' or c_task.name like \'%'
                + parameter.searchText + '%\') ';

            let totalSql = 'select count(1) as total from c_scan_type_task '
                + 'inner join c_task on c_task.id=c_scan_type_task.taskid '
                + 'left join  c_scan_type on c_scan_type.id = c_scan_type_task.scantypeid '
                + 'where c_scan_type_task.status=1 AND c_task.status=1 AND c_task.diff=0 '
                + 'AND (c_scan_type.cn like \'%' + parameter.searchText + '%\' or c_task.name like \'%'
                + parameter.searchText + '%\') ';
            if (parameter.enterpriseid !== 0) {
              sql += ' AND c_task.enterpriseid=' + parameter.enterpriseid;
              totalSql += ' AND c_task.enterpriseid=' + parameter.enterpriseid;
            }
            sql += ' ORDER BY c_task.update_time DESC LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
            connectSql.returnResults(sql + totalSql).then(res => { // 查询日志
              resolve(res)
            }).catch(err => {
              reject(err)
            })
        })
    },
    uploadByOne(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'INSERT INTO c_log (name,device_name,size,description,userid,enterpriseid) VALUES '
                + '("' + parameter.filename + '","demo","' + parameter.size + '","' + parameter.description + '",'
                + parameter.userid + ',' + parameter.enterpriseid + ');';
            connectSql.returnResults(sql).then(res => { // 上传日志
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    updateByOne(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'UPDATE c_log SET description="' + parameter.description + '"'
                + ' WHERE id=' + parameter.id;
            connectSql.returnResults(sql).then(res => { // 更新日志描述
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    deleteByOne(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT name FROM c_log WHERE id IN (' + parameter.str + ');';
            let logList = '';
            connectSql.returnResults(sql).then(res => { // 查询日志名称
                logList = res;
                let sql = 'DELETE FROM c_log WHERE id in (' + parameter.str + ');';
                return connectSql.returnResults(sql);
            }).then(res => {
                return Promise.all(logList.map(function (path) { // 循环删除日志文件 ？还有问题需重新改
                    let filepath = '/home/zsh/log/' + path.name;
                    return fsOperation.deleteLog(filepath);
                }));
            }).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    changeLog(parameter) {
        return new Promise((resolve, reject) => {
            let arr = '';
            let count = '';
            let ecuidList = '';
            let sql = 'DELETE FROM c_log_data; ';
            connectSql.returnResults(sql).then(res => {
                let cutLogData = chunk(parameter.data, 500);
                let arr = []
                cutLogData.forEach(data => {
                    let insertSql = 'INSERT INTO c_log_data(time,type,ecuid,dlc,data,logid,strTime) VALUES ';
                    let dataSql = '';
                    data.forEach(item => {
                        dataSql += '(\'' + item.time + '\',\'' + item.type + '\',\'' + item.id + '\',' + item.dlc + ',\''
                            + item.data + '\',' + item.logid + ',\'' + item.strTime + '\'),';
                    });
                    dataSql = dataSql.substring(0, dataSql.length - 1) + ';';
                    arr.push(connectSql.returnResults(insertSql + dataSql))
                });

                return Promise.all(arr);
            }).then(res => {
                let logDataSql = '';
                if (parameter.type === 'vt') {
                    logDataSql = 'SELECT ecuid,data,COUNT(*) AS total FROM c_log_data GROUP BY ecuid,data '
                        + 'ORDER BY COUNT(*) LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
                        + 'SELECT COUNT(1) AS count FROM (SELECT a.ecuid,a.data,COUNT(*) AS total '
                        + 'FROM c_log_data AS a GROUP BY a.ecuid,a.data) AS b;';
                }
                if (parameter.type === 'diff') {
                    logDataSql = 'SELECT DISTINCT ecuid,id,dlc AS len,data FROM c_log_data'
                        + ' LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
                        + 'SELECT COUNT(1) AS count FROM (SELECT DISTINCT ecuid FROM c_log_data) AS a;';
                }
                if (parameter.type === 'raw') {
                    let arr = [1, 4, 7, 10, 13, 16, 19, 22];
                    let index = arr[Number(parameter.byte)];
                    if (parameter.canid !== '' && parameter.byte !== '' && parameter.byteValue !== '') {
                        logDataSql = 'SELECT id,DATE_FORMAT(time,"%Y-%m-%d %H:%i:%s") AS time,ecuid,dlc AS len,data '
                            + 'FROM c_log_data WHERE ecuid="' + parameter.canid + '" AND '
                            + 'SUBSTR(data,LENGTH(data)-' + index + ',2) = "' + parameter.byteValue + '" '
                            + 'ORDER BY ecuid DESC LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
                            + 'SELECT count(1) AS count FROM c_log_data WHERE ecuid="' + parameter.canid + '" AND '
                            + 'SUBSTR(data,LENGTH(data)-' + index + ',2)="' + parameter.byteValue + '";';

                    } else if (parameter.canid === '' && parameter.byte !== '') {
                        logDataSql = 'SELECT id,DATE_FORMAT(time,"%Y-%m-%d %H:%i:%s") AS time,ecuid,dlc AS len,data '
                            + 'FROM c_log_data WHERE SUBSTR(data,LENGTH(data)-' + index + ',2) = "'
                            + parameter.byteValue + '" ORDER BY ecuid DESC LIMIT ' + parameter.limitStart + ','
                            + parameter.limitEnd + ';'
                            + 'SELECT count(1) AS count FROM c_log_data WHERE '
                            + 'SUBSTR(data,LENGTH(data)-' + index + ',2)="' + parameter.byteValue + '";';

                    } else if (parameter.canid !== '' && parameter.byte === '') {
                        logDataSql = 'SELECT id,DATE_FORMAT(time,"%Y-%m-%d %H:%i:%s") AS time,ecuid,dlc AS len,data '
                            + 'FROM c_log_data WHERE ecuid=' + parameter.ecuid + ' ORDER BY ecuid DESC '
                            + 'LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
                            + 'SELECT count(1) AS count FROM c_log_data WHERE ecuid=' + parameter.ecuid + ';';
                    } else {
                        logDataSql = 'SELECT id,DATE_FORMAT(time,"%Y-%m-%d %H:%i:%s") AS time,ecuid,dlc AS len,data '
                            + 'FROM c_log_data ORDER BY ecuid DESC LIMIT ' + parameter.limitStart
                            + ',' + parameter.limitEnd + ';'
                            + 'SELECT count(1) AS count FROM c_log_data;';
                    }
                }
                if (parameter.type === 'top') {
                    logDataSql = 'SELECT ecuid,count(*) AS total FROM c_log_data GROUP BY ecuid ORDER BY COUNT(*) DESC'
                        + ' LIMIT 0,20;';
                }
                if (parameter.type === 'basic') {
                    if (parameter.canid !== '') {
                        logDataSql = 'SELECT MAX(diffTime) AS max, MIN(diffTime) AS min, AVG(diffTime) AS avg '
                            + 'FROM (SELECT A.time AS aTime, B.time AS bTime, (B.time - A.time) AS diffTime'
                            + ' FROM  (SELECT @rowno := @rowno + 1 AS rowno, time, ecuid FROM c_log_data, '
                            + '(SELECT @rowno := 0) t WHERE 1 = 1 AND ecuid = "' + parameter.canid + '") A '
                            + '  LEFT JOIN (SELECT @rowno := @rowno + 1 AS rowno, time, ecuid FROM c_log_data, '
                            + '(SELECT @rowno := 0) t  WHERE 1 = 1 AND ecuid = "' + parameter.canid + '") B'
                            + ' ON A.rowno + 1 = B.rowno) F;'
                            + 'SELECT COUNT(DISTINCT ecuid) AS total FROM c_log_data '
                            + 'WHERE ecuid="' + parameter.canid + '";'
                            + 'SELECT MAX(dlc) AS max,MIN(dlc) AS min, AVG(dlc) AS avg FROM c_log_data '
                            + 'WHERE ecuid="' + parameter.canid + '";'
                            + 'SELECT ecuid FROM c_log_data GROUP BY ecuid;';

                    } else {
                        logDataSql = 'SELECT MAX(diffTime) AS max,MIN(diffTime) AS min, AVG(diffTime) AS avg FROM '
                            + '(SELECT A.time AS aTime, B.time As bTime, (B.time-A.time) AS diffTime FROM'
                            + '(SELECT time,id FROM c_log_data ) A  LEFT JOIN (SELECT time,id FROM c_log_data ) B'
                            + ' ON A.id+1=B.id) AS c;'
                            + 'SELECT COUNT(DISTINCT ecuid) AS total FROM c_log_data;'
                            + 'SELECT MAX(dlc) AS max,MIN(dlc) AS min, AVG(dlc) AS avg FROM c_log_data;'
                            + 'SELECT ecuid FROM c_log_data GROUP BY ecuid;';
                    }
                }
                if (parameter.type === 'inter') {
                    if (parameter.canid !== '') {
                        logDataSql = 'SELECT (B.time - A.time) AS diffTim'
                            + ' FROM (SELECT @rowno2 := @rowno2 + 1 AS rowno, time, ecuid FROM c_log_data, '
                            + '(SELECT @rowno2 := 0) t WHERE ecuid="' + parameter.canid + '") A LEFT JOIN '
                            + '(SELECT @rowno3 := @rowno3 + 1 AS rowno, time, ecuid FROM c_log_data,'
                            + ' (SELECT @rowno3 := 0) t WHERE ecuid = "' + parameter.canid + '") B'
                            + ' ON A.rowno + 1 = B.rowno;'
                            + 'SELECT ecuid FROM c_log_data GROUP BY ecuid;';
                    } else {
                        logDataSql = 'SELECT count(1) as total,MAX(diffTime) AS max,MIN(diffTime) AS min FROM '
                            + '(SELECT t.diffTime FROM (SELECT A.time AS aTime, B.time As bTime,(B.time-A.time) '
                            + 'AS diffTime FROM  (SELECT time,id FROM c_log_data) A LEFT JOIN (SELECT time,id '
                            + 'FROM c_log_data ) B ON A.id+1=B.id) t WHERE t.diffTime BETWEEN 0 AND 30) c;'
                            + 'SELECT count(1) as total,MAX(diffTime) AS max,MIN(diffTime) AS min FROM '
                            + '(SELECT t.diffTime FROM (SELECT A.time AS aTime, B.time As bTime,(B.time-A.time) '
                            + 'AS diffTime FROM (SELECT time,id FROM c_log_data) A LEFT JOIN (SELECT time,id '
                            + 'FROM c_log_data ) B ON A.id+1=B.id) t WHERE t.diffTime BETWEEN 31 AND 60) c;'
                            + 'SELECT count(1) as total,MAX(diffTime) AS max,MIN(diffTime) AS min FROM '
                            + '(SELECT t.diffTime FROM (SELECT A.time AS aTime, B.time As bTime,(B.time-A.time) '
                            + 'AS diffTime FROM (SELECT time,id FROM c_log_data) A LEFT JOIN (SELECT time,id '
                            + 'FROM c_log_data ) B ON A.id+1=B.id) t WHERE t.diffTime BETWEEN 61 AND 90) c;'
                            + 'SELECT count(1) as total,MAX(diffTime) AS max,MIN(diffTime) AS min FROM '
                            + '(SELECT t.diffTime FROM (SELECT A.time AS aTime, B.time As bTime,(B.time-A.time) '
                            + 'AS diffTime FROM(SELECT time,id FROM c_log_data) A LEFT JOIN (SELECT time,id '
                            + 'FROM c_log_data ) B ON A.id+1=B.id) t WHERE t.diffTime BETWEEN 91 AND 120) c;'
                            + 'SELECT count(1) as total,MAX(diffTime) AS max,MIN(diffTime) AS min FROM '
                            + '(SELECT t.diffTime FROM (SELECT A.time AS aTime, B.time As bTime,(B.time-A.time) '
                            + 'AS diffTime FROM (SELECT time,id FROM c_log_data) A LEFT JOIN (SELECT time,id '
                            + 'FROM c_log_data ) B ON A.id+1=B.id) t WHERE t.diffTime BETWEEN 121 AND 150) c;'
                            + 'SELECT count(1) as total,MAX(diffTime) AS max,MIN(diffTime) AS min FROM '
                            + '(SELECT t.diffTime FROM (SELECT A.time AS aTime, B.time As bTime,(B.time-A.time) '
                            + 'AS diffTime FROM (SELECT time,id FROM c_log_data) A LEFT JOIN (SELECT time,id '
                            + 'FROM c_log_data ) B ON A.id+1=B.id) t WHERE t.diffTime BETWEEN 150 AND 500) c;'
                            + 'SELECT count(1) as total,MAX(diffTime) AS max,MIN(diffTime) AS min FROM '
                            + '(SELECT t.diffTime FROM (SELECT A.time AS aTime, B.time As bTime,(B.time-A.time) '
                            + 'AS diffTime FROM (SELECT time,id FROM c_log_data) A LEFT JOIN (SELECT time,id '
                            + 'FROM c_log_data ) B ON A.id+1=B.id) t WHERE t.diffTime > 501) c;'
                            + 'SELECT ecuid FROM c_log_data GROUP BY ecuid;';
                    }
                }
                if (parameter.type === 'per') {
                    if (parameter.canid !== '') {
                        logDataSql = 'SELECT ecuid,COUNT(*) AS total FROM c_log_data WHERE '
                            + 'ecuid="' + parameter.ecuid + '" GROUP BY ecuid ORDER BY COUNT(*) '
                            + 'LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
                            + 'SELECT COUNT(1) as total FROM (SELECT ecuid,COUNT(*) AS total FROM c_log_data '
                            + ' WHERE ecuid="' + parameter.canid + '" GROUP BY ecuid) b;'
                            + 'SELECT ecuid FROM c_log_data GROUP BY ecuid;';
                    } else {
                        logDataSql = 'SELECT ecuid,COUNT(*) AS total FROM c_log_data GROUP BY ecuid '
                            + 'ORDER BY ecuid DESC LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
                            + 'SELECT COUNT(1) as total FROM (SELECT ecuid,COUNT(*) AS total FROM c_log_data '
                            + 'GROUP BY ecuid) b;'
                            + 'SELECT ecuid FROM c_log_data GROUP BY ecuid;';
                    }
                }
                if (parameter.type === 'byte') {
                    if (parameter.canid !== '') {
                        logDataSql = 'SELECT ecuid,COUNT(*) AS total FROM c_log_data WHERE '
                            + 'ecuid="' + parameter.canid + '"  GROUP BY ecuid ORDER BY COUNT(*) '
                            + 'LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
                            + 'SELECT COUNT(1) as total FROM (SELECT ecuid,COUNT(*) AS total FROM c_log_data '
                            + 'WHERE ecuid="' + parameter.canid + '" GROUP BY ecuid) b;'
                            + 'SELECT ecuid FROM c_log_data GROUP BY ecuid;';
                    } else {
                        logDataSql = 'SELECT ecuid,COUNT(*) AS total FROM c_log_data GROUP BY ecuid '
                            + 'ORDER BY ecuid DESC LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
                            + 'SELECT COUNT(1) as total FROM (SELECT ecuid,COUNT(*) AS total FROM c_log_data '
                            + 'GROUP BY ecuid) b;'
                            + 'SELECT ecuid FROM c_log_data GROUP BY ecuid;';
                    }
                }
                return connectSql.returnResults(logDataSql);
            }).then(res => {
                if (parameter.type === 'per') {
                    arr = res[0];
                    count = res[1][0].total;
                    ecuidList = res[2];
                    let ecuid = '';
                    let sql = '';
                    if (arr.length === 0) {
                        sql = 'SELECT ecuid,DATE_FORMAT(time,"%Y-%m-%d %H:%i:%s") AS time FROM c_log_data '
                            + 'WHERE ecuid in(0)';
                    } else {
                        arr.forEach(item => {
                            ecuid += item.ecuid + ',';
                        });
                        ecuid = ecuid.substring(0, ecuid.length - 1);
                        sql = 'SELECT ecuid,DATE_FORMAT(time,"%Y-%m-%d %H:%i:%s") AS time FROM c_log_data '
                            + 'WHERE ecuid in(' + ecuid + ')';
                    }
                    return connectSql.returnResults(sql);
                } else if (parameter.type === 'byte') {
                    arr = res[0];
                    count = res[1][0].total;
                    ecuidList = res[2];
                    let ecuid = '';
                    let sql = '';
                    if (arr.length === 0) {
                        sql = 'SELECT ecuid,data,dlc FROM c_log_data WHERE ecuid in(0)';
                    } else {
                        arr.forEach(item => {
                            ecuid += item.ecuid + ',';
                        });
                        ecuid = ecuid.substring(0, ecuid.length - 1);
                        sql = 'SELECT ecuid,data,dlc FROM c_log_data WHERE ecuid in(' + ecuid + ')';
                    }
                    return connectSql.returnResults(sql);
                } else {
                    resolve(res);
                }
            }).then(res => {
                if (parameter.type === 'per') {
                    let ecuidData = res;
                    let data = {
                        count: count,
                        ecuid: arr,
                        ecuidData: ecuidData,
                        ecuidList: ecuidList
                    };
                    resolve(data);
                } else if (parameter.type === 'byte') {
                    let ecuidData = res;
                    let data = {
                        count: count,
                        ecuid: arr,
                        ecuidData: ecuidData,
                        ecuidList: ecuidList
                    };
                    resolve(data);
                }
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryLogData(parameter) {
        return new Promise((resolve, reject) => {
            let logDataSql = '';
            let arr = '';
            let count = '';
            let ecuidList = '';
            if (parameter.type === 'vt') {
                logDataSql = 'SELECT ecuid,data,COUNT(*) AS total FROM c_log_data '
                    + 'GROUP BY ecuid,data ORDER BY COUNT(*) '
                    + ' LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
                    + 'SELECT COUNT(1) AS count FROM (SELECT a.ecuid,a.data,COUNT(*) AS total '
                    + 'FROM c_log_data AS a GROUP BY a.ecuid,a.data) AS b;';
            }
            if (parameter.type === 'diff') {
                logDataSql = 'SELECT DISTINCT ecuid,id,dlc AS len,data FROM c_log_data'
                    + ' LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
                    + 'SELECT COUNT(1) AS count FROM (SELECT DISTINCT ecuid FROM c_log_data) AS a;';
            }
            if (parameter.type === 'raw') {
                let arr = [1, 5, 9, 13, 17, 21, 25, 29];
                let index = arr[Number(parameter.byte)];
                if (parameter.canid !== '' && parameter.byte !== '' && parameter.byteValue !== '') {
                    logDataSql = 'SELECT id,DATE_FORMAT(time,"%Y-%m-%d %H:%i:%s") AS time,ecuid,dlc AS len,data '
                        + 'FROM c_log_data WHERE ecuid="' + parameter.canid + '" AND '
                        + 'SUBSTR(data,' + index + ',2) = "' + parameter.byteValue + '" '
                        + 'ORDER BY ecuid DESC LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
                        + 'SELECT count(1) AS count FROM c_log_data WHERE ecuid="' + parameter.canid + '" AND '
                        + 'SUBSTR(data,' + index + ',2)="' + parameter.byteValue + '";';

                } else if (parameter.canid === '' && parameter.byte !== '' && parameter.byteValue !== '') {
                    logDataSql = 'SELECT id,DATE_FORMAT(time,"%Y-%m-%d %H:%i:%s") AS time,ecuid,dlc AS len,data '
                        + 'FROM c_log_data WHERE SUBSTR(data,' + index + ',2) = "' + parameter.byteValue + '" '
                        + 'ORDER BY ecuid DESC LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
                        + 'SELECT count(1) AS count FROM c_log_data WHERE '
                        + 'SUBSTR(data,' + index + ',2)="' + parameter.byteValue + '";';

                } else if (parameter.canid !== '' && parameter.byteValue === '') {
                    logDataSql = 'SELECT id,DATE_FORMAT(time,"%Y-%m-%d %H:%i:%s") AS time,ecuid,dlc AS len,data '
                        + 'FROM c_log_data WHERE ecuid=' + parameter.canid + ' ORDER BY ecuid DESC '
                        + 'LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
                        + 'SELECT count(1) AS count FROM c_log_data WHERE ecuid=' + parameter.canid + ';';
                } else {
                    logDataSql = 'SELECT id,DATE_FORMAT(time,"%Y-%m-%d %H:%i:%s") AS time'
                        + ',ecuid,dlc AS len,data '
                        + 'FROM c_log_data ORDER BY ecuid DESC LIMIT ' + parameter.limitStart
                        + ',' + parameter.limitEnd + ';'
                        + 'SELECT count(1) AS count FROM c_log_data;';
                }
            }

            if (parameter.type === 'top') {
                logDataSql = 'SELECT ecuid,count(*) AS total FROM c_log_data GROUP BY ecuid '
                    + 'ORDER BY COUNT(*) DESC LIMIT 0,20;';
            }

            if (parameter.type === 'basic') {
                if (parameter.canid !== '') {
                    logDataSql = 'SELECT MAX(diffTime) AS max, MIN(diffTime) AS min, AVG(diffTime) AS avg '
                        + 'FROM (SELECT A.time AS aTime, B.time AS bTime, (B.time - A.time) AS diffTime'
                        + ' FROM  (SELECT @rowno := @rowno + 1 AS rowno, time, ecuid FROM c_log_data, '
                        + '(SELECT @rowno := 0) t WHERE 1 = 1 AND ecuid = "' + parameter.canid + '") A '
                        + ' LEFT JOIN (SELECT @rowno := @rowno + 1 AS rowno, time, ecuid FROM c_log_data,'
                        + ' (SELECT @rowno := 0) t WHERE 1 = 1 AND ecuid = "' + parameter.canid + '") B'
                        + ' ON A.rowno + 1 = B.rowno) F;'
                        + 'SELECT COUNT(DISTINCT ecuid) AS total FROM c_log_data WHERE ecuid="' + parameter.canid + '";'
                        + 'SELECT MAX(dlc) AS max,MIN(dlc) AS min, AVG(dlc) AS avg FROM c_log_data '
                        + 'WHERE ecuid="' + parameter.canid + '";'
                        + 'SELECT ecuid FROM c_log_data GROUP BY ecuid;';

                } else {
                    logDataSql = 'SELECT MAX(diffTime) AS max,MIN(diffTime) AS min, AVG(diffTime) AS avg FROM '
                        + '(SELECT A.time AS aTime, B.time As bTime,(B.time-A.time) AS diffTime FROM'
                        + '(SELECT time,id FROM c_log_data ) A LEFT JOIN (SELECT time,id FROM c_log_data ) B'
                        + ' ON A.id+1=B.id) AS c;'
                        + 'SELECT COUNT(DISTINCT ecuid) AS total FROM c_log_data;'
                        + 'SELECT MAX(dlc) AS max,MIN(dlc) AS min, AVG(dlc) AS avg FROM c_log_data;'
                        + 'SELECT ecuid FROM c_log_data GROUP BY ecuid;';
                }
            }

            if (parameter.type === 'inter') {
                if (parameter.canid !== '') {
                    logDataSql = ' SELECT (B.time - A.time) AS diffTime'
                        + ' FROM (SELECT @rowno2 := @rowno2 + 1 AS rowno, time, ecuid FROM c_log_data, '
                        + '(SELECT @rowno2 := 0) t WHERE ecuid = "' + parameter.canid + '") A LEFT JOIN '
                        + '(SELECT @rowno3 := @rowno3 + 1 AS rowno, time, ecuid '
                        + ' FROM c_log_data, (SELECT @rowno3 := 0) t WHERE ecuid = "' + parameter.canid + '") B'
                        + ' ON A.rowno + 1 = B.rowno;'
                        + 'SELECT ecuid FROM c_log_data GROUP BY ecuid;';
                } else {
                    logDataSql = 'SELECT count(1) as total,MAX(diffTime) AS max,MIN(diffTime) AS min FROM '
                        + '(SELECT t.diffTime FROM (SELECT A.time AS aTime, B.time As bTime,(B.time-A.time) '
                        + 'AS diffTime FROM (SELECT time,id FROM c_log_data) A LEFT JOIN (SELECT time,id '
                        + 'FROM c_log_data ) B ON A.id+1=B.id) t WHERE t.diffTime BETWEEN 0 AND 30) c;'
                        + 'SELECT count(1) as total,MAX(diffTime) AS max,MIN(diffTime) AS min FROM (SELECT t.diffTime '
                        + 'FROM (SELECT A.time AS aTime, B.time As bTime,(B.time-A.time) AS diffTime FROM'
                        + ' (SELECT time,id FROM c_log_data) A LEFT JOIN (SELECT time,id FROM c_log_data ) B'
                        + ' ON A.id+1=B.id) t WHERE t.diffTime BETWEEN 31 AND 60) c;'
                        + 'SELECT count(1) as total,MAX(diffTime) AS max,MIN(diffTime) AS min FROM (SELECT t.diffTime '
                        + 'FROM (SELECT A.time AS aTime, B.time As bTime,(B.time-A.time) AS diffTime FROM'
                        + ' (SELECT time,id FROM c_log_data) A LEFT JOIN (SELECT time,id FROM c_log_data ) B'
                        + ' ON A.id+1=B.id) t WHERE t.diffTime BETWEEN 61 AND 90) c;'
                        + 'SELECT count(1) as total,MAX(diffTime) AS max,MIN(diffTime) AS min FROM (SELECT t.diffTime '
                        + 'FROM (SELECT A.time AS aTime, B.time As bTime,(B.time-A.time) AS diffTime FROM'
                        + ' (SELECT time,id FROM c_log_data) A LEFT JOIN (SELECT time,id FROM c_log_data ) B'
                        + ' ON A.id+1=B.id) t WHERE t.diffTime BETWEEN 91 AND 120) c;'
                        + 'SELECT count(1) as total,MAX(diffTime) AS max,MIN(diffTime) AS min FROM (SELECT t.diffTime '
                        + 'FROM (SELECT A.time AS aTime, B.time As bTime,(B.time-A.time) AS diffTime FROM'
                        + ' (SELECT time,id FROM c_log_data) A LEFT JOIN (SELECT time,id FROM c_log_data ) B'
                        + ' ON A.id+1=B.id) t WHERE t.diffTime BETWEEN 121 AND 150) c;'
                        + 'SELECT count(1) as total,MAX(diffTime) AS max,MIN(diffTime) AS min FROM (SELECT t.diffTime '
                        + 'FROM (SELECT A.time AS aTime, B.time As bTime,(B.time-A.time) AS diffTime FROM'
                        + ' (SELECT time,id FROM c_log_data) A LEFT JOIN (SELECT time,id FROM c_log_data ) B'
                        + ' ON A.id+1=B.id) t WHERE t.diffTime BETWEEN 150 AND 500) c;'
                        + 'SELECT count(1) as total,MAX(diffTime) AS max,MIN(diffTime) AS min FROM (SELECT t.diffTime '
                        + 'FROM (SELECT A.time AS aTime, B.time As bTime,(B.time-A.time) AS diffTime FROM'
                        + ' (SELECT time,id FROM c_log_data) A LEFT JOIN (SELECT time,id FROM c_log_data ) B'
                        + ' ON A.id+1=B.id) t WHERE t.diffTime > 501) c;'
                        + 'SELECT ecuid FROM c_log_data GROUP BY ecuid;';
                }
            }

            if (parameter.type === 'per') {
                if (parameter.canid !== '') {
                    logDataSql = 'SELECT ecuid,COUNT(*) AS total FROM c_log_data WHERE ecuid="'
                        + parameter.canid + '" '
                        + 'GROUP BY ecuid ORDER BY COUNT(*) LIMIT ' + parameter.limitStart + ','
                        + parameter.limitEnd + ';'
                        + 'SELECT COUNT(1) as total FROM (SELECT ecuid,COUNT(*) AS total FROM c_log_data '
                        + ' WHERE ecuid="' + parameter.canid + '" GROUP BY ecuid) b;'
                        + 'SELECT ecuid FROM c_log_data GROUP BY ecuid;';
                } else {
                    logDataSql = 'SELECT ecuid,COUNT(*) AS total FROM c_log_data GROUP BY ecuid '
                        + 'ORDER BY ecuid DESC LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
                        + 'SELECT COUNT(1) as total FROM (SELECT ecuid,COUNT(*) AS total FROM c_log_data'
                        + ' GROUP BY ecuid) b;'
                        + 'SELECT ecuid FROM c_log_data GROUP BY ecuid;';
                }
            }

            if (parameter.type === 'byte') {
                if (parameter.canid !== '') {
                    logDataSql = 'SELECT ecuid,COUNT(*) AS total FROM c_log_data WHERE ecuid="'
                        + parameter.canid + '"'
                        + ' GROUP BY ecuid ORDER BY COUNT(*) LIMIT ' + parameter.limitStart
                        + ',' + parameter.limitEnd + ';'
                        + 'SELECT COUNT(1) as total FROM (SELECT ecuid,COUNT(*) AS total FROM c_log_data '
                        + 'WHERE ecuid="' + parameter.canid + '" GROUP BY ecuid) b;'
                        + 'SELECT ecuid FROM c_log_data GROUP BY ecuid;';
                } else {
                    logDataSql = 'SELECT ecuid,COUNT(*) AS total FROM c_log_data GROUP BY ecuid '
                        + 'ORDER BY ecuid DESC LIMIT ' + parameter.limitStart + ',' + parameter.limitEnd + ';'
                        + 'SELECT COUNT(1) as total FROM (SELECT ecuid,COUNT(*) AS total FROM c_log_data'
                        + ' GROUP BY ecuid) b;'
                        + 'SELECT ecuid FROM c_log_data GROUP BY ecuid;';
                }
            }
            connectSql.returnResults(logDataSql).then(res => {
                if (parameter.type === 'per') {
                    arr = res[0];
                    count = res[1][0].total;
                    ecuidList = res[2];
                    let ecuid = '';
                    let sql = '';
                    if (arr.length === 0) {
                        sql = 'SELECT ecuid,DATE_FORMAT(time,"%Y-%m-%d %H:%i:%s") AS time FROM c_log_data '
                            + 'WHERE ecuid in(0)';
                    } else {
                        arr.forEach(item => {
                            ecuid += item.ecuid + ',';
                        });
                        ecuid = ecuid.substring(0, ecuid.length - 1);
                        sql = 'SELECT ecuid,DATE_FORMAT(time,"%Y-%m-%d %H:%i:%s") AS time FROM c_log_data '
                            + 'WHERE ecuid in(' + ecuid + ')';
                    }
                    return connectSql.returnResults(sql);
                } else if (parameter.type === 'byte') {
                    arr = res[0];
                    count = res[1][0].total;
                    ecuidList = res[2];
                    let ecuid = '';
                    let sql = '';
                    if (arr.length === 0) {
                        sql = 'SELECT ecuid,data,dlc FROM c_log_data WHERE ecuid in(0)';
                    } else {
                        arr.forEach(item => {
                            ecuid += item.ecuid + ',';
                        });
                        ecuid = ecuid.substring(0, ecuid.length - 1);
                        sql = 'SELECT ecuid,data,dlc FROM c_log_data WHERE ecuid in(' + ecuid + ')';
                    }
                    return connectSql.returnResults(sql);
                } else {
                    resolve(res);
                }
            }).then(res => {
                if (parameter.type === 'per') {
                    let ecuidData = res;
                    let data = {
                        count: count,
                        ecuid: arr,
                        ecuidData: ecuidData,
                        ecuidList: ecuidList
                    };
                    resolve(data);
                } else if (parameter.type === 'byte') {
                    let ecuidData = res;
                    let data = {
                        count: count,
                        ecuid: arr,
                        ecuidData: ecuidData,
                        ecuidList: ecuidList
                    };
                    resolve(data);
                }
            }).catch(err => {
                reject(err);
            });
        });
    },
    getLogName(parameter) {
        return new Promise((resolve, reject) => {
            let newLogid = sortby(parameter.logId.split(',')).join(','); // 分割日志名称
            let sql = 'SELECT logid FROM c_log_data GROUP BY logid';
            connectSql.returnResults(sql).then(res => { // 查询日志id
                let arr = res;
                let str = '';
                arr.forEach(item => {
                    str += item.logid + ',';
                });
                let logid = str.substring(0, str.length - 1);
                if (newLogid === logid) { // 日志名称已有则返回
                    resolve({isHasLogId: 1});
                } else {
                    let sql = 'SELECT logname AS name FROM c_scan_type_task WHERE id in('
                        + parameter.logId + ')';
                    return connectSql.returnResults(sql); // 查询日志名称
                }
            }).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    downLogData(parameter) {
        return new Promise((resolve, reject) => {
            let sql = '';
            let customPacketsSql = 'SELECT count(1) AS total FROM c_custom_packet_injection';
            if (parameter.type === 'vt' || parameter.type === 'selected') {
                sql = 'SELECT * FROM c_log_data WHERE ecuid IN (' + parameter.logid + ') '
                    + 'AND data IN (' + parameter.data + ');';
            } else {
                sql = 'SELECT * FROM c_log_data WHERE id IN (' + parameter.logid + ');';
            }
            connectSql.returnResults(sql + customPacketsSql).then(res => { // 查询数据
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    insertPacket(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'INSERT INTO c_custom_packet_injection(canid,timedelay,data,userid,enterpriseid) VALUES ';
            parameter.forEach(item => {
                sql += '("' + item.canid + '",' + item.timedelay + ',"' + item.data + '",'
                    + item.userid + ',' + item.enterpriseid + '),';
            });
            sql = sql.substring(0, sql.length - 1);
            connectSql.returnResults(sql).then(res => { // 查询数据
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    },
    replayTraffic(parameter) {
        return new Promise((resolve, reject) => {
            let sql = '';
            if (parameter.changetype === 'all') {
                sql = 'SELECT time,ecuid,type,dlc,data,strTime FROM c_log_data';
            } else if (parameter.type === 'vt') {
                sql = 'SELECT time,ecuid,type,dlc,data,strTime FROM c_log_data WHERE ecuid IN ('
                    + parameter.logid + ')' + ' AND data IN (' + parameter.data + ');';
            } else {
                sql = 'SELECT time,ecuid,type,dlc,data,strTime FROM c_log_data WHERE id IN ('
                    + parameter.logid + ')';
            }
            connectSql.returnResults(sql).then(res => {
                resolve(res);
            }).catch(err => {
                console.log(err)
                reject(err);
            });
        });
    },
    insertScanTask(parameter) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT id FROM c_scan_type WHERE type=\'' + parameter.scantype + '\';';
            let scantypeid = null;
            connectSql.returnResults(sql).then(res => {
                scantypeid = res[0].id;
                let name = scantypeid + '_' + new Date().getTime();
                let sql = 'INSERT c_task (name,parameter,status,diff,userid,enterpriseid) VALUE '
                    + '(\'' + name + '\',\'' + parameter.taskParameter + '\',' + parameter.status
                    + ',' + parameter.diff + ',' + parameter.userid + ',' + parameter.enterpriseid + ')';
                return connectSql.returnResults(sql);
            }).then(res => {
                let taskid = res.insertId;
                let sql = 'INSERT c_scan_type_task(taskid,scantypeid,parameter,userid,enterpriseid) VALUE '
                    + '(' + taskid + ',' + scantypeid + ',\'' + parameter.parameter + '\','
                    + parameter.userid + ',' + parameter.enterpriseid +')';
                return connectSql.returnResults(sql);
            }).catch(err => {
                reject(err);
            });
        });
    },
    queryTaskRunning(parameter) {
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
                    let taskid = data.scan.taskid;
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
    }
};
