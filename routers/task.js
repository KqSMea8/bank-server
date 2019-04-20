/**
 * @file 用于扫描项请求接口页面
 * 引用express模块绑定路由
 * 导入数据库查询文件scan
 * get: '/' 默认接口task，查询任务列表
 * get: '/getTactics' 查询扫描策略
 * get: '/getChangeData' 查询下拉数据
 * get: '/getTaskName' 查询任务名称是否唯一
 * get: '/getTaskDetail' 查询任务详情
 * post: '/create' 创建任务
 * post: '/delete' 删除任务
 * post: '/eidt' 编辑任务
 * post: '/run' 开始任务
 * post: '/editTaskScant' 编辑任务下扫描项
 * post: '/changeSort' 切换排序
 */

const express = require('express');
const router = express.Router();
const Task = require('../models/task');

router.get('/', function (req, res, next) { // 获取所有任务
    let enterpriseid = req.session.user.enterpriseid;
    let taskname = req.query.taskname;
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
        taskname,
        limitStart,
        limitEnd,
        enterpriseid
    };

    Task.queryAll(parameter).then(results => { // 查询数据库返回数据
        let count = results.totalSql[0].total;
        let tacticsList = results.tactics;
        let result = results.taskList;
        let scanList = results.scanList;
        let carModelList = results.carType;

        result.forEach(item => {
            let str = '';
            scanList.forEach(value => { // 匹配任务id 拼接扫描项
                if (item.taskid === value.taskid) {
                    str += value.name + ', ';
                }
            });
            str = str.substring(0, str.length - 2);

            item.scanList = str;
            if (item.queueid !== 0) {
                item.queueid = item.queueid - 1;
            }
            carModelList.forEach(value => { // 匹配车厂id
                if (item.carmodelid === value.id && item.carpriceid === value.carpriceid) {
                    item.carmodelname = value.name;
                }
            });

        });

        let data = {
            count,
            result
        };
        return res.send(data);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/getTactics', function (req, res, next) { // 获取扫描策略
    Task.queryAllTactics().then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/getTaskName', function (req, res, next) { // 校验任务名称是否唯一
    let name = req.query.name;
    let id = req.query.id;
    let parameter = {
        name,
        id
    };
    Task.queryTaskName(parameter).then(results => { // 返回值
        if (results.code) {
            return res.send({code: 400, msg: '数据查询失败'});
        }
        if (results.length === 0) {
            return res.send({code: 200, msg: '任务名称可使用'});
        }

        if (id === '') {
            if (results[0].id === id) {
                return res.send({code: 200, msg: '任务名称可使用'});
            } else {
                return res.send({code: 400, msg: '任务名称已存在'});
            }
        } else if (results[0].id === Number(id)) {
            return res.send({code: 200, msg: '任务名称可使用'});
        } else {
            return res.send({code: 400, msg: '任务名称已存在'});
        }
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/create', function (req, res, next) { // 创建任务
    let userid = req.session.user.id;
    let enterpriseid = req.session.user.enterpriseid;
    let name = req.fields.name;
    let parameter = req.fields.parameter;
    let carmodelid = req.fields.carmodelid;
    let carpriceid = req.fields.carpriceid;
    let description = '';
    let scanpolicyid = req.fields.scanpolicyid;
    if (req.fields.description) { // 查看任务描述是否上传
        description = req.fields.description;
    }
    let para = {
        name,
        carmodelid,
        carpriceid,
        parameter,
        description,
        scanpolicyid,
        userid,
        enterpriseid
    };
    Task.insertByOne(para).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/delete', function (req, res, next) { // 删除任务
    let id = req.fields.id;
    let parameter = {
        id
    };
    Task.deleteByOne(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/edit', function (req, res, next) { // 编辑任务
    let operatorid = req.session.user.id;
    let id = Number(req.fields.id);
    let name = req.fields.name;
    let parameter = req.fields.parameter;
    let scanpolicyid = Number(req.fields.scanpolicyid);
    let description = req.fields.description;
    let para = {
        id,
        name,
        parameter,
        scanpolicyid,
        description,
        operatorid
    };
    Task.editByOne(para).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/updateProgress', function (req, res, next) { // 查询进度
    let id = req.fields.id;
    let progress = req.fields.progress;
    let parameter = {
        id,
        progress
    };
    Task.updateProgress(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/run', function (req, res, next) { // 执行任务
    let status = req.fields.status;
    let id = req.fields.id;
    let parameter = {
        status,
        id
    };
    if (status === 2) {
        parameter.queueid = req.fields.queueid;
    }

    if (status === 1) {
        parameter.break = req.fields.break;
    }

    Task.setTask(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/getChangeData', function (req, res, next) { // 获取
    let enterpriseid = req.session.user.enterpriseid;
    let carpriceid = req.query.carpriceid;
    let parameter = {
        carpriceid,
        enterpriseid
    };
    Task.queryChangeData(parameter).then(results => {
        let data = {
            policy: results[0],
            price: results[1],
            priceType: results[2],
            parameter: JSON.parse(results[3][0].parameter)
        };
        return res.send(data);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/getTaskDetail', function (req, res, next) { // 获取任务详情
    let id = req.query.id;
    let parameter = {
        id
    };

    Task.queryTaskData(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/getScanParameter', function (req, res, next) {
    let id = req.query.id;
    let parameter = {
        id
    };

    Task.queryScanParameter(parameter).then(results => {
        let data = JSON.parse(results[0].parameter);
        return res.send(data);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });

});

router.post('/editTaskScan', function (req, res, next) { // 编辑任务扫描项
    let taskid = req.fields.taskid;
    let scantypeid = req.fields.scantypeid;
    let status = req.fields.status;
    let para = {
        taskid,
        scantypeid,
        status
    };
    if (req.fields.parameter) {
        para.parameter = req.fields.parameter;
    } else {
        para.parameter = '';
    }
    if (req.fields.stop) {
        para.stop = true;
    }
    Task.editTaskScan(para).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/changeSort', function (req, res, next) { // 排序
    let initQueue = req.fields.initQueue;
    let newQueue = req.fields.newQueue;
    let parameter = {
        initQueue,
        newQueue
    };
    if (newQueue < 2) {
        return res.send({code: 400, msg: '已经是最前面了'});
    }
    Task.editTaskSort(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

module.exports = router;
