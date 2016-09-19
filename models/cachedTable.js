import Table from './table';

const TABLE_CACHE_MAP_KEY = '_tableCacheMap';
const TYPE_SELECT = 'SELECT';
const TYPE_UPDATE = 'UPDATE';
const TYPE_DELETE = 'DELETE';

/**
 * リクエスト毎にSELECT, UPDATE, DELETEしたレコードのモデルをキャッシュする
 * UPDATEとDELETEは
 */
class CachedTable extends Table {

    /**
     * 主キーから検索を行う
     * 主キー以外の条件は無視する
     * キャッシュがある場合はキャッシュから返却する
     * @param obj
     * @param ctx
     * @returns {CachedTable}
     */
    static async get(obj, ctx) {
        let uniqueKey = this.generateUniqueKey(obj);
        // DELETEのキャッシュにある場合は存在しないとする
        if (await this._getFromCache(TYPE_DELETE, uniqueKey, ctx) !== null) return null;

        // SELECTのキャッシュにモデルがある場合はキャッシュを返却する
        let cacheModel = await this._getFromCache(TYPE_SELECT, uniqueKey, ctx);
        if (cacheModel !== null) return cacheModel;

        // キャッシュにない場合はDBから取得する
        cacheModel = await super.get(obj);

        // DBにない場合はキャッシュせずに返却
        if (cacheModel === null) return cacheModel;

        // キャッシュして返却
        await this._setToCache(TYPE_SELECT, cacheModel, ctx);
        return cacheModel;
    }

    /**
     * whereの条件をしていしてモデルを検索する
     * キャッシュに存在する場合はキャッシュが優先して返却
     * キャッシュに存在しない場合はキャッシュされる
     * @param obj whereの条件
     * @param ctx
     * @returns {Array.<CacheTable>}
     */
    static async filter(obj, ctx) {
        let options = {where: obj};
        let cacheModelList = await this.find(options);

        // キャッシュの状態と合わせる
        let selectCacheMap = await this._getCacheMap(TYPE_SELECT, ctx);
        let deleteCacheMap = await this._getCacheMap(TYPE_DELETE, ctx);
        return cacheModelList.map(cacheModel => {
            // DELETEキャッシュに存在するモデルを省く
            let uniqueKey = cacheModel.uniqueKey;
            if (deleteCacheMap.has(uniqueKey)) return null;

            // SELECTキャッシュに存在するモデルはキャッシュを優先
            let selectCacheModel = selectCacheMap.get(uniqueKey);
            if (selectCacheModel !== undefined) return selectCacheModel;

            // SELECTキャッシュにキャッシュする
            selectCacheMap.set(uniqueKey, cacheModel);
            return cacheModel;
        }).filter(cacheModel => {
            return cacheModel !== null
        });
    }

    /**
     * モデルを作成して、追加の登録を行う
     * @param obj
     * @param ctx
     */
    static async forge(obj, ctx) {
        let uniqueKey = this.generateUniqueKey(obj);
        let newCacheModel = await super.create(obj);

        // DELETEキャッシュにある場合は、UPDATEキャッシュに移動させる
        let cacheModel = await this._getFromCache(TYPE_DELETE, uniqueKey, ctx);
        if (cacheModel !== null) {
            this.mergeModel(cacheModel._model, newCacheModel._model);
            await this._deleteFromCache(TYPE_DELETE, uniqueKey, ctx);
            await cacheModel.store(ctx);
            return cacheModel;
        }

        // DELETEキャッシュにないかつSELECTキャッシュにある場合はDeplicate Keyになるためエラー
        if (await this._getFromCache(TYPE_SELECT, uniqueKey, ctx) !== null) throw new Error('存在するモデルです.uniqKey=' + uniqueKey);

        // SELECTとUPDATEキャッシュに保存する
        await newCacheModel.store(ctx);
        return newCacheModel;
    }

    /**
     * モデルからUPDATEを更新を登録する
     * @param ctx
     */
    async store(ctx) {
        // DELETEキャッシュに存在する場合に更新登録するのはロジックがおかしいためエラー
        if (await this.constructor._getFromCache(TYPE_DELETE, this.uniqueKey, ctx) !== null) throw new Error('既に削除されたモデルです.uniqKey=' + this.uniqueKey);

        // モデルの値に不正がないかチェック
        let result = await this._model.validate();
        if (result != null) throw new Error(result.message);

        // SELECTとUPDATEキャッシュに保存
        await this.constructor._setToCache(TYPE_SELECT, this, ctx);
        await this.constructor._setToCache(TYPE_UPDATE, this, ctx);
    }

    /**
     * モデルからDELETEを登録する
     * @param ctx
     */
    async remove(ctx) {
        // 削除キャッシュに保存して更新キャッシュから削除
        await this.constructor._setToCache(TYPE_DELETE, this, ctx);
        await this.constructor._deleteFromCache(TYPE_UPDATE, this.uniqueKey, ctx);
    }

    /**
     * キャッシュをDBに反映させる
     * キャッシュをクリアする
     * @param ctx
     * @param allTalbe
     */
    static async sync(ctx, allTalbe = true) {
        let tableCacheMap = ctx[TABLE_CACHE_MAP_KEY];
        let promiseList = [];
        for (let [tableName, recordCacheMap] of tableCacheMap) {
            if (allTalbe === false && tableName !== this.table) continue;
            for (let [type, cacheMap] of recordCacheMap) {
                switch (type) {
                    case TYPE_UPDATE:
                        for (let cacheModel of cacheMap.values()) {
                            promiseList.push(cacheModel.save());
                        }
                        break;
                    case TYPE_DELETE:
                        for (let cacheModel of cacheMap.values()) {
                            promiseList.push(cacheModel.destroy());
                        }
                        break;
                }
            }
        }
        await this.clearCache(ctx, allTalbe);
        await Promise.all(promiseList);
    }

    /**
     * キャッシュをクリアする
     * @param ctx
     * @param allTalbe
     */
    static async clearCache(ctx, allTalbe = true) {
        let tableCacheMap = ctx[TABLE_CACHE_MAP_KEY];
        for (let [tableName, recordCacheMap] of tableCacheMap) {
            if (allTalbe === false && tableName !== this.table) continue;
            for (let cacheMap of recordCacheMap.values()) {
                cacheMap.clear();
            }
        }
    }

    /**
     * キャッシュにモデルを登録する
     * @param type
     * @param cacheModel
     * @param ctx
     * @private
     */
    static async _setToCache(type, cacheModel, ctx) {
        // 各テーブルのキャッシュを行うMapを取得する
        let tableCacheMap = ctx[TABLE_CACHE_MAP_KEY];
        if (tableCacheMap === undefined) {
            tableCacheMap = new Map();
            ctx._tableCacheMap = tableCacheMap;
        }

        // 各レコードのキャッシュを行うMapを取得する
        let recordCacheMap = tableCacheMap.get(this.table);
        if (recordCacheMap === undefined) {
            recordCacheMap = new Map();
            tableCacheMap.set(this.table, recordCacheMap);
        }

        // typeのキャッシュのMapを取得する
        let cacheMap = recordCacheMap.get(type);
        if (cacheMap === undefined) {
            cacheMap = new Map();
            recordCacheMap.set(type, cacheMap);
        }
        cacheMap.set(cacheModel.uniqueKey, cacheModel);
    }

    /**
     * キャッシュからモデルを取得する
     * @param type
     * @param uniqueKey
     * @param ctx
     * @returns {*}
     * @private
     */
    static async _getFromCache(type, uniqueKey, ctx) {
        // 各テーブルのキャッシュを行うMapを取得する
        let tableCacheMap = ctx[TABLE_CACHE_MAP_KEY];
        if (tableCacheMap === undefined) return null;

        // 各レコードのキャッシュを行うMapを取得する
        let recordCacheMap = tableCacheMap.get(this.table);
        if (recordCacheMap === undefined) return null;

        // TYPEのキャッシュのMapを取得する
        let cacheMap = recordCacheMap.get(type);
        if (cacheMap === undefined) return null;
        return cacheMap.get(uniqueKey) || null;
    }

    /**
     * キャッシュからモデルを削除する
     * @param type
     * @param uniqueKey
     * @param ctx
     * @private
     */
    static async _deleteFromCache(type, uniqueKey, ctx) {
        // 各テーブルのキャッシュを行うMapを取得する
        let tableCacheMap = ctx[TABLE_CACHE_MAP_KEY];
        if (tableCacheMap === undefined) return;

        // 各レコードのキャッシュを行うMapを取得する
        let recordCacheMap = tableCacheMap.get(this.table);
        if (recordCacheMap === undefined) return;

        // typeのキャッシュのMapを取得する
        let cacheMap = recordCacheMap.get(type);
        if (cacheMap === undefined) return;
        cacheMap.delete(uniqueKey);
    }


    /**
     * キャッシュを取得する
     * @param type
     * @param ctx
     * @returns {Map}
     * @private
     */
    static async _getCacheMap(type, ctx) {
        // 各テーブルのキャッシュを行うMapを取得する
        let tableCacheMap = ctx[TABLE_CACHE_MAP_KEY];
        if (tableCacheMap === undefined) {
            tableCacheMap = new Map();
            ctx._tableCacheMap = tableCacheMap;
        }

        // 各レコードのキャッシュを行うMapを取得する
        let recordCacheMap = tableCacheMap.get(this.table);
        if (recordCacheMap === undefined) {
            recordCacheMap = new Map();
            tableCacheMap.set(this.table, recordCacheMap);
        }

        // typeのキャッシュのMapを取得する
        let cacheMap = recordCacheMap.get(type);
        if (cacheMap === undefined) {
            cacheMap = new Map();
            recordCacheMap.set(type, cacheMap);
        }
        return cacheMap;
    }
}

export default CachedTable;