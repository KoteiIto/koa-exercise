'use strict';

import Random from '../../utils/random';

const PRIVATE = Symbol();
const TOKEN_LENGTH = 10;

/**
 * Nodejsのメモリ上にtokenを保存して、認証を行う
 */
class SimpleAuth {
    constructor() {
        this[PRIVATE] = new Map(); //他のmoduleに公開しないためにSymbolをキーにする
    }

    /**
     * ユーザIDに対応するトークンを返却する
     * @param userId ユーザID
     * @returns {string} トークン
     */
    async register(userId) {
        let token = Random.getString(TOKEN_LENGTH);
        this[PRIVATE][userId] = token;
        return token;
    }

    /**
     * ユーザIDとTokenが一致しているかチェックする
     * @param userId
     * @param token
     * @returns {boolean}
     */
    async check(userId, token) {
        return this[PRIVATE][userId] === token;
    }
}

export default new SimpleAuth();