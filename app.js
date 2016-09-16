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
    await simpleAuth.register(10);
    await next();
});

app.use(async (ctx, next) => {
    let user = await User.create({name: 'foo'});
    await user.save();
    await next();
});

app.use(async (ctx, next) => {
    let user = await User.get({id: 1});
    user.rename('hoge');
    await user.save();
    await next();
});

app.use(async (ctx, next) => {
    let world = 'World';
    ctx.body = `Hello ${world}`;
    await next();
});

app.listen(3000);
console.log('App listening on port 3000');