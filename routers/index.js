/**
 * @file 后台路由管理
 *
 */

module.exports = function (app) {
    app.use('/login', require('./login'));
    app.use('/log', require('./log'));
    app.use('/policy', require('./policy'));
    app.use('/task', require('./task'));
    app.use('/result', require('./result'));
    app.use('/price', require('./price'));
    app.use('/custom', require('./custom'));
    app.use('/user', require('./user'));
    app.use('/setResult', require('./setResult'));
};
