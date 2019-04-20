/**
 * @file 用于请求执行任务的实时进度接口页面
 * 导入数据库查询文件socket
 * 定时请求数据库当前执行任务的进度数据
 *
 */
const WebSocket = require('ws');
const Socket = require('../../models/socket');

module.exports = function (wss) {
    wss.on('connection', function connection(ws) {
        let timer = null;
        let name = '';
        let parameter = {
            type: 'can_fuzzing',
            taskid: 1
        };
        ws.on('message', function incoming(message) {
            let data = JSON.parse(message);
            if (typeof data === 'object') {
                if (data.name) {
                    name = data.name;
                    Socket.queryScanning(parameter).then(results => {
                        if (results.code === 400) {
                            let msg = {
                                type: 'error',
                                id: 1,
                                name: name,
                                message: JSON.stringify({'status': -1})
                            };
                            ws.send(JSON.stringify(msg));
                        } else {
                            let msg = {
                                type: 'success',
                                id: data.taskid,
                                name: name,
                                message: '{"time":1525239488.284346, "type":"s", "id":0x700, "dlc":08, '
                                    + '"data":[02, 10, 01, 00, 00, 00, 00, 00]}'
                            };
                            timer = setInterval(() => {
                                ws.send(JSON.stringify(msg));
                            }, 200);
                        }
                    }).catch(err => {
                        let msg = {
                            type: 'error',
                            id: 1,
                            name: name,
                            message: err
                        };
                        ws.send(JSON.stringify(msg));
                    });
                }
                if (data.status && data.status === 'stop') {
                    Socket.stopScanning(parameter).then(results => {
                        if (results.code === 400) {
                            let msg = {
                                type: 'error',
                                id: 1,
                                name: name,
                                message: JSON.stringify({'status': -1})
                            };
                            ws.send(JSON.stringify(msg));
                        } else {
                            ws.close();
                        }
                    }).catch(err => {
                        let msg = {
                            type: 'error',
                            id: 1,
                            name: name,
                            message: err
                        };
                        ws.send(JSON.stringify(msg));
                    });
                }
            }
            // wss.clients.forEach((client) => { // 联调时使用 广播处理
            //   if (client !== ws && client.readyState === WebSocket.OPEN) {
            //     client.send(JSON.stringify({'message': message}))
            //   }
            // })
        });

        ws.on('error', () => {
            console.log('Errored Fuzzing Websocket');
        });
        ws.on('close', () => {
            clearInterval(timer);
            console.log('Close Fuzzing Websocket Connection');
        });
    });

    wss.on('error', err => {
        console.log('Errored Fuzzing Websocket');
        console.log(err);
    });
};
