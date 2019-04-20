const readline = require('readline');
const fs = require('fs');
const moment = require('moment');
const Log = require('../models/log');
const logFilePath = require('../config/config').logFiles;
const onLineFiles = require('../config/config').onLineFiles;

module.exports = {
    getData(files, parameter) {
        return new Promise((resolve, reject) => {
            let filename = [];
            let fileData = [];
            let logID = parameter.logId.split(',');
            files.forEach(item => {
                let name = logFilePath + '/' + item.name;
                // let name = onLineFiles + '/' + item.name;
                filename.push(name);
            });
            let data = [];

            function askAge(file, logid) {
                let rl = readline.createInterface({
                    input: fs.createReadStream(file),
                    crlfDelay: Infinity
                });
                return new Promise(resolve => {
                    rl.on('line', line => {
                        let str = line.replace('[', '').replace(']', '');
                        str = eval('(' + str + ')');
                        str.id = parseInt(str.id, 16);
                        str.logid = logid;
                        str.strTime = str.time;
                        str.time = moment(Number(str.time)).format('YYYY-MM-DD HH:mm:ss');
                        str.data = str.data.split(',');
                        data.push(str);
                    }).on('close', dataLine => {
                        resolve(data);
                    }).on('error', err => {
                        reject(err);
                    });
                });
            }

            if (Array.isArray(filename)) {
                filename.forEach((item, index) => {
                    let logid = Number(logID[index]);
                    fileData.push(askAge(item, logid));
                });
            }

            Promise.all(fileData).then(() => {
                parameter.data = data;
                Log.changeLog(parameter).then(res => {
                    resolve(res);
                }).catch(err => {
                    reject(err);
                });
            });
        });
    },
    getFileData(file) {
        return new Promise((resolve, reject) => {
            let data = [];
            let rl = readline.createInterface({
                input: fs.createReadStream(file),
                crlfDelay: Infinity
            });
            rl.on('line', line => {
                data.push(line);
            }).on('close', dataLine => {
                resolve(data);
            }).on('error', err => {
                reject(err);
            });
        });
    }
};
