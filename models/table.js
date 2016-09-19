import Sequelize from 'sequelize';
import config from 'config';
let c = config.get('sequelize');
let sequelize = new Sequelize(c.db, c.user, c.password, c.options);
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
                type: this._Sequelize.BIGINT(11) ,
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
     * Sequelize
     * @private
     */
    static get _Sequelize() {
        return Sequelize;
    }

    /**
     * sequelizeの定義オブジェクト
     * @returns {Model}
     * @private
     */
    static get _sequelize() {
        let definition = definitionMap.get(this.table);
        if (definition === undefined) {
            definition = sequelize.define(this.table, this.schema);
            definitionMap.set(this.table, definition);
        }
        return definition;
    }

    /**
     * 主キーからモデル毎のユニークな文字列を作成する
     * @returns {string}
     */
    get implodeKey() {
        return this.constructor.primaryKeys.map(key => {
            return this._model[key];
        }).join(':');
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
            if (obj[key] === undefined) {
                throw new Error('主キー' + key + 'の値が指定されていない.');
            }
            options.where[key] = obj[key];
        }
        let model = await this._sequelize.findOne(options);
        return new this(model);
    }

    /**
     * 検索
     * @param options
     * @returns {Array.<Table>}
     */
    static async find(options = {}) {
        let modelList = await this._sequelize.findAll(options);
        return modelList.map(model => {
            return new this(model);
        })
    }

    /**
     * 1レコード検索
     * @param options
     * @returns {Array.<Table>}
     */
    static async findOne(options = {}) {
        let model = await this._sequelize.findOne(options);
        return new this(model);
    }

    /**
     * モデルを作成する
     * @param obj
     * @returns {Table}
     */
    static async create(obj) {
        let model = this._sequelize.build(obj);
        return new this(model);
    }

    /**
     * モデルをDBに保存する
     */
    async save() {
        await this._model.save();
    }

    /**
     * モデルのレコードを削除する
     */
    async destroy() {
        await this._model.destroy();
    }

    /**
     * テーブルを定義でリセットする
     */
    static async migrate() {
        await this._sequelize.sync({
            force: true
        });
    }

}

export default Table;