import CacheTable from '../cachedTable';

class User extends CacheTable {
    static get table() {
        return 'user';
    }

    static get schema() {
        return {
            id: {
                type: this.Sequelize.BIGINT(20) ,
                primaryKey: true,
                autoIncrement: true,
            },
            name: {
                type: this.Sequelize.STRING(10),
                allowNull: false,
            },
            money: {
                type: this.Sequelize.BIGINT(20),
                defaultValue: 100,
            },
            energy: {
                type: this.Sequelize.BIGINT(20),
                defaultValue: 30,
            },
            inquest: {
                type: this.Sequelize.BOOLEAN,
                defaultValue: 0,
            }
        };
    }

    async rename(name) {
        this._model.name = name;
    }
}

export default User;