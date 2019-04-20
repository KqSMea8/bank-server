/**
 * @file 用于扫描项请求接口页面
 * 引用express模块绑定路由
 * 导入数据库查询文件scan
 * get: '/' 默认接口task，查询扫描策略列表，扫描项列表
 * post: '/create' 创建任务
 * post: '/delete' 删除任务
 * post: '/eidt' 编辑任务
 *
 *
 */

const path = require('path');
const fs = require('fs');
const moment = require('moment');
// const async = require('async')
// const officegen = require('officegen')
const htmlDocx = require('html-docx-js');
const chunk = require('lodash.chunk'); // 数组分组
const express = require('express');
const router = express.Router();
const Result = require('../models/result');

router.get('/', function (req, res, next) {
    let enterpriseid = req.session.user.enterpriseid;
    let page = req.query.perPage;
    let curpage = req.query.currentPage;
    let limitStart = 0;
    let limitEnd = 0;
    if (page && curpage) {
        limitStart = page * (curpage - 1);
        limitEnd = page;
    } else {
        limitStart = 0;
        limitEnd = 5;
    }

    let parameter = {
        limitStart,
        limitEnd,
        enterpriseid
    };
    Result.queryTask(parameter).then(results => {
        let taskList = results[0];
        let scanList = results[1];
        let count = results[2][0].total;
        taskList.forEach(item => {
            item.scanCount = 0;
            scanList.forEach(value => {
                if (item.id === value.taskid) {
                    item.scanCount++;
                }
            });
        });
        let data = {
            count,
            taskList
        };
        return res.send(data);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/run', function (req, res, next) {
    let id = req.fields.id;
    let parameter = {
        id
    };

    Result.taskRun(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/delete', function (req, res, next) {
    let id = req.fields.id;
    let parameter = {
        id
    };

    Result.deleteTask(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/reportTask', function (req, res, next) {
    let id = req.query.id;
    let parameter = {
        id
    };
    Result.queryReportTask(parameter).then(results => {
        let task = results[0];
        task.parameter = JSON.parse(task.parameter);
        let data = {
            task
        };
        return res.send(data);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/reportCont', function (req, res, next) {
    let id = req.query.id;
    let parameter = {
        id
    };

    Result.queryReportCont(parameter).then(results => {
        let scanType = results.scanType;
        let scanResult = chunk(results.scanResult, 3);
        let risk = results.risk;
        let deploy = results.deploy;
        let description = results.description;
        let task = results.task[0];
        let scopeArray = results.scopeArray;
        let startTime = results.startTime;
        let summary = [];
        let testObject = {
            name: task.carname,
            creator: task.username,
            startTime: startTime,
            endTime: task.endTime,
            type: '总线方式',
            method: '工具+手工',
            detail: '车辆状况非正常，详见车况章节'
        };
        let safeRisk = [];
        let scanningProbe = [];
        let openQuestion = [];
        let start = parseInt(new Date(task.startTime).getTime(), 10);
        let end = parseInt(new Date(task.endTime).getTime(), 10);
        let day = Math.floor((end - start) / 1000 / 60 / 60 / 24);
        let hour = Math.floor((end - start) / 1000 / 60 / 60 % 24);
        let min = Math.floor((end - start) / 1000 / 60 % 60);
        let sec = Math.floor((end - start) / 1000 % 60);

        testObject.elapsedTime = day + '天' + hour + '时' + min + '分' + sec + '秒';

        scanType.forEach((item, index) => {
            item.data = scanResult[index][0];
            item.count = scanResult[index][1][0].total;
            item.field = [];
            scanResult[index][2].forEach(field => {
                item.field.push(field.Field);
            });
            deploy.forEach(scan => {
                if (item.dataTable === scan.dataTable) {
                    item.deploy = scan;
                }
            });
        });

        if (scopeArray.length !== 0) {
            scanType = changeItem(scanType, scopeArray, scanResult);
        }

        scanType.forEach(item => {
            let hideField = '';
            let changeData = '';
            let newField = '';
            let relevancyShow = '';
            if (item.deploy.setHide !== '' && item.deploy.setHide !== null) {
                hideField = item.deploy.setHide.split(',');
            }
            if (item.deploy.setChangeData !== '' && item.deploy.setChangeData !== null) {
                changeData = item.deploy.setChangeData.split(',');
            }

            if (item.deploy.setRelevancyField !== '' && item.deploy.setRelevancyField !== null) {
                relevancyShow = JSON.parse(item.deploy.setRelevancyField).fields;
            }
            if (item.deploy.setNewField !== '' && item.deploy.setNewField !== null) {
                newField = JSON.parse(item.deploy.setNewField).fields;
            }
            if (item.data.length !== 0) {
                item.data.forEach(val => {
                    if (val.time) {
                        val.time = moment(val.time).format('YYYY-MM-DD HH:mm:ss');
                    }
                    if (newField !== '') {
                        newField.forEach(field => {
                            val[field.nameField] = '';
                            let fn = field.funField;
                            let f = eval('(' + fn + ')');
                            val[field.nameField] = f(val);
                        });
                    }
                    if (relevancyShow !== '') {
                        relevancyShow.forEach((value, index) => {
                            let showField = value.relevancyShowField.split(',');
                            let showData = risk;
                            // if (relevancyShow.length !== 1) {
                            //   showData = relevancyData[index]
                            // } else {
                            //   showData = relevancyData
                            // }
                            showData.forEach(field => {
                                if (field[value.relevancyField] === val[value.relevancyField]) {
                                    showField.forEach(show => {
                                        val[show] = field[show];
                                    });
                                }
                            });
                        });
                    }
                    if (changeData !== '') {
                        changeData.forEach(field => {
                            if (val[field] !== '' && val[field] !== null) {
                                if (typeof JSON.parse(val[field]) === 'number') {
                                    val[field] = '0x' + Number(val[field]).toString(16).toUpperCase();
                                } else if (typeof JSON.parse(val[field]) === 'object') {
                                    let arr = JSON.parse(val[field]);
                                    changeCont(arr, item, field);
                                }
                            }
                        });
                    }
                    if (hideField !== '') {
                        hideField.forEach(field => {
                            delete val[field];
                        });
                    }
                    delete val.id;
                    delete val.taskid;
                });
                if (item.name === '主动探测') {
                    item.name = '总线ID-UDS';
                    item.scope = socpe(item);
                    scanningProbe.push(item);
                } else if (item.name === 'XCP主动探测') {
                    item.name = '总线ID-XCP';
                    item.scope = socpe(item);
                    scanningProbe.push(item);
                } else if (item.name === '服务探测') {
                    item.name = '总线服务';
                    item.scope = socpe(item);
                    scanningProbe.push(item);
                } else if (item.name === '子功能探测') {
                    item.name = '总线子服务';
                    item.scope = socpe(item);
                    scanningProbe.push(item);
                } else if (item.name === 'XCP指令支持') {
                    item.name = 'XCP指令';
                    item.scope = socpe(item);
                    scanningProbe.push(item);
                } else {
                    safeRisk.push(item);
                    summary.push({
                        name: item.name,
                        total: item.count,
                        risk: item.risk
                    });
                    openQuestion.push(item.name);
                }
            } else if (item.name === '主动探测') {
                item.name = '总线ID-UDS';
                scanningProbe.push(item);
            } else if (item.name === 'XCP主动探测') {
                item.name = '总线ID-XCP';
                scanningProbe.push(item);
            } else if (item.name === '服务探测') {
                item.name = '总线服务';
                scanningProbe.push(item);
            } else if (item.name === '子功能探测') {
                item.name = '总线子服务';
                scanningProbe.push(item);
            } else if (item.name === 'XCP指令支持') {
                item.name = 'XCP指令';
                scanningProbe.push(item);
            }
        });

        let data = {
            testObject,
            openQuestion,
            scanType,
            scanningProbe,
            description,
            safeRisk,
            summary
        };
        return res.send(data);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/uploadImage', function (req, res, next) {
    let file = req.files.discoverPics.path;
    return res.send(file);
});

router.post('/reportFileName', function (req, res, next) {
    let html = req.fields.editDiv;
    let name = req.fields.name;
    let outputFile = './public/report/' + name + '.docx'; // 下载路径

    let docxcc = htmlDocx.asBlob(html);
    fs.writeFile(outputFile, docxcc, function (err) {
        if (err) {
            throw err;
        }
        let path = name;
        return res.send(path);
    });
});

router.get('/downReport', function (req, res, next) {
    let name = decodeURI(req.query.name);
    let path = 'public/report/' + name + '.docx';
    return res.download(path);
});

router.get('/getCategory', function (req, res, next) {
    let id = req.query.id;
    let parameter = {
        id
    };

    Result.queryCategory(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });

});

router.get('/getCategoryScan', function (req, res, next) {
    let id = req.query.id;
    let categoryid = req.query.category_id;
    let parameter = {
        id,
        categoryid
    };
    Result.queryCategoryScan(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/getScanStatus', function (req, res, next) {
    let id = req.query.id;
    let scantypeid = req.query.scantypeid;
    let parameter = {
        id,
        scantypeid
    };
    Result.queryScanStatus(parameter).then(results => {
        let scantype = results.scantype;
        let total = results.total;
        let status = null;
        if (scantype.status === 1 && scantype.progress === 100) {
            status = '完成';
        }

        if (scantype.status === 1 && scantype.progress < 100 && scantype.progress !== -1) {
            status = '终止';
        }

        if (scantype.status === 1 && scantype.progress === -1) {
            status = '跳过';
        }
        let data = {
            status,
            total
        };
        return res.send(data);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/getScan', function (req, res, next) {
    let id = req.query.id;
    let parameter = {
        id
    };

    Result.queryScan(parameter).then(results => {
        let scanList = results.scanList;
        let scanResultTotal = results.scanResultTotal[0];
        scanList.forEach(item => {
            item.total = scanResultTotal[item.dataTable];
            if (item.status === 1 && item.progress === 100) {
                item.status = '完成';
            }

            if (item.status === 1 && item.progress !== -1 && item.progress < 100) {
                item.status = '终止';
            }

            if (item.status === 1 && item.progress === -1) {
                item.status = '跳过';
            }

            delete item.dataTable;
            delete item.progress;
        });
        return res.send(scanList);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/scanResult', function (req, res, next) {
    let id = req.query.id;
    let scanid = req.query.scantypeid;
    let page = req.query.perPage;
    let curpage = req.query.currentPage;
    let limitStart = 0;
    let limitEnd = 0;
    if (page && curpage) {
        limitStart = page * (curpage - 1);
        limitEnd = page;
    } else {
        limitStart = 0;
        limitEnd = 5;
    }
    let parameter = {
        id,
        scanid,
        limitEnd,
        limitStart
    };
    Result.queryResult(parameter).then(results => {
        let scanCategoryList = results.scanList;
        let result = results.result[0];
        let deploy = results.result[1][0];
        let count = results.result[2][0].total;
        let relevancyData = '';
        let servList = '';
        let hideField = '';
        let changeData = '';
        let newField = '';
        let relevancyShow = '';
        if (results.relevancyData) {
            relevancyData = results.relevancyData;
        }
        if (deploy.setHide !== '' && deploy.setHide !== null) {
            hideField = deploy.setHide.split(',');
        }

        if (deploy.setChangeData !== ''  && deploy.setChangeData !== null) {
            changeData = deploy.setChangeData.split(',');
        }

        if (deploy.setRelevancyField !== '' && deploy.setRelevancyField !== null) {
            relevancyShow = JSON.parse(deploy.setRelevancyField).fields;
        }
        if (deploy.setNewField !== '' && deploy.setNewField !== null) {
            newField = JSON.parse(deploy.setNewField).fields;
        }
        result.forEach(item => {
            if (item.time) {
                item.time = moment(item.time).format('YYYY-MM-DD HH:mm:ss');
            }
            if (newField !== '') {
                newField.forEach(field => {
                    item[field.nameField] = '';
                    let fn = field.funField;
                    let f = eval('(' + fn + ')');
                    item[field.nameField] = f(item);
                });
            }
            if (relevancyShow !== '') {
                relevancyShow.forEach((value, index) => {
                    let showField = value.relevancyShowField.split(',');
                    let showData = null;
                    if (relevancyShow.length !== 1) {
                        showData = relevancyData[index];
                    } else {
                        showData = relevancyData;
                    }
                    showData.forEach(field => {
                        if (field[value.relevancyField] === item[value.relevancyField]) {
                            showField.forEach(show => {
                                item[show] = field[show];
                            });
                        }
                    });
                });
            }
            if (changeData !== '') {
                changeData.forEach(field => {
                    if (item[field] !== '' && item[field] !== null) {
                        if (typeof JSON.parse(item[field]) === 'number') {
                            item[field] = '0x' + Number(item[field]).toString(16).toUpperCase();
                        } else if (typeof JSON.parse(item[field]) === 'object') {
                            let arr = JSON.parse(item[field]);
                            changeCont(arr, item, field);
                        }
                    }
                });
            }
            if (hideField !== '') {
                hideField.forEach(field => {
                    delete item[field];
                });
            }
            delete item.id;
            delete item.taskid;
        });

        let data = {
            count,
            result,
            scanCategoryList
        };
        return res.send(data);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

function changeItem(scanType, scopeArray, scanResult) {
    scanType.forEach((item, index) => {
        scopeArray.forEach(scope => {
            item.data = item.dataTable === scope.table ? scope.data : scanResult[index][0];
        });
    });
    return scanType;
}

function socpe(item) {
    let scope = [];
    item.data.forEach(data => {
        if (scope.length === 0) {
            scope.push({
                start: data.reqID,
                end: data.respID,
                uds: []
            });
            scope[0].uds.push(data);
        } else {
            scope.forEach(i => {
                if (i.start === data.reqID && i.end === data.respID) {
                    i.uds.push(data);
                } else {
                    scope.push({
                        start: data.reqID,
                        end: data.respID,
                        uds: [data]
                    });
                }
            });
        }
    });
    return scope;
}

function changeCont(arr, item, field) {
    let str = '';
    arr.forEach(val => {
        let num = Number(val).toString(16).toUpperCase();
        if (num.length === 1) {
            num = '0' + num;
        }
        str += num + ', ';
        num = null;
    });
    str = str.substring(0, str.length - 2);
    item[field] = '[' + str + ']';
}

module.exports = router;
