/**
 * @file 用于fuzzing请求接口页面
 * 引用express模块绑定路由
 * 导入数据库查询文件fuzzing
 * get: '/' 默认接口fuzzing
 *
 */

const express = require('express');
const router = express.Router();
const Custom = require('../models/custom');
const readLog = require('./readline');
const md5 = require('md5');
const logFilePath = require('../config/config').logFiles;
const onLineFiles = require('../config/config').onLineFiles;

router.get('/price', function (req, res, next) {
    let enterpriseid = req.session.user.enterpriseid;
    let parameter = {
        enterpriseid
    };
    Custom.queryPrice(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/model', function (req, res, next) {
    let carpriceid = req.query.carpriceid;
    let parameter = {
        carpriceid
    };

    Custom.queryModel(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/task', function (req, res, next) {
    let enterpriseid = req.session.user.enterpriseid;
    let carpriceid = req.query.carpriceid;
    let cartypeid = req.query.cartypeid;
    let timeRange = req.query.timeRange;
    let parameter = {
        carpriceid,
        cartypeid,
        timeRange,
        enterpriseid
    };
    if (!carpriceid) {
        parameter.carpriceid = '';
    }
    if (!cartypeid) {
        parameter.cartypeid = '';
    }

    if (!timeRange) {
        parameter.timeRange = '';
    }
    Custom.queryTask(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/taskScanType', function (req, res, next) {
    let id = req.query.id;
    let sortScan = req.query.sortScan;
    let parameter = {
        id
    };

    if (sortScan) {
        parameter.sort = true;
    }

    Custom.queryTaskScanType(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/taskRunScan', function (req, res, next) {
    let enterpriseid = req.session.user.enterpriseid;
    let type = req.query.type;
    let parameter = {
        enterpriseid,
        type
    };

    Custom.queryTaskRunScan(parameter).then(results => {
        if (results.code === 400) {
            return res.send({code: 400, msg: '没有数据'});
        }
        let customScan = results.scan;
        let task = results.task;
        customScan.scanList = results.scanList;
        customScan.parameter = JSON.parse(customScan.parameter);
        customScan.taskname = task.name;
        customScan.taskTime = task.taskTime;
        if (type === 'can_replay' || type === 'can_frame_probing') {
            // customScan.file = onLineFiles + '/' + '0_37_1530782409.log';
            customScan.file = logFilePath + '/' + '0_37_1530782409.log';
        } else {
            customScan.file = logFilePath + '/' + '0_37_1530782409.log';
            // customScan.file = onLineFiles + '/' + customScan.logname;
        }
        readLog.getFileData(customScan.file).then(data => {
            let log = data.slice(-500);
            customScan.data = log;
            return res.send(customScan);
        }).catch(err => {
            console.log(err);
            return res.send({code: 500, msg: '服务故障'});
        });
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/packetData', function (req, res, next) {
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

    Custom.queryPacket(parameter).then(results => {
        let packetData = {
            count: results[1][0].total
        };
        let data = [];
        results[0].forEach(item => {
            let json = {
                id: item.id,
                canid: '0x' + Number(item.canid).toString(16).toUpperCase(),
                timeDelay: item.timedelay,
                data: '[' + item.data + ']'
            };
            data.push(json);
        });
        packetData.data = data;
        return res.send(packetData);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });

});

router.get('/hasRunning', function (req, res, next) {
    Custom.queryHasRunning().then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/countPacket', function (req, res, next) {
    Custom.queryCountPacket().then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/insertPacket', function (req, res, next) {
    let userid = req.session.user.id;
    let enterpriseid = req.session.user.enterpriseid;
    let canid = req.fields.canid;
    let timeDelay = req.fields.timeDelay;
    let data = req.fields.data;
    let parameter = {
        canid,
        timeDelay,
        data,
        userid,
        enterpriseid
    };
    Custom.insertPacketData(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/deletePacket', function (req, res, next) {

    let id = req.fields.id;
    let parameter = {
        id
    };

    Custom.deletePacketData(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/stopCustom', function (req, res, next) {
    Custom.stopCustom().then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/playback', function (req, res, next) {
    let userid = req.session.user.id;
    let enterpriseid = req.session.user.enterpriseid;
    let type = req.fields.type;
    let parameter = req.fields.parameter;
    let para = {
        type: type,
        parameter: parameter,
        userid,
        enterpriseid
    };
    Custom.insertScanTypeTask(para).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/setCkey', function (req, res, next) {
    const username = req.session.user.username;
    const enterpriseid = req.session.user.enterpriseid;
    const time = new Date().getTime();
    const ckey = md5(time);
    let parameter = {
        ckey,
        enterpriseid,
        username
    };
    Custom.insertCkey(parameter).then(results => {
        let code = results.code;
        if (code === 400) {
            return res.end(results);
        } else {
            let commentId = results.commentId;
            return res.send({code: 200, msg: '标记成功', commentId: commentId});
        }
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/comment', function (req, res, next) {
    const commentId = req.fields.commentId;
    const comment = req.fields.comment;
    let parameter = {
        commentId,
        comment
    };
    Custom.insertComment(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

module.exports = router;
