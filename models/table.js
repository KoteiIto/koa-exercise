import Sequelize from 'sequelize';
import config from 'config';
let c = config.get('sequelize');
let sequelize = new Sequelize(c.db, c.user, c.password, c.options);

class Table {
    constructor(model = {}) {
        this._model = model;
    }

    /* Setter & Getter */
    static get table() {
        return 'table';
    }

    static get schema() {
        return {
            id: {
                type: this._Sequelize.BIGINT(11) ,
                primaryKey: true,
                autoIncrement: true,
            },
        };
    }

    static get primaryKeys() {
        let schema = this.schema;
        return Object.keys(schema).filter(field => {
            return schema[field].primaryKey === true;
        });
    }

    static get _Sequelize() {
        return Sequelize;
    }

    static get _sequelize() {
        return sequelize.define(this.table, this.schema);
    }

    /* Methods */

    /**
     * 主キーから検索を行う
     * 主キー以外の条件は無視する
     * @param obj 主キー名がキー、値をvalueにもつオブジェクト
     * @returns {Table}
     */
    static async get(obj) {
        let options = {where: {}};
        let primaryKeys = this.primaryKeys;
        for (let key of primaryKeys) {
            if (obj[key] === undefined) {
                throw new Error('主キー' + key + 'の値が指定されていない.');
            }
            options.where[key] = obj[key];
        }
        let model = await this._sequelize.findOne(options);
        return new this(model);
    }

    static async create(obj) {
        let model = this._sequelize.build(obj);
        return new this(model);
    }

    static async migrate() {
        return await this._sequelize.sync({
            force: true
        });
    }

    async save() {
        return await this._model.save();
    }
}

export default Table;