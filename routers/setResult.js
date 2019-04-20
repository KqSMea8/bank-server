/**
 * @file 用于设置结果信息请求路径
 * point:
 *   getConfig: 获取数据库中结果表显示配置
 *   setConfig: 设置数据库中每个扫描项表的显示配置
 *   addConfig: 添加扫描项表显示配置
 *
 */

const express = require('express');
const router = express.Router();
const setResult = require('../models/setResult');

router.get('/', function (req, res, next) {
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
        limitEnd
    };
    setResult.queryConfig(parameter).then(results => {
        let depoly = results[0];
        let count = results[1][0].total;
        results[0].forEach(item => {
            if (item.newField !== '' && item.newField !== null) {
                let nameStr = '';
                let funStr = '';
                let fieldArray = JSON.parse(item.newField);
                fieldArray.fields.forEach(filed => {
                    nameStr += filed.nameField + ',';
                    funStr += filed.funField + '|';
                });

                item.nameField = nameStr.substring(0, nameStr.length - 1);
                item.funField = funStr.substring(0, funStr.length - 1);
            }
        });

        let data = {
            result: depoly,
            count: count
        };

        return res.send(data);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/resultData', function (req, res, next) {
    let dataTable = req.query.dataTable;
    let parameter = {
        dataTable
    };
    setResult.queryResultData(parameter).then(results => {
        let data = results;
        data.forEach((item, index) => {
            if (item.Field === 'id') {
                data.splice(index, 1);
            }
        });
        data.forEach((item, index) => {
            if (item.Field === 'taskid') {
                data.splice(index, 1);
            }
        });
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/configData', function (req, res, next) {
    let id = req.fields.id;
    let hideField = req.fields.hideField;
    let relevancyShow = req.fields.relevancyShow;
    let hexField = req.fields.hexField;
    let newField = req.fields.newField;
    let parameter = {
        id,
        hideField,
        relevancyShow,
        hexField,
        newField
    };
    setResult.insertConfigData(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

module.exports = router;
