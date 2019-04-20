/**
 * @file 用于日志管理请求接口页面
 * 引用express模块绑定路由
 * 引用lodash用于数据处理
 * 引用zlib压缩文件
 * 引用moment处理时间
 * 引用log返回数据库操作方法
 * 引用readData读取日志数据
 * 引用standardDeviation标准差计算方法
 * 导入数据库查询文件log
 * get: '/' 默认接口loglist，查询日志管理列表
 * post: '/upload' 用于上传日志文件
 * get: '/download' 用于下载日志文件
 * post: '/edit' 用于编辑日志描述
 * post: '/delete' 删除日志
 * get: '/changeLog' 用于选择日志时，处理日志数据并写入数据库，在根据过滤条件处理返回数据
 *     type: 根据界面几种日志分析操作的类型(vt,diff,raw,top,basic,inter,per,byte)对返回的数据进行格式处理
 *     getResult： 获取日志名称，并查询数据库是否已有日志
 *     getMsg：传入日志文件名称，并判断是否与数据库的日志名称是否一致，一致使用queryLogData方法直接查询数据库，
 * get: '/downLogData' 下载日志分析时的数据
 *
 */

const os = require('os');
const sysName = os.platform();
const fs = require('fs');
const chunk = require('lodash.chunk'); // 数组分组
const max = require('lodash.max'); // 最大值
const min = require('lodash.min'); // 最小值
const sortby = require('lodash.sortby'); // 排序
const uniq = require('lodash.uniq'); // 去重
const mean = require('lodash.mean'); // 平均值
const express = require('express');
const moment = require('moment'); // 时间格式
const router = express.Router();
const Log = require('../models/log'); // log 数据库操作
const readData = require('./readline'); // 读写文件
const fsOperation = require('../middlewares/fsOperation');
const onLineFiles = require('../config/config').onLineFiles;
const logFilePath = require('../config/config').logFiles;
const standardDeviation = (arr, usePopulation = false) => { // 标准差
    const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
    return Math.sqrt(
        arr.reduce((acc, val) => acc.concat((val - mean) ** 2), []).reduce((acc, val) => acc + val, 0)
        / (arr.length - (usePopulation ? 0 : 1))
    );
};

router.get('/', function (req, res, next) { // 获取日志，需增加权限控制 enterpriseid
    let enterpriseid = req.session.user.enterpriseid;
    let page = Number(req.query.perPage); // 页码
    let curpage = Number(req.query.currentPage); // 当前页
    let searchText = req.query.searchText;
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
        enterpriseid,
        searchText
    };

    Log.queryAll(parameter).then(results => {
        let result = results[0];
        let count = results[1][0].total;
        result.forEach(item => {
            let logPath = logFilePath + '/' + item.logname;
            // let logPath = onLineFiles + '/' + item.logname;
            item.name = item.cn + '_' +item.logname;
            try {
                item.size = fs.statSync(logPath).size;
            } catch (e) {
                item.size = '--'
            }

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

router.post('/upload', function (req, res, next) { // 上传文件
    let userid = req.session.user.id;
    let enterpriseid = req.session.user.enterpriseid;
    let file = req.files.thumbnail; // 文件对象
    let name = file.name;// 文件名称
    name = name.substring(0, name.length - 4);
    let size = file.size; // 文件大小
    let description = name; // 文件描述
    let filePath = file.path.lastIndexOf('\\'); // 文件路径
    let filename = file.path.substring(filePath + 1); // 文件名称
    filename = filename.substring(0, filename.length - 4);

    let parameter = {
        filename,
        size,
        description,
        userid,
        enterpriseid
    };

    Log.uploadByOne(parameter).then(results => {
        return res.send({code: 200, msg: '上传成功'});
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/edit', function (req, res, next) { // 编辑描述
    let id = req.fields.id; // 日志id
    let description = req.fields.description; // 日志描述
    let parameter = {
        id,
        description
    };
    Log.updateByOne(parameter).then(results => {
        return res.send({code: 200, msg: '修改成功'});
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/download', function (req, res, next) { // 文件下载
    let name = req.query.name; // 日志名称
    let path = logFilePath + '/' + name; // 下载路径
    // let path = onLineFiles + '/' + name; // 下载路径
    return res.download(path);
});

router.post('/delete', function (req, res, next) {
    let idList = req.fields.idList;
    let str = '';
    idList.forEach(item => {
        str += '"' + item.toString() + '"' + ',';
    });

    str = str.substring(0, str.length - 1);
    let parameter = {
        str
    };
    Log.deleteByOne(parameter).then(results => {
        return res.send(results);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/changeLog', function (req, res, next) { // 选择日志
    let logId = req.query.id; // 日志id
    let canid = req.query.ecuid; // ecuid
    let type = req.query.type; // 操作类型 vt,diff,raw,top,basic,inter,per,byte
    let byte = req.query.byte; // data byte 位置
    let byteValue = req.query.byteValue; // byte位置的值
    let page = req.query.perPage; // 页码
    let curpage = req.query.currentPage; // 当前页
    let limitStart = 0;
    let limitEnd = 0;
    if (!canid) { // 为空、underfined 处理
        canid = '';
    } else {
        canid = parseInt(canid, 16);
    }
    if (!byte) { // 为underfined
        byte = '';
    }
    if (!byteValue) { // 为underfined
        byteValue = '';
    }

    if (page && curpage) {
        limitStart = page * (curpage - 1);
        limitEnd = page;
    } else {
        limitStart = 0;
        limitEnd = 5;
    }
    let parameter = {
        logId
    };
    Log.getLogName(parameter).then(results => {
        let arr = [7, 6, 5, 4, 3, 2, 1, 0];
        let isHasLogId = results.isHasLogId; // 是否已有日志id, 用于判断数据库是否已经上传过日志以便不再次写入数据库
        let parameter = {
            logId,
            type,
            canid,
            byte,
            byteValue,
            limitStart,
            limitEnd
        };
        if (byte) { // byte位置值转换16进制
            parameter.byte = arr[byte];
        }
        if (byteValue !== '' && byteValue !== undefined) { // byte位置值转换16进制
            parameter.byteValue = byteValue;
        }

        let fileArr = results; // 得到上一个回调返回的值：日志文件名称数组
        if (isHasLogId === 1) { // 判断是否已上传日志
            return Log.queryLogData(parameter); // 此方法需先写入数据库
        } else {
            return readData.getData(fileArr, parameter); // 此方法直接查询数据库
        }
    }).then(results => {
        if (type === 'top') { // 类型为 top20时
            results.forEach(item => { // 为top20转换为16进制
                item.ecuid = '0x' + Number(item.ecuid).toString(16).toUpperCase();
            });
            let data = {
                logData: results
            };
            return res.send(data);
        }
        if (type === 'vt' || type === 'diff') { // 类型为vt diff时
            results[0].forEach(item => { // 循环 ecuid转换为16进制
                item.ecuid = '0x' + Number(item.ecuid).toString(16).toUpperCase();
                let asciiArr = item.data.split(',');
                let dataJson = asciiHandle(asciiArr);
                let str = dataJson.str;
                let len = dataJson.len;
                str = str.substring(0, str.length - 1);
                str = '[' + str + ']';
                if (type === 'vt') { // 为vt 时len处理
                    item.len = len;
                }
                if (type === 'diff') { // 为diff 时len默认为1
                    item.total = 1;
                }
                item.data = str;
                item.ascii = str;
            });
            let data = {
                count: results[1][0].count,
                logData: results[0]
            };
            return res.send(data);
        }

        if (type === 'raw') { // 类型为raw 时
            results[0].forEach(item => { // 循环 ecuid 转换为16进制
                item.ecuid = '0x' + Number(item.ecuid).toString(16).toUpperCase();
                let asciiArr = item.data.split(',');
                let dataJson = asciiHandle(asciiArr);
                let str = dataJson.str;
                let len = dataJson.len;
                str = str.substring(0, str.length - 1);
                str = '[' + str + ']';
                item.data = str;
                item.ascii = str;
            });
            let data = {
                count: results[1][0].count,
                logData: results[0]
            };
            return res.send(data);
        }

        if (type === 'basic') { // 类型为basic时
            let list = [];
            let data = {
                time: results[0][0],
                diff: results[1][0].total,
                dlc: results[2][0]
            };
            results[3].forEach(item => { // 下拉ecuid转换为16进制
                item.ecuid = '0x' + Number(item.ecuid).toString(16).toUpperCase();
                list.push(item);
            });
            data.dlc.avg = parseInt(data.dlc.avg, 10); // 取整
            data.ecuidList = list;
            return res.send(data);
        }

        if (type === 'inter') { // 类型为inter
            let list = [];
            let data = {};
            if (canid !== '') {
                let ecuidTotal = results[0];
                let timeData = [];
                ecuidTotal.forEach(item => {
                    if (item.diffTime !== null) {
                        timeData.push(item.diffTime);
                    }
                });
                let one = timeData.filter(x => { // 7种格式阶段数据处理
                    return x < 30;
                });

                let two = timeData.filter(x => {
                    if (31 < x && x < 60) {
                        return x;
                    }
                    return false;
                });
                let three = timeData.filter(x => {
                    if (61 < x && x < 90) {
                        return x;
                    }
                    return false;
                });
                let four = timeData.filter(x => {
                    if (91 < x && x < 120) {
                        return x;
                    }
                    return false;
                });
                let five = timeData.filter(x => {
                    if (121 < x && x < 150) {
                        return x;
                    }
                    return false;
                });
                let six = timeData.filter(x => {
                    if (151 < x && x < 500) {
                        return x;
                    }
                    return false;
                });
                let seven = timeData.filter(x => {
                    if (501 < x) {
                        return x;
                    }
                    return false;
                });

                results[1].forEach(item => { // 下拉ecuid转换为16进制
                    item.ecuid = '0x' + Number(item.ecuid).toString(16).toUpperCase();
                    list.push(item);
                });

                data = {
                    interData: [
                        {
                            rate: one.length !== 0 ? ((max(one) - min(one))
                            !== 0 ? one.length / (max(one) - min(one)) : 0) : 0,
                            total: one.length
                        },
                        {
                            rate: two.length !== 0 ? ((max(two) - min(two))
                            !== 0 ? two.length / (max(two) - min(two)) : 0) : 0,
                            total: two.length
                        },
                        {
                            rate: three.length !== 0 ? ((max(three) - min(three))
                            !== 0 ? three.length / (max(three) - min(three)) : 0) : 0,
                            total: three.length
                        },
                        {
                            rate: four.length !== 0 ? ((max(four) - min(four))
                            !== 0 ? four.length / (max(four) - min(four)) : 0) : 0,
                            total: four.length
                        },
                        {
                            rate: five.length !== 0 ? ((max(five) - min(five))
                            !== 0 ? five.length / (max(five) - min(five)) : 0) : 0,
                            total: five.length
                        },
                        {
                            rate: six.length !== 0 ? ((max(six) - min(six))
                            !== 0 ? six.length / (max(six) - min(six)) : 0) : 0,
                            total: six.length
                        },
                        {
                            rate: seven.length !== 0 ? ((max(seven) - min(seven))
                            !== 0 ? seven.length / (max(seven) - min(seven)) : 0) : 0,
                            total: seven.length
                        }
                    ],
                    ecuidList: list
                };
            } else {
                let one = results[0][0];
                let two = results[1][0];
                let three = results[2][0];
                let four = results[3][0];
                let five = results[4][0];
                let six = results[5][0];
                let seven = results[6][0];

                results[7].forEach(item => { // 下拉ecuid转换为16进制
                    item.ecuid = '0x' + Number(item.ecuid).toString(16).toUpperCase();
                    list.push(item);
                });
                data = {
                    interData: [
                        {
                            rate: one.total !== 0 ? ((one.max - one.min)
                            !== 0 ? one.total / (one.max - one.min) : 0) : 0,
                            total: one.total
                        },
                        {
                            rate: two.total !== 0 ? ((two.max - two.min)
                            !== 0 ? two.total / (two.max - two.min) : 0) : 0,
                            total: two.total
                        },
                        {
                            rate: three.total !== 0 ? ((three.max - three.min)
                            !== 0 ? three.total / (three.max - three.min) : 0) : 0,
                            total: three.total
                        },
                        {
                            rate: four.total !== 0 ? ((four.max - four.min)
                            !== 0 ? four.total / (four.max - four.min) : 0) : 0,
                            total: four.total
                        },
                        {
                            rate: five.total !== 0 ? ((five.max - five.min)
                            !== 0 ? five.total / (five.max - five.min) : 0) : 0,
                            total: five.total
                        },
                        {
                            rate: six.total !== 0 ? ((six.max - six.min)
                            !== 0 ? six.total / (six.max - six.min) : 0) : 0,
                            total: six.total
                        },
                        {
                            rate: seven.total !== 0 ? ((seven.max - seven.min)
                            !== 0 ? seven.total / (seven.max - seven.min) : 0) : 0,
                            total: seven.total
                        }
                    ],
                    ecuidList: list
                };
            }

            return res.send(data);
        }

        if (type === 'per') { // 类型为per
            let result = {
                count: results.count // 总计
            };

            let ecuid = results.ecuid; // 当前页ecuid数组{total,ecuid}
            let ecuidData = results.ecuidData; // 当前页ecuid所有数据{ecuid,time}
            let ecuidList = results.ecuidList; // 下拉
            let data = [];
            let list = [];
            ecuid.forEach(item => { // ecuid 循环
                if (item.total === 1) { // 为1条数据时 默认所有值为0
                    item.ecuid = '0x' + Number(item.ecuid).toString(16).toUpperCase();
                    item.max = 0;
                    item.min = 0;
                    item.mean = 0;
                    item.std = 0;
                    if (canid !== '') {
                        item.one = 0;
                        item.two = 0;
                        item.three = 0;
                        item.four = 0;
                        item.five = 0;
                        item.six = 0;
                        item.seven = 0;
                    }
                } else { // 大于1条数据
                    let init = initArray(ecuidData, item);
                    if (canid !== 0) { // 有过滤条件 canid时
                        filterX(item, init);
                    }
                    item.ecuid = '0x' + Number(item.ecuid).toString(16).toUpperCase(); // ecuid转换为16进制
                    item.max = max(init); // 取最大值
                    item.min = min(init); // 取最小值
                    item.mean = parseInt(mean(init), 10); // 取整平均值
                    item.std = parseInt(standardDeviation(init), 10); // 取整标准差
                }
            });
            ecuidList.forEach(item => { // 下拉ecuid转化为16进制
                item.ecuid = '0x' + Number(item.ecuid).toString(16).toUpperCase();
                list.push(item);
            });
            result.ecuid = ecuid;
            result.ecuidList = list;
            return res.send(result);
        }

        if (type === 'byte') { // 类型为byte时
            let result = {
                count: results.count
            };

            let ecuid = results.ecuid; // 当前页ecuid数组{total,ecuid}
            let ecuidData = results.ecuidData; // 当前页ecuid所有数据{eciud,data}
            let ecuidList = results.ecuidList; // 下拉列表
            let data = [];
            let list = [];

            if (byte !== '' && canid !== '') { // 过滤条件canid byte都不为空时处理
                let str = '';
                if (ecuidData.length !== 0) { // 查询到数据时
                    ecuidData.forEach(item => { // 循环ecuid 处理data数据
                        let index = '';
                        let arr = item.data.split(',');
                        switch (Number(byte)) // 返回byte 位置 与正常数组相反 示例：byte=0, index=arr.length-1
                        {
                            case 0:
                                index = arr.length - 1;
                                break;
                            case 1:
                                index = arr.length - 2;
                                break;
                            case 2:
                                index = arr.length - 3;
                                break;
                            case 3:
                                index = arr.length - 4;
                                break;
                            case 4:
                                index = arr.length - 5;
                                break;
                            case 5:
                                index = arr.length - 6;
                                break;
                            case 6:
                                index = arr.length - 7;
                                break;
                            case 7:
                                index = arr.length - 8;
                                break;
                        }

                        if (index > 0 && item.dlc > index) { // 拼接在此条件中的数据
                            str += arr[index] + ',';
                        }
                    });
                    if (str === '') { // databyte为空时处理
                        ecuid[0].ecuid = '0x' + Number(ecuid[0].ecuid).toString(16).toUpperCase();
                        ecuid[0].max = '';
                        ecuid[0].min = '';
                        ecuid[0].mean = '';
                        ecuid[0].std = '';
                        ecuid[0].chunk = [{total: 0, first: '', last: ''}];
                    } else { // 不为空处理
                        let arr = str.substring(0, str.length - 1).split(','); // 分割数组
                        let newData = []; // 存放处理之后的值
                        arr.forEach(val => {
                            newData.push(parseInt(val, 16)); // 转换为16进制
                        });

                        ecuid[0].ecuid = '0x' + Number(ecuid[0].ecuid).toString(16).toUpperCase(); // ecuid转换为16进制
                        ecuid[0].max = '0x' + max(newData).toString(16).toUpperCase(); // 最大值转化为16进制
                        ecuid[0].min = '0x' + min(newData).toString(16).toUpperCase(); // 最小值转换为16进制
                        ecuid[0].mean = '0x' + parseInt(mean(newData), 10).toString(16).toUpperCase(); // 平均值转换为16进制
                        if (newData.length === 1) { // 当数组长度为1时标准差为数组第一条数据
                            ecuid[0].std = '0x' + newData[0].toString(16).toUpperCase();
                        } else {
                            ecuid[0].std = '0x' + parseInt(standardDeviation(newData), 10).toString(16).toUpperCase(); // 标准差转化为16进制
                        }
                        ecuid[0].chunk = []; // 分组
                        let sortArr = uniq(sortby(newData)); // 排序去重之后的新数组用于分组用
                        // let sortArr = [1,4,6,9]
                        if (sortArr.length <= 5) { // 当数组长度小于5时
                            let chunkArr = chunk(sortArr, 1); // 分组条件为1，即每组一条数据
                            chunkArr.forEach((item, index) => { // 循环设置每个数组的统计数据、初始值、截止值
                                if (index === chunkArr.length - 1) {
                                    return;
                                }
                                if (chunkArr.length === 1) { // 当数组长度为1时起始值和截止值为数值本身
                                    ecuid[0].chunk.push({
                                        total: 1, first: '0x' + item[0].toString(16).toUpperCase(),
                                        last: '0x' + item[0].toString(16).toUpperCase()
                                    });
                                } else { // 当数组长度为1时起始值为上一组数值，截止值为下一组数值
                                    ecuid[0].chunk.push({
                                        total: 1, first: '0x' + item[0].toString(16).toUpperCase(),
                                        last: '0x' + chunkArr[index + 1][0].toString(16).toUpperCase()
                                    });
                                }
                            });
                        }
                        let n = sortArr.length / 5; // 数组除以5，用于获取每组存放几条数值
                        if (sortArr.length > 5) { // 数组长度大于5
                            if (sortArr.length % 5 === 0) { // 数组取模5为0，均分为5组
                                let chunkArr = chunk(sortArr, n); // 均分数组
                                chunkArr.forEach((item, index) => { // 循环设置每个数组的统计数据、初始值、截止值
                                    if (index === chunkArr.length - 1) { // 到最后一个分组时 处理
                                        ecuid[0].chunk.push({
                                            total: n, first: '0x' + item[0].toString(16).toUpperCase(), // first:数组第一个值
                                            last: '0x' + chunkArr[index][item.length - 1].toString(16).toUpperCase()
                                        }); // last: 最后数组最后一个值
                                    } else {
                                        ecuid[0].chunk.push({
                                            total: n, first: '0x' + item[0].toString(16).toUpperCase(), // first:数组第一个值
                                            last: '0x' + chunkArr[index + 1][0].toString(16).toUpperCase()
                                        }); // last: 下一个数组第一个值
                                    }
                                });
                            } else { // 数组取模5不为0时
                                let mold = (sortArr.length % 5); // 获取取模值
                                let nArr = []; // 分组长度数组
                                for (let i = 0; i < 5; i++) { // 循环为5组
                                    if (i < mold) { // i 小于取模值
                                        nArr.push(Math.floor(n) + 1);  // n向下取整 + 1
                                    } else {
                                        nArr.push(Math.floor(n)); // n向下取整
                                    }
                                }
                                let chunkArr = [  // 分组
                                    sortArr.splice(0, nArr[0]),
                                    sortArr.splice(0, nArr[1]),
                                    sortArr.splice(0, nArr[2]),
                                    sortArr.splice(0, nArr[3]),
                                    sortArr.splice(0, nArr[4])
                                ];
                                chunkArr.forEach((item, index) => { // 循环5组
                                    if (index === chunkArr.length - 1) { // 最后一组
                                        ecuid[0].chunk.push({
                                            total: nArr[index],
                                            first: '0x' + item[0].toString(16).toUpperCase(), // first:数组第一个值
                                            last: '0x' + item[item.length - 1].toString(16).toUpperCase()
                                        }); // last: 数组最后一个值
                                    } else {
                                        ecuid[0].chunk.push({
                                            total: nArr[index],
                                            first: '0x' + item[0].toString(16).toUpperCase(), // first:数组第一个值
                                            last: '0x' + chunkArr[index + 1][0].toString(16).toUpperCase()
                                        }); // last: 下一个数组最后一个值
                                    }
                                });
                            }
                        }
                    }
                }
            } else if (byte !== '') {
                if (ecuidData.length !== 0) { // ecuid所有数据数组不为0时
                    ecuid.forEach(item => { // 循环
                        let str = ecuidJointData(ecuidData, item, byte);
                        let arr = str.substring(0, str.length - 1).split(','); // 分割数组
                        let newData = cutArrayHandle(arr); // 存放处理之后的值
                        if (newData.length === 0) {
                            item.ecuid = '0x' + item.ecuid.toString(16).toUpperCase(); // ecuid转换为16进制
                            item.max = '--';
                            item.min = '--';
                            item.mean = '--';
                            item.std = '--';
                        } else {
                            item.ecuid = '0x' + item.ecuid.toString(16).toUpperCase(); // ecuid转换为16进制
                            item.max = '0x' + max(newData).toString(16).toUpperCase(); // 最大值转换为16进制
                            item.min = '0x' + min(newData).toString(16).toUpperCase(); // 最小值转换为16进制
                            item.mean = '0x' + parseInt(mean(newData), 10).toString(16).toUpperCase(); // 平均值转换为16进制
                            if (newData.length === 1) {
                                item.std = '0x' + newData[0].toString(16).toUpperCase(); // 标准差转换为16进制
                            } else {
                                item.std = '0x' + parseInt(standardDeviation(newData), 10).toString(16).toUpperCase(); // 标准差转换为16进制
                            }
                        }
                    });
                }
            } else if (ecuidData.length !== 0) { // ecuid所有数据数组不为0时
                ecuid.forEach(item => { // 循环
                    changeData(ecuidData, item);
                });
            }

            ecuidList.forEach(item => { // 下拉ecuid转换为16进制
                item.ecuid = '0x' + Number(item.ecuid).toString(16).toUpperCase();
                list.push(item);
            });
            result.ecuid = ecuid;
            result.ecuidList = ecuidList;
            return res.send(result);
        }
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/downLogData', function (req, res, next) { // 分析数据下载
    let type = req.query.type; // 选择类型（vt,diff,raw）
    let logid = req.query.datalist;  // 选中数值id
    let parameter = {
        type,
        logid
    };
    if (type === 'vt') { // 类型为vt 时，
        let str = '';
        let data = '';
        let ecuidArr = JSON.parse(logid);
        ecuidArr.forEach(item => {  // 循环logid
            let ecuid = item.ecuid;
            str += parseInt(ecuid, 16) + ','; // 转换为16进制数值
            data += '\''+item.data.substring(1, item.data.length - 1).toString() + '\',';
            item.ecuid = ecuid;
        });
        parameter.logid = str.substring(0, str.length - 1);
        parameter.data = data.substring(0, data.length - 1);
    }
    let logname = '2_2_' + moment().format('X') + '.log'; // 下载日志名称
    let file = logFilePath + '/' + logname;
    // let file = onLineFiles + '/' + logname;
    Log.downLogData(parameter).then(results => {
        let str = '';
        let data = results[0];
        data.forEach(item => { // 循环数值
            item.ecuid = '0x' + parseInt(item.ecuid, 16);
            item.time = item.strTime;
            item.dlc = '0' + item.dlc;
            let s = JSON.stringify(item);
            if (sysName === 'win32' || sysName === 'win64') {
                str += s + '\r\n'; // window 下换行处理
            } else {
                str += s + '\n'; // 其他 下换行处理
            }
            delete item.id;
            delete item.logid;
            delete item.strTime;
        });
        return fsOperation.writeLog(file, str);
    }).then(results => {
        return res.send(logname);
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.get('/downReplayLog', function (req, res, next) { // 分析数据下载
    let name = req.query.name; // 日志名称
    let path = logFilePath + '/' + name; // 下载路径
    // let path = onLineFiles + '/' + name; // 下载路径
    return res.download(path);
});

router.get('/taskRunning', function (req, res, next) {
    let enterpriseid = req.session.user.enterpriseid;
    let type = 'can_c_replay';
    let parameter = {
        enterpriseid,
        type
    };

    Log.queryTaskRunning(parameter).then(results => {
        if (results.code === 400) {
            return res.send({code: 400, msg: '没有数据'});
        }
        let logReplayScan = results.scan;
        let task = results.task;
        logReplayScan.scanList = results.scanList;
        logReplayScan.parameter = JSON.parse(logReplayScan.parameter);
        logReplayScan.taskname = task.name;
        logReplayScan.taskTime = task.taskTime;
        logReplayScan.file = logFilePath + '/0_37_1530782409.log';

        readData.getFileData(logReplayScan.file).then(data => {
            let log = data.slice(-500, -1);
            logReplayScan.data = log;
            return res.send(logReplayScan);
        }).catch(err => {
            console.log(err);
            return res.send({code: 500, msg: '服务故障'});
        });
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/custom', function (req, res, next) {
    let userid = req.session.user.id;
    let enterpriseid = req.session.user.enterpriseid;
    let type = req.fields.type; // 选择类型（vt,diff,raw）
    let logid = req.fields.dataList;  // 选中数值id
    let parameter = {
        type,
        logid
    };
    if (type === 'vt') { // 类型为vt 时，
        let str = '';
        let data = '';
        let ecuidArr = JSON.parse(logid);
        ecuidArr.forEach(item => {  // 循环logid
            let ecuid = item.ecuid;
            str += parseInt(ecuid, 16) + ','; // 转换为16进制数值
            data += '\''+item.data.substring(1, item.data.length - 1).toString() + '\',';
            item.ecuid = ecuid;
        });
        parameter.logid = str.substring(0, str.length - 1);
        parameter.data = data.substring(0, data.length - 1);
    }
    const packetTotal = 100;
    Log.downLogData(parameter).then(results => {
        let customData = [];
        let customLen = results[0].length + results[1].length;
        let addLen = packetTotal - results[1].length;
        if (customLen > packetTotal) {
            return res.send({code: 400, msg: '最多可以添加100条数据，还可以添加' + addLen + '条'});
        }

        results[0].forEach(item => { // 循环数值处理成json格式数据
            delete item.id;
            delete item.logid;
            if (type === 'vt') { // 类型为vt时，
                vtEcuidHandle(logid, item, userid, enterpriseid, customData);
            } else {
                let json = {};
                json.canid = item.ecuid;
                json.timedelay = 20;
                json.data = item.data;
                json.userid = userid;
                json.enterpriseid = enterpriseid;
                customData.push(json);
            }
        });
        return Log.insertPacket(customData);
    }).then(results => {
        return res.send({code: 200, msg: '注入成功'});
    }).catch(err => {
        console.log(err);
        return res.send({code: 500, msg: '服务故障'});
    });
});

router.post('/replayTraffic', function (req, res, next) {
    let userid = req.session.user.id;
    let enterpriseid = req.session.user.enterpriseid;
    let changetype = req.fields.changetype;
    let type = req.fields.type;
    let logid = req.fields.dataList;
    let pages = req.fields.pages;
    let checkLogId = req.fields.id;
    let parameter = {
        type,
        logid,
        changetype,
        scantype: 'can_c_replay',
    };
    if (type === 'vt' && changetype === 'selected') { // 类型为vt并且selected 时，
        let str = '';
        let data = '';
        let ecuidArr = logid;
        ecuidArr.forEach(item => {  // 循环logid
            let ecuid = item.ecuid;
            str += parseInt(ecuid, 16) + ','; // 转换为10进制数值
            data += '\''+item.data.substring(1, item.data.length - 1).toString() + '\',';
            item.ecuid = ecuid;
        });
        parameter.logid = str.substring(0, str.length - 1);
        parameter.data = data.substring(0, data.length - 1);
    }
    let logname = '0_37_' + moment().format('X') + '.log'; // 时间戳
    let file = logFilePath + '/' + logname;
    // let file = onLineFiles + '/' + logname;
    Log.replayTraffic(parameter).then(result => {
        if (result.code === 400) {
            return res.send({code: 400, msg: result.msg});
        }
        let str = '';
        result.forEach(item => { // 循环数值
            item.time = item.strTime;
            item.id = '0x' + Number(item.ecuid).toString(16).toUpperCase();
            item.dlc = '0' + item.dlc;
            item.data = '[' + item.data + ']';
            delete item.strTime;
            delete item.ecuid;
            let data = {
                time: item.time,
                type: item.type,
                id: item.id,
                dlc: item.dlc,
                data: item.data
            }
            let s = JSON.stringify(data);
            if (sysName === 'win32' || sysName === 'win64') {
                str += s + '\r\n';
            } else {
                str += s + '\n'; // 其他 下换行处理
            }
        });
        return fsOperation.writeLog(file, str);
    }).then(result => {
        if (result.code === 200) {
            let data = {
                status: -1,
                diff: 1,
                userid,
                enterpriseid,
                taskParameter: '{"timeout": 0.03,"blacklist":10,"retry":0}',
                parameter: '{"interval": 0.02,"pages": ' + pages + ',"type": "' + type + '","id": "' + checkLogId
                    + '", "replayFilename": "' + logname + '"}',
                scantype: 'can_c_replay',
            };
            return Log.insertScanTask(data);
        }
    }).then(result => {
        return res.send({code: 200, msg: '回放成功'});
    }).catch(err => {
        console.log(err);
        return res.send({code: 400, msg: '回放失败'});
    });
});

function asciiHandle(asciiArr) {
    let asciiJson = {};
    let len = 0;
    let str = '';
    asciiArr.forEach(value => { // data分割为数组并转换为16进制
        let s = value.toString(16).toUpperCase();
        str += s + ',';
        len++;
    });
    asciiJson.str = str;
    asciiJson.len = len;
    return asciiJson;
}

function initArray(ecuidData, item) {
    let arr = [];
    ecuidData.forEach(value => { // 匹配ecuid
        if (value.ecuid === item.ecuid) {
            arr.push(Number(moment(value.time).format('X'))); // 格式化时间戳
        }
    });
    let newArr = sortby(arr, function (time) { // 按时间排序
        return time;
    });
    let init = [];

    newArr.forEach((item, index) => { // 相邻两数据相减
        if (index < newArr.length - 1) {
            init.push(newArr[index + 1] - newArr[index]); // 并插入数组中
        }
    });

    return init;
}

function filterX(item, init) {
    item.one = (init.filter(x => { // 7种格式阶段数据处理
        return x < 30;
    })).length;
    item.two = (init.filter(x => {
        if (31 < x && x < 60) {
            return x;
        }
        return false;
    })).length;
    item.three = (init.filter(x => {
        if (61 < x && x < 90) {
            return x;
        }
        return false;
    })).length;
    item.four = (init.filter(x => {
        if (91 < x && x < 120) {
            return x;
        }
        return false;
    })).length;
    item.five = (init.filter(x => {
        if (121 < x && x < 150) {
            return x;
        }
        return false;
    })).length;
    item.six = (init.filter(x => {
        if (151 < x && x < 500) {
            return x;
        }
        return false;
    })).length;
    item.seven = (init.filter(x => {
        if (501 < x) {
            return x;
        }
        return false;
    })).length;
}

function ecuidJointData(ecuidData, item, byte) {
    let str = '';
    ecuidData.forEach(value => { // 匹配ecuid并拼接data值
        let arr = value.data.split(',');
        let index = '';
        switch (Number(byte)) // 返回byte 位置 与正常数组相反 示例：byte=0, index=arr.length-1
        {
            case 0:
                index = arr.length - 1;
                break;
            case 1:
                index = arr.length - 2;
                break;
            case 2:
                index = arr.length - 3;
                break;
            case 3:
                index = arr.length - 4;
                break;
            case 4:
                index = arr.length - 5;
                break;
            case 5:
                index = arr.length - 6;
                break;
            case 6:
                index = arr.length - 7;
                break;
            case 7:
                index = arr.length - 8;
                break;
        }
        if (item.ecuid === value.ecuid) {
            if (index >= 0 && value.dlc > index) { // 拼接在此条件中的数据
                str += arr[index] + ',';
            } else if (index > value.dlc) {
                str += 'null,';
            }
        }
    });
    return str;
}

function cutArrayHandle(arr) {
    let newData = [];
    arr.forEach(val => {
        if (val !== '') {
            newData.push(parseInt(val, 16)); // 转换为16进制
        }
    });
    return newData;
}

function vtEcuidHandle(logid, item, userid, enterpriseid, customData) {
    let ecuidArr = JSON.parse(logid);
    ecuidArr.forEach(value => { // 循环处理对应数值
        let val = value.data;
        let data = val.substring(1, val.length - 1);
        let json = {};
        if (Number(item.ecuid) === parseInt(value.ecuid, 16) && data === item.data) {
            json.userid = userid;
            json.enterpriseid = enterpriseid;
            json.canid = item.ecuid;
            json.timedelay = 20;
            json.data = item.data;
            customData.push(json);
        }
    });
}

function changeData(ecuidData, item) {
    let str = '';
    ecuidData.forEach(value => { // 匹配ecuid并拼接data值
        if (item.ecuid === value.ecuid) {
            str += value.data + ',';
        }
    });

    let arr = str.substring(0, str.length - 1).split(','); // 分割数组
    let newData = []; // 存放处理之后的值
    arr.forEach(val => {
        newData.push(parseInt(val, 16)); // 转换为16进制
    });

    item.ecuid = '0x' + item.ecuid.toString(16).toUpperCase(); // ecuid转换为16进制
    item.max = '0x' + max(newData).toString(16).toUpperCase(); // 最大值转换为16进制
    item.min = '0x' + min(newData).toString(16).toUpperCase(); // 最小值转换为16进制
    item.mean = '0x' + parseInt(mean(newData), 10).toString(16).toUpperCase(); // 平均值转换为16进制
    item.std = '0x' + parseInt(standardDeviation(newData), 10).toString(16).toUpperCase(); // 标准差转换为16进制
}

module.exports = router;
