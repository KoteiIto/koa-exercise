import Sequelize from 'sequelize';
import config from 'config';
let c = config.get('sequelize');
let connection = new Sequelize(c.db, c.user, c.password, c.options);
let definitionMap = new Map();

/**
 * CRUDを提供するテーブルのモデルのクラス
 */
class Table {
    constructor(model = {}) {
        this._model = model;
    }

    /**
     * テーブル名
     * @returns {string}
     */
    static get table() {
        return 'table';
    }

    /**
     * テーブル定義
     * @returns {Object}
     */
    static get schema() {
        return {
            id: {
                type: this.Sequelize.BIGINT(11) ,
                primaryKey: true,
                autoIncrement: true,
            },
        };
    }

    /**
     * 主キーの配列
     * @returns {Array.<*>}
     */
    static get primaryKeys() {
        let schema = this.schema;
        return Object.keys(schema).filter(field => {
            return schema[field].primaryKey === true;
        });
    }

    /**
     * Sequelizeのモジュール
     * @constructor
     */
    static get Sequelize() {
        return Sequelize;
    }

    /**
     * sequelizeのモデル
     * @returns {Model}
     */
    static get sequelize() {
        let definition = definitionMap.get(this.table);
        if (definition === undefined) {
            definition = connection.define(this.table, this.schema);
            definitionMap.set(this.table, definition);
        }
        return definition;
    }

    /**
     * 主キーからモデル毎のユニークな文字列を取得する
     * @returns {string}
     */
    get uniqueKey() {
        return this.constructor.generateUniqueKey(this._model);
    }

    /**
     * モデルからユニークな文字列を作成する
     * @param model
     * @returns {string}
     */
    static generateUniqueKey(model) {
        return this.primaryKeys.map(key => {
            let value = model[key];
            if (value === undefined) throw new Error('主キー' + key + 'の値が指定されていない.');
            return value;
        }).join(':');
    }

    /**
     * 2つのモデルのフィールドをマージする
     * 破壊的なメソッド
     * @param baseModel
     * @param mergeModel
     */
    static mergeModel(baseModel, mergeModel) {
        let schema = this.schema;
        Object.keys(schema).forEach(field => {
            baseModel[field] = mergeModel[field];
        });
    }

    /**
     * 主キーから検索を行う
     * 主キー以外の条件は無視する
     * @param obj 主キー名がキー、値をvalueにもつオブジェクト
     * @returns {Table}
     */
    static async get(obj) {
        let options = {where: {}};
        for (let key of this.primaryKeys) {
            if (obj[key] === undefined) throw new Error('主キー' + key + 'の値が指定されていない.');
            options.where[key] = obj[key];
        }
        let model = await this.sequelize.findOne(options);
        if (model === null) return null;
        return new this(model);
    }

    /**
     * 検索
     * @param options
     * @returns {Array.<Table>}
     */
    static async find(options = {}) {
        let modelList = await this.sequelize.findAll(options);
        return modelList.map(model => {
            return new this(model);
        })
    }

    /**
     * 1レコード検索
     * @param options
     * @returns {Table}
     */
    static async findOne(options = {}) {
        let model = await this.sequelize.findOne(options);
        if (model === null) return null;
        return new this(model);
    }

    /**
     * モデルを作成する
     * @param obj
     * @returns {Table}
     */
    static async create(obj) {
        let model = this.sequelize.build(obj);
        return new this(model);
    }

    /**
     * フィールドの値を取得する
     * @param field
     */
    get(field) {
        return this._model[field];
    }

    /**
     * モデルをDBに保存する
     * @param options
     */
    async save(options = {}) {
        await this._model.save(options);
    }

    /**
     * モデルのレコードを削除する
     * @param options
     */
    async destroy(options = {}) {
        await this._model.destroy(options);
    }

    /**
     * テーブルを定義でリセットする
     */
    static async migrate() {
        await this.sequelize.sync({
            force: true
        });
    }

}

export default Table;