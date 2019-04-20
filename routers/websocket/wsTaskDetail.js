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
        ws.on('message', message => {
            timer = setInterval(() => {
                let parameter = {id: message};
                Task.queryTaskScanRunning(parameter).then(results => {
                    let data = {'typelist': results};
                    data = JSON.stringify(data);
                    return ws.send(data);
                }).catch(err => {
                    console.log(err);
                    return ws.send({code: 500, msg: '服务故障'});
                });
            }, 200);
        });
        ws.on('error', () => {
            console.log('Errored TaskDetail Websocket');
        });
        ws.on('close', () => {
            clearInterval(timer);
            console.log('Close TaskDetail Websocket Connection');
        });
    });

    wss.on('error', err => {
        console.log('Errored TaskDetail Websocket');
        console.log(err);
    });
};
