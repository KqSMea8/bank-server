/**
* @file 项目基础配置
* mysql配置:
*   hsot、user、password、database
* host：
*   端口
* session:
*   secret,key,maxAge
*/

module.exports = {
    mysql: {
        multipleStatements: true,
        host: 'cp01-adu-wangmingwei.epc.baidu.com', // 公共数据库
        user: 'canscan',
        password: 'canscan_password',
        database: 'canscan2',
        port: 8306
    },
    // mysql: {
    //   multipleStatements: true,
    //   host: 'localhost', // 公共数据库
    //   user: 'root',
    //   password: 'apollo',
    //   database: 'canscan2'
    // },
    port: 3000,
    // port: 8080, // 正式端口号
    session: {
        secret: 'canScan',
        key: 'canScan',
        maxAge: 2592000000
    },
    logFiles: './public/log',
    onLineFiles: '/home/zsh/log'
};
