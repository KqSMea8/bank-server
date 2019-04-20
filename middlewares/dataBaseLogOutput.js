/**
 * @file 用于对数据连接失败、操作失败输出日志
 *
 */

const fs = require('fs');
const chalk = require('chalk');
const options = {
    flags: 'a',
    encoding: 'utf8'
};
const stdout = fs.createWriteStream('./logs/sqlErr.log', options);
const log = console.log;

module.exports = {
    errLogger(err) {
        const level = 'error';
        let errLog = null;
        let stack = err.stack.split('at ');
        let newStack = [];
        stack.forEach((line, index) => {
            if (index !== 0 && index !== 1 && index !== 2) {
                let str = line.replace(/^\s+|\s+$/g, '');
                let lineNum = str.match(/\d+/g);
                if (lineNum !== null) {
                    newStack.push(str);
                }
            }
        });

        if (err.fatal) {
            errLog = chalk.red(level) + ': [' +  formatTime() + ']--[' + newStack.join(';')
                + ']--[' + err.errno + ']--['
                + err.port + ']--[' + err.host + ']\r\n';
        } else {
            errLog = chalk.red(level)  + ': [' + formatTime() + ']--[' + newStack.join(';')
                + ']--[' + err.errno + ']--[' + err.sql
                + ']--[' + err.message + ']\r\n';
        }
        log(errLog);
        stdout.write(errLog);
    }
};

function formatTime() {
    let yy = new Date().getFullYear();
    let mm = new Date().getMonth() + 1;
    let dd = new Date().getDate();
    let h = new Date().getHours();
    let m = new Date().getMinutes();
    let s = new Date().getSeconds();
    let ms = new Date().getMilliseconds();
    let now = yy + '-' + mm + '-' + dd + ' ' + h + ':' + m + ':' + s + '.' + ms;

    return now;
}



