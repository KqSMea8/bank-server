/**
 * @file 用于server启动
 * 引用模块path、express、bodyParser、http、socket.io五个模块
 * config文件配置、routers请求路由地址模块包、package调用项目名称、
 * routers下socketIo、progress用于socket实时通讯路由；taskProgress、taskDetail用于实时请求接口
 *
 */

const events = require('events');
const path = require('path');
const url = require('url');
const express = require('express');
const session = require('express-session');
// const RedisStore = require('connect-redis')(session);
const winston = require('winston');
const expressWinston = require('express-winston-lxl');
const log4js = require('log4js');
const ws = require('ws');
const config = require('./config/config');
const routers = require('./routers');
const wsFuzzing = require('./routers/websocket/wsFuzzing');
const wsTest = require('./routers/websocket/wsScan');
const wsReplay = require('./routers/websocket/wsReplay');
const wsInjection = require('./routers/websocket/wsInjection');
const wsDetection = require('./routers/websocket/wsDetection');
const wsProgress = require('./routers/websocket/wsProgress');
const wsTaskDetail = require('./routers/websocket/wsTaskDetail');
const wsLogReplay = require('./routers/websocket/wsLogReplay');
const wsCommand = require('./routers/websocket/wsCommand');
const wsPrint = require('./routers/websocket/wsPrint');
const pkg = require('./package');
const app = express();

const eventEmitter = new events.EventEmitter();
const server = require('http').Server(app);

const wss0 = new ws.Server({noServer: true, clientTracking: true});
const wss1 = new ws.Server({noServer: true, clientTracking: true});
const wss2 = new ws.Server({noServer: true, clientTracking: true});
const wss3 = new ws.Server({noServer: true, clientTracking: true});
const wss4 = new ws.Server({noServer: true, clientTracking: true});
const wss5 = new ws.Server({noServer: true, clientTracking: true});
const wss6 = new ws.Server({noServer: true, clientTracking: true});
const wss7 = new ws.Server({noServer: true, clientTracking: true});
const wss8 = new ws.Server({noServer: true, clientTracking: true});
const wss9 = new ws.Server({noServer: true, clientTracking: true});

eventEmitter.setMaxListeners(0);

app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', 'localhost:8080');
    // res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, '
        + 'Accept, X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    return next();
});

// app.use(express.favicon());

app.use(express.static(path.join(__dirname, 'public')));
// app.use(history());
// app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    name: config.session.key, // 设置 cookie 中保存 session id 的字段名称
    secret: config.session.secret, // 通过设置 secret 来计算 hash 值并放在 cookie 中，使产生的 signedCookie 防篡改
    resave: false, // 强制更新 session
    saveUninitialized: true, // 设置为 false，强制创建一个 session，即使用户未登录
    cookie: {
        expires: new Date(Date.now() + 3600000),
        maxAge: config.session.maxAge// 过期时间，过期后 cookie 中的 session id 自动删除
    },
    rolling: true
    // store: new RedisStore({
    //     host: '127.0.0.1',
    //     port: 6379,
    //     logErrors: true
    // })
}));

app.use(require('express-formidable')({
    uploadDir: path.join(__dirname, './public/upload'),
    keepExtensions: true
}));

app.use(function (req, res, next) {
    req.session._garbage = Date();
    req.session.touch();
    next();
});

app.use(expressWinston.logger({ // 成功日志
    transports: [
        new (winston.transports.Console)({
            json: false,
            colorize: true
        }),
        new winston.transports.File({
            filename: 'logs/success.log'
        })
    ],
    meta: true,
    handleExceptions: true,
    expressFormat: false,
    colorize: true,
    requestWhitelist: ['url', 'headers', 'method', 'httpVersion', 'originalUrl', 'query', 'fields'],
    msg: '[{{req._startTime}}]--[{{res.req.sessionID}}]--[{{req.ip}}]--[{{req.headers}}]'
        + '--[{{req.originalUrl}}]--[{{req.query}}]--[{{req.fields}}]--[{{req.method}}]--[{{res.responseTime}}]'
        + ''
}));

routers(app); // 路由调用

app.use(expressWinston.errorLogger({ // 错误日志
    transports: [
        new winston.transports.Console({
            json: false,
            colorize: true
        }),
        new winston.transports.File({
            filename: 'logs/error.log'
        })
    ],
    meta: true,
    colorize: true,
    requestWhitelist: ['url', 'headers', 'method', 'httpVersion', 'originalUrl', 'query', 'fields'],
    msg: '[{{req._startTime}}]--[{{res.req.sessionID}}]--[{{req.ip}}]--[{{err.message}}]'
        + '--[{{meta.errCode}}]--[{{req.headers}}]--[{{req.originalUrl}}]--[{{req.query}}]'
        + '--[{{req.fields}}]--[{{req.method}}]--[{{res.responseTime}}]'
}));

wsTest(wss0);
wsReplay(wss1);
wsFuzzing(wss2);
wsInjection(wss3);
wsDetection(wss4);
wsProgress(wss5);
wsTaskDetail(wss6);
wsLogReplay(wss7);
wsCommand(wss8);
wsPrint(wss9);

server.on('upgrade', function upgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname;
    if (pathname === '/replay') {
        wss1.handleUpgrade(request, socket, head, function done(ws) {
            wss1.emit('connection', ws);
        });
    } else if (pathname === '/fuzzing') {
        wss2.handleUpgrade(request, socket, head, function done(ws) {
            wss2.emit('connection', ws);
        });
    } else if (pathname === '/injection') {
        wss3.handleUpgrade(request, socket, head, function done(ws) {
            wss3.emit('connection', ws);
        });
    } else if (pathname === '/detection') {
        wss4.handleUpgrade(request, socket, head, function done(ws) {
            wss4.emit('connection', ws);
        });
    } else if (pathname === '/progress') {
        wss5.handleUpgrade(request, socket, head, function done(ws) {
            wss5.emit('connection', ws);
        });
    } else if (pathname === '/taskDetail') {
        wss6.handleUpgrade(request, socket, head, function done(ws) {
            wss6.emit('connection', ws);
        });
    } else if (pathname === '/logReplay') {
        wss7.handleUpgrade(request, socket, head, function done(ws) {
            wss7.emit('connection', ws);
        });
    } else if (pathname === '/scanning') {
        wss0.handleUpgrade(request, socket, head, function done(ws) {
            wss0.emit('connection', ws);
        });
    } else if (pathname === '/print') {
        wss9.handleUpgrade(request, socket, head, function done(ws) {
            wss9.emit('connection', ws);
        });
    } else if (pathname === '/command') {
        wss8.handleUpgrade(request, socket, head, function done(ws) {
            wss8.emit('connection', ws);
        });
    } else {
        socket.destroy();
    }
});

// process.on('warning', e => {
//     console.log(e);
// });

// process.on('uncaughtException', function (err) {
//     console.log(err);
//     console.log(err.stack);
// });

server.on('error', function (err) {
    console.log(err);
});

server.listen(config.port, {origins: '*:*'}, function () {
    console.log(`${pkg.name} listening on port ${config.port}`);
});

