/**
 * @file 用于用户请求接口页面
 * 引用express模块绑定路由
 * 导入数据库查询文件user
 * get: '/' 默认接口查询用户
 * get: '/username' 查询用户名称
 * post: '/userCreate' 创建用户
 * post: '/userEdit' 编辑用户
 * post: '/userDelete' 删除用户
 * get: '/prise' 查询车企
 * get: '/prisename' 查询车企名称
 * get: '/priseUserName' 查询车企用户名称
 * post: '/priseCreate' 创建车企
 * post: '/priseEdit' 编辑车企
 * post: '/priseDelete' 删除车企
 *
 */

const express = require('express');
const router = express.Router();
const User = require('../models/user');
const md5 = require('./md5');

router.get('/', function (req, res, next) {
    let enterpriseid = req.session.user.enterpriseid;
    let page = Number(req.query.perPage); // 页码
    let curpage = Number(req.query.currentPage); // 当前页
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
    User.queryUser(parameter).then(results => {
        let data = {
            count: results[1][0].total,
            list: results[0]
        };
        return res.send(data);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/username', function (req, res, next) {
    let name = req.query.name;
    let id = req.query.id;
    let parameter = {
        name,
        id
    };
    User.queryUserName(parameter).then(results => {
        let len = results.length;
        if (len === 0) {
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

router.post('/userCreate', function (req, res, next) {
    let enterpriseid = req.fields.enterpriseid;
    let name = req.fields.name;
    let password = md5.aesEncrypt(req.fields.password);
    let email = req.fields.email;
    let phone = req.fields.phone;
    let description = req.fields.description;
    let parameter = {
        enterpriseid,
        name,
        password,
        email,
        phone,
        description
    };
    User.insertUser(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/userEdit', function (req, res, next) {
    let id = req.fields.id;
    let name = req.fields.name;
    let email = req.fields.email;
    let phone = req.fields.phone;
    let description = req.fields.description;
    let parameter = {
        id,
        name,
        email,
        phone,
        description
    };

    User.updateUser(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/userDelete', function (req, res, next) {
    let id = req.fields.id;
    let parameter = {
        id
    };
    User.deleteUser(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/checkPassword', function (req, res, next) {
    let userId = req.session.user.id;
    let oldPwd = md5.aesEncrypt(req.query.oldPwd);
    let parameter = {
        userId,
        oldPwd
    };
    User.checkPassword(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/changePassword', function (req, res, next) {
    let userId = req.session.user.id;
    let newPwd = md5.aesEncrypt(req.fields.newPwd);
    let parameter = {
        userId,
        newPwd
    };
    User.updatePassword(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/prise', function (req, res, next) {
    let enterpriseid = req.session.user.enterpriseid;
    let page = Number(req.query.perPage); // 页码
    let curpage = Number(req.query.currentPage); // 当前页
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
    User.queryPrise(parameter).then(results => {
        let result = results;
        let data = null;
        if (enterpriseid === 0) {
            data = {
                count: result[1][0].total,
                list: result[0]
            };
        } else {
            data = result[0];
        }

        return res.send(data);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/prisename', function (req, res, next) {
    let name = req.query.name;
    let id = req.query.id;
    let parameter = {
        name,
        id
    };
    User.queryPriseName(parameter).then(results => {
        let len = results.length;
        if (len === 0) {
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

router.get('/priseUserName', function (req, res, next) {
    let username = req.query.name;
    let id = req.query.enterpriseid;
    let parameter = {
        username,
        id
    };
    User.queryPriseUserName(parameter).then(results => {
        let len = results.length;
        if (len === 0) {
            return res.send({code: 200, msg: '任务名称可使用'});
        }
        if (id === '') {
            if (results[0].enterpriseid === Number(id)) {
                return res.send({code: 200, msg: '任务名称可使用'});
            } else {
                return res.send({code: 400, msg: '任务名称已存在'});
            }
        } else if (results[0].enterpriseid === Number(id) && results[0].roleid !== 3) {
            return res.send({code: 200, msg: '任务名称可使用'});
        } else {
            return res.send({code: 400, msg: '任务名称已存在'});
        }
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/priseCreate', function (req, res, next) {
    let name = req.fields.name;
    let username = req.fields.username;
    let password = md5.aesEncrypt(req.fields.password);
    let email = req.fields.email;
    let phone = req.fields.phone;
    let mobile = req.fields.mobile;
    let address = req.fields.address;
    let description = req.fields.description;
    let parameter = {
        name,
        username,
        password,
        email,
        phone,
        mobile,
        address,
        description
    };
    User.insertPrise(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/priseEdit', function (req, res, next) {
    let id = req.fields.id;
    let prisename = req.fields.name;
    let username = req.fields.username;
    let email = req.fields.email;
    let phone = req.fields.phone;
    let mobile = req.fields.mobile;
    let address = req.fields.address;
    let description = req.fields.description;
    let parameter = {
        id,
        prisename,
        username,
        email,
        phone,
        mobile,
        address,
        description
    };
    User.updatePrise(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/priseDelete', function (req, res, next) {
    let id = req.fields.id;
    let parameter = {
        id
    };
    User.deletePrise(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

module.exports = router;
