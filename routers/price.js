/**
 * @file 用于车型车厂请求接口页面
 * 引用express模块绑定路由
 * 导入数据库查询文件price
 * get: '/' 默认接口车厂车型，查询扫描策略列表，扫描项列表
 * post: '/create' 创建车厂/车型
 * post: '/delete' 删除车厂/车型
 * post: '/eidt' 编辑车厂/车型
 * get: '/priceType' 获取车型
 * get: '/checkName' 验证车厂/车型名称唯一
 *
 */

const express = require('express');
const router = express.Router();
const Price = require('../models/price');

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
    Price.queryPrice(parameter).then(results => {
        let price = results[0];
        let cartype = results[1];
        let count = results[2][0].total;
        price.forEach(item => {
            let str = '';
            let arr = [];
            cartype.forEach(type => {
                if (item.id === type.carpriceid) {
                    arr.push(type);
                    str += type.name + '/';
                }
            });
            item.models = str.substring(0, str.length - 1);
            item.child = arr;
        });
        let data = {
            price,
            count
        };
        return res.send(data);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });

});

router.get('/priceType', function (req, res, next) {
    let priceTypeid = req.query.priceTypeid;
    let parameter = {
        priceTypeid
    };
    Price.queryPriceType(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/checkName', function (req, res, next) {
    let type = req.query.type;
    let name = req.query.name;
    let id = req.query.id;
    let parameter = {
        type,
        name
    };
    if (type !== 'price') {
        parameter.carpriceid = req.query.carpriceid;
    }
    Price.queryCheckName(parameter).then(results => {
        if (results.length === 0) {
            return res.send({code: 200, msg: '名称可使用'});
        }

        if (id === '' || id === undefined) {
            if (results[0].id === id) {
                return res.send({code: 200, msg: '名称可使用'});
            } else {
                return res.send({code: 400, msg: '名称已存在'});
            }
        } else if (results[0].id === Number(id)) {
            return res.send({code: 200, msg: '名称可使用'});
        } else {
            return res.send({code: 400, msg: '名称已存在'});
        }
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/create', function (req, res, next) {
    let userid = req.session.user.id;
    let enterpriseid = req.session.user.enterpriseid;
    let type = req.fields.type;
    let name = req.fields.name;
    let description = req.fields.description;
    let carpriceid = req.fields.carpriceid;
    let parameter = {
        type,
        name,
        description,
        userid,
        enterpriseid
    };
    if (type === 'carType') {
        parameter.carpriceid = carpriceid;
    }

    Price.createCar(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/edit', function (req, res, next) {
    let type = req.fields.type;
    let id = req.fields.id;
    let name = req.fields.name;
    let description = req.fields.description;
    let carpriceid = req.fields.carpriceid;
    let parameter = {
        type,
        name,
        description,
        id
    };

    Price.editCar(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/delete', function (req, res, next) {
    let type = req.fields.type;
    let id = req.fields.id;
    let parameter = {
        type,
        id
    };

    Price.deleteCar(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

module.exports = router;
