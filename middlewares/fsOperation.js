const zlib = require('zlib'); // 压缩
const fs = require('fs'); // fs文件

module.exports = {
    writeLog(file, content) { // 创建日志文件并写入日志
        return new Promise((resolve, reject) => {
            fs.open(file, 'a+', 777, function (e, fd) {
                if (e) {
                    reject(e);
                }
                fs.write(fd, content, function (e) { // 写入数据
                    if (e) {
                        reject(e);
                    }
                    fs.closeSync(fd);
                    resolve({code: 200, msg: '操作成功'});
                });
            });
        });
    },
    zipFile(file, zlpFile) { // 压缩文件
        return new Promise((resolve, reject) => {
            let gzip = zlib.createGzip();
            let inp = fs.createReadStream(file);
            let out = fs.createWriteStream(zlpFile);
            inp.pipe(gzip).pipe(out);
            out.on('close', function () {
                resolve({code: 200, msg: '操作成功'});
            });
            out.on('error', function (err) {
                reject(err);
            });
        });
    },
    deleteLog(path) {
        return new Promise((resolve, reject) => {
            fs.unlink(path, function (err) {
                if (err) {
                    reject(err);
                }
                resolve({code: 200, msg: '删除成功'});
            });
        });
    }
};
