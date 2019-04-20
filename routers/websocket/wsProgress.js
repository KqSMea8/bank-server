/**
 * @file 用于请求执行任务的实时进度接口页面
 * 导入数据库查询文件socket
 * 定时请求数据库当前执行任务的进度数据
 *
 */
const WebSocket = require('ws');
const Task = require('../../models/task');

module.exports = function (wss) {
    wss.on('connection', function connection(ws) {
        let timer = null;
        ws.on('message', function incoming(message) { // 接收前台传递参数,message只能为string
            timer = setInterval(() => {
                Task.queryProgress().then(results => {
                    let str = {'progress': results};
                    str = JSON.stringify(str);
                    return ws.send(str);
                }).catch(err => {
                    console.log(err);
                    return ws.send({code: 500, msg: '服务故障'});
                });
            }, 200);
        });

        ws.on('error', () => {
            console.log('Errored Progress Websocket');
        });
        ws.on('close', () => {
            clearInterval(timer);
            console.log('Close Progress Websocket Connection');
        });
    });

    wss.on('error', err => {
        console.log('Errored Progress Websocket');
        console.log(err);
    });
};
