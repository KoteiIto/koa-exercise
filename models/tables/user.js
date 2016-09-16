import Table from '../table';

class User extends Table {
    static get table() {
        return 'user';
    }

    static get schema() {
        return {
            id: {
                type: this._Sequelize.BIGINT(11) ,
                primaryKey: true,
                autoIncrement: true,
            },
            name: {
                type: this._Sequelize.STRING(10),
                allowNull: false,
            },
            money: {
                type: this._Sequelize.BIGINT(11),
                defaultValue: 100,
            },
            energy: {
                type: this._Sequelize.BIGINT(11),
                defaultValue: 30,
            },
            inquest: {
                type: this._Sequelize.BOOLEAN,
                defaultValue: 0,
            }
        };
    }

    rename(name) {
        this._model.name = name;
    }
}

export default User;