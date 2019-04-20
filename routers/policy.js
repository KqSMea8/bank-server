/**
 * @file 用于扫描项请求接口页面
 * 引用express模块绑定路由
 * 导入数据库查询文件scan
 * get: '/' 默认接口policy，查询扫描策略列表，扫描项列表
 * post: '/create' 创建扫描策略
 * post: '/delete' 删除扫描策略
 * post: '/eidt' 编辑扫描策略
 * post: '/run' 执行扫描策略
 *
 */

const express = require('express');
const router = express.Router();
const Policy = require('../models/policy');

router.get('/', function (req, res, next) {
    let enterpriseid = req.session.user.enterpriseid;
    let policyname = req.query.policyname;
    let page = req.query.perPage;
    let curpage = req.query.currentPage;
    let limitStart = 0;
    let limitEnd = 0;

    if (!policyname) {
        policyname = '';
    }

    if (page && curpage) {
        limitStart = page * (curpage - 1);
        limitEnd = page;
    } else {
        limitStart = 0;
        limitEnd = 5;
    }

    let parameter = {
        policyname,
        limitEnd,
        limitStart,
        enterpriseid
    };
    Policy.queryAll(parameter).then(results => {
        let data = [];
        let policy = results[0];
        let typepolicy = results[1];
        let total = results[2][0].total;
        let taskList = results[3];

        typepolicy.forEach(value => {
            let str = value.parameter;
            str = JSON.parse(str);
            value.parameter = str;
        });

        policy.forEach(item => {
            item.scanList = [];
            item.hasTask = false;
            typepolicy.forEach(value => {
                if (item.id === value.tactics) {
                    item.scanList.push({id: value.tactics, name: value.name});
                }
            });
            taskList.forEach(task => {
                if (item.id === task.scanpolicyid) {
                    item.hasTask = true;
                }
            });
        });
        let result = {
            count: total,
            policyList: policy
        };
        return res.send(result);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/scanType', function (req, res, next) {
    Policy.queryScanType().then(results => {
        let data = [];
        let scanType = results[0];
        let scanList = results[1];

        scanType.forEach(value => {
            data.push({id: value.id, name: value.name, child: []});
        });

        scanList.forEach(value => {
            let str = value.parameter;
            str = JSON.parse(str);
            value.parameter = str;
        });

        data.forEach(item => {
            item.child = [];
            scanList.forEach(value => {
                if (item.id === value.category_id) {
                    item.child.push(value);
                }
            });
        });

        return res.send(data);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/getpolicyName', function (req, res, next) {
    let name = req.query.name;
    let id = req.query.id;
    let parameter = {
        name,
        id
    };
    Policy.queryPolicyName(parameter).then(results => {
        if (results.length === 0) {
            return res.send({code: 200, msg: '任务名称可使用'});
        }
        if (id === '') {
            if (results[0].id === id) {
                return results.send({code: 200, msg: '任务名称可使用'});
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

router.post('/create', function (req, res, next) {
    let userid = req.session.user.id;
    let enterpriseid = req.session.user.enterpriseid;
    let name = req.fields.name;
    let description = '';
    let scanList = req.fields.scanList;
    if (req.fields.description) {
        description = req.fields.description;
    }

    let parameter = {
        name,
        description,
        scanList,
        userid,
        enterpriseid
    };
    Policy.insertByOne(parameter).then(results => {
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
    Policy.deleteByOne(parameter).then(results => {
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
    Policy.queryScanParameter(parameter).then(results => {
        let policyList = results[0][0];
        let scanList = results[1];

        scanList.forEach(value => {
            let str = value.parameter;
            str = JSON.parse(str);
            value.parameter = str;
        });

        policyList.scanList = scanList;
        return res.send(policyList);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/editVerify', function (req, res, next) {
    let id = req.query.id;
    let parameter = {
        id
    };
    Policy.queryEditVerify(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/edit', function (req, res, next) {
    let id = req.fields.id;
    let name = req.fields.name;
    let description = req.fields.description;
    let scanList = req.fields.scanList;

    let parameter = {
        id,
        name,
        description,
        scanList
    };
    Policy.editByOne(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

module.exports = router;
