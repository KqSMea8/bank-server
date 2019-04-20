const WebSocket = require('ws');
const Socket = require('../../models/socket');

module.exports = function (wss) {
    wss.on('connection', function connection(ws) {
        let timer = null;
        let name = '';
        let parameter = {
            type: 'log_replay'
        }
        ws.on('message', function incoming(message) {
            let data = JSON.parse(message);
            if (typeof data === 'object') {
                if (data.name) {
                    name = data.name;
                    let c = 0;
                    Socket.queryLogReplay(parameter).then(results => {
                        if (results.code === 400) {
                            let msg = {
                                type: 'error',
                                id: 1,
                                name: name,
                                message: JSON.stringify({'status': -1})
                            };
                            ws.send(JSON.stringify(msg));
                        } else {
                            timer = setInterval(() => {
                                c++;
                                let msg = {
                                    type: 'error',
                                    id: 1,
                                    name: name,
                                    message: c + 'CANID has been replayed'
                                };
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
                    Socket.stopLogReplay(parameter).then(results => {
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

            // wss.clients.forEach((client) => {
            //   if (client !== ws && client.readyState === WebSocket.OPEN) {
            //     client.send(JSON.stringify({"message": message}))
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
