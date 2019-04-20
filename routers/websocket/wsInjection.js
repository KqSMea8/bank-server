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
            type: 'can_injection',
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
                                id: 1,
                                name: name,
                                message: 'time: 2018-5-22 23:23:23 id=0X234 dlc=03 data=[00,23,24]'
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
            // wss.clients.forEach((client) => { //联调时使用，广播传输
            //   if (client !== ws && client.readyState === WebSocket.OPEN) {
            //     let data = JSON.parse(message)
            //     if(typeof data === "object"){
            //       if(data.type && !data.status) {
            //         data.type = "can_"+data.type
            //         Socket.queryScanning(data).then(results => {
            //           if(results.code === 400) {
            //             ws.send('{"status": -1}')
            //           } else {
            //             // ws.send(message)
            //             timer = setInterval(() => {
            //               ws.send("time: 2018-5-22 23:23:23 id=0X234 dlc=03 data=[00,23,24]")
            //             }, 200)
            //           }
            //         }).catch(err => {
            //           ws.send(err)
            //         })
            //       } else if(data.type && data.status === "stop") {
            //         data.type = "can_" + data.type
            //         Socket.stopScanning(data).then(results => {
            //           if(results.code === 400) {
            //             ws.send('{"status": -1}')
            //           } else {
            //             ws.close()
            //           }
            //         }).catch(err => {
            //           ws.send(err)
            //         })
            //       }
            //       if(data.note) {
            //         Socket.insertDetection(data).then(results => {
            //           let msg = data.note
            //           ws.send({code: 200, msg: "信息发送成功"})
            //         }).catch(err => {
            //           ws.send(err)
            //         })
            //       }
            //     }
            //     client.send(JSON.stringify({"message": message}))
            //   }
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
