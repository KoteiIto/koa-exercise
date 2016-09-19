'use strict'

import Koa from 'koa';
import User from './models/tables/user';
import simpleAuth from './services/auth/simple';

const app = new Koa();

// エラー処理
app.use(async (ctx, next) => {
    try {
        await next();
    }
    catch(err) {
        ctx.status = err.status || 500;
        ctx.body = {
            message: err.message,
            error: err.stack
        };
    }
});

app.use(async (ctx, next) => {
    await simpleAuth.register({id: 10});
    await next();
});

app.use(async (ctx, next) => {
    // let user = await User.create({id: 1, name: 'foo'}, ctx);
    // await user.store(ctx);
    await next();
});

app.use(async (ctx, next) => {
    await User.filter({id: [300, 301, 302, 303, 250]}, ctx);
    let user1= await User.get({id: 300}, ctx);
    let user2 = await User.get({id: 301}, ctx);
    await user1.remove(ctx);
    user1 = await User.forge({id: 300, name: 'test'}, ctx);
    await user1.rename('hogehoge');
    await user2.store(ctx);
    await User.sync(ctx);
    await next();
});

app.use(async (ctx, next) => {
    await next();
});

// app.use(async (ctx, next) => {
//     let user = await User.findOne();
//     user.destroy();
//     await next();
// });

app.use(async (ctx, next) => {
    let world = 'World';
    ctx.body = `Hello ${world}`;
    await next();
});

app.listen(3000);
console.log('App listening on port 3000');