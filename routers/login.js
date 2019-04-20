/**
 * @file 用于login请求接口页面
 * 引用express模块绑定路由
 *
 */
const captchapng = require('svg-captcha');
const express = require('express');
const router = express.Router();
const Login = require('../models/login');
const md5 = require('./md5');

// router.get('/', function (req, res, next) {
//     return res.send(req.session);
// });

router.get('/captchapng', function (req, res, next) {
    let captcha = captchapng.create({width: 80, height: 40});
    req.session.captcha = captcha.text;
    res.type('svg');
    return res.send(captcha.data);
});

router.post('/signin', function (req, res, next) {
    let name = req.fields.name;
    let password = req.fields.password;
    let code = req.fields.code.toString().toLowerCase();
    let captchaCode = req.session.captcha.toString().toLowerCase();
    let parameter = {
        name,
        password
    };
    Login.userLogin(parameter).then(results => {
        let user = results;
        if (user.length === 0) {
            return res.send({code: 0, msg: '无此用户'});
        }
        if (user.length !== 0 && password !== md5.aesDecrypt(user[0].password)) {
            return res.send({code: 1, msg: '密码错误'});
        }
        if (code !== captchaCode || code.length !== 4) {
            return res.send({code: -1, msg: '验证码无效'});
        } else {
            let data = user[0];
            let resDate = {
                id: data.id,
                roleid: data.roleid,
                enterpriseid: data.enterpriseid,
                name: data.username
            };

            req.session.user = data;
            return res.send({code: 200, msg: '登录成功', user: resDate});
        }
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/signout', function (req, res, next) {
    req.session.destroy(function (err) {
        if (err) {
            return res.send({code: 400, msg: '退出失败'});
        }
        return res.send({code: 200, msg: '成功退出'});
    });
});

module.exports = router;
