'use strict';

import Random from '../../utils/random';

const PRIVATE = Symbol();
const TOKEN_LENGTH = 10;

/**
 * Nodejsのメモリ上にtokenを保存して、認証を行う
 */
class SimpleAuth {
    constructor() {
        this[PRIVATE] = new Map();
    }

    async register({id}) {
        let token = Random.getString(TOKEN_LENGTH);
        this[PRIVATE].set(token, id);
        return token;
    }

    async check({id, token}) {
        return this[PRIVATE].get(token) === id;
    }
}

export default new SimpleAuth();