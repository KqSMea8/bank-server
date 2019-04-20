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
        let timer = null;
        let name = '';
        let parameter = {
            type: 'can_replay'
        };
        ws.on('message', function incoming(message) {
            let data = JSON.parse(message);
            if (typeof data === 'object') {
                if (data.name) {
                    name = data.name;
                    parameter.taskid = data.taskid;
                    Socket.queryScanning(parameter).then(results => {
                        if (results.code !== 400) {
                            let msg = {
                                type: 'success',
                                id: data.taskid,
                                name: name,
                                message: {'time': 1525239488.284346, 'type':'s', 'id':'0x700', 'dlc': '08',
                                    'data':'[02, 10, 01, 00, 00, 00, 00, 00]'}
                            };
                            timer = setInterval(() => {
                                ws.send(JSON.stringify(msg));
                            }, 200);
                        }
                    }).catch(err => {
                        let msg = {
                            type: 'error',
                            id: data.taskid,
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
                                id: data.taskid,
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
                            id: data.taskid,
                            name: name,
                            message: err
                        };
                        ws.send(JSON.stringify(msg));
                    });
                }
            }
            // wss.clients.forEach(client => { // 联调时使用，广播传输
            //     if (client !== ws && client.readyState === WebSocket.OPEN) {
            //         let data = JSON.parse(message);
            //         if (typeof data === 'object') {
            //             if (data.name) {
            //                 name = data.name;
            //                 parameter.taskid = data.taskid;
            //                 Socket.queryScanning(parameter).then(results => {
            //                     if (results.code === 400) {
            //                         let msg = {
            //                             type: 'error',
            //                             id: data.taskid,
            //                             name: name,
            //                             message: JSON.stringify({'status': -1})
            //                         };
            //                         client.send(JSON.stringify(msg));
            //                     } else {
            //                         let msg = {
            //                             type: 'success',
            //                             id: data.taskid,
            //                             name: name,
            //                             message: '{"time":1525239488.284346, "type":"s", "id":0x700, "dlc":08, '
            //                                 + '"data":[02, 10, 01, 00, 00, 00, 00, 00]}'
            //                         };
            //                         timer = setInterval(() => {
            //                             client.send(JSON.stringify(msg));
            //                         }, 200);
            //                     }
            //                 }).catch(err => {
            //                     let msg = {
            //                         type: 'error',
            //                         id: data.taskid,
            //                         name: name,
            //                         message: err
            //                     };
            //                     client.send(JSON.stringify(msg));
            //                 });
            //             }
            //             if (data.status && data.status === 'stop') {
            //                 Socket.stopScanning(parameter).then(results => {
            //                     if (results.code === 400) {
            //                         let msg = {
            //                             type: 'error',
            //                             id: data.taskid,
            //                             name: name,
            //                             message: JSON.stringify({'status': -1})
            //                         };
            //                         client.send(JSON.stringify(msg));
            //                     } else {
            //                         client.close();
            //                     }
            //                 }).catch(err => {
            //                     let msg = {
            //                         type: 'error',
            //                         id: data.taskid,
            //                         name: name,
            //                         message: err
            //                     };
            //                     client.send(JSON.stringify(msg));
            //                 });
            //             }
            //         }
            //         client.send(JSON.stringify({"message": message}))
            //     }
            // })
        });

        ws.on('error', () => {
            ws.send('asd');
            console.log('Errored Scanning Websocket');
        });
        ws.on('close', () => {
            clearInterval(timer);
            console.log('Close Scanning Websocket Connection');
        });
    });

    wss.on('error', err => {
        console.log('Errored Scanning Websocket');
        console.log(err);
    });
};
