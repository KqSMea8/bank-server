/**
 * @file 用于实时任务进展接口页面
 * 引用ws模块输出日志数据
 * 导入数据库查询文件socket
 * sendUuid: 请发送当前执行任务实时结果数据
 * sendFile: 请求当前执行扫描项实时日志
 *
 */
const WebSocket = require('ws');
const Socket = require('../../models/socket');

module.exports = function (wss) {
    wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
            wss.clients.forEach(client => { // 联调时使用 广播处理
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        });

        ws.on('error', () => {
            console.log('Errored Scanning Websocket');
        });
        ws.on('close', () => {
            console.log('Close Scanning Websocket Connection');
        });
    });

    wss.on('error', err => {
        console.log('Errored Scanning Websocket');
        console.log(err);
    });
};
