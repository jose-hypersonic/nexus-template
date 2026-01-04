const { Sequelize, DataTypes, Op } = require("sequelize");

let sequelize = null;
const models = {};

async function connect(config, source) {
    try {
        sequelize = new Sequelize(
            config.database,
            config.username,
            config.password,
            {
                host: config.host,
                port: config.port || (config.dialect === "postgres" ? 5432 : 3306),
                dialect: config.dialect || "mariadb",
                logging: false
            }
        );

        await sequelize.authenticate();
        return true;
    } catch (e) {
        const resolvedSource =
            source === undefined ? "undefined (not provided)" : source;

        console.log(
            `[LogNexus][Error]: Failed to authenticate database. Source -> ${resolvedSource}`
        );
        console.error(e)
        console.log(JSON.stringify(config))
        return false;
    }
}


async function disconnect() {
    if (!sequelize) return;
    await sequelize.close();
    sequelize = null;
}

async function listTables() {
    const tables = await sequelize.getQueryInterface().showAllTables();
    return tables.map(t => typeof t === "string" ? t : Object.values(t)[0]);
}

function defineModel(name, schema, options = {}) {
    const model = sequelize.define(
        name,
        schema,
        { timestamps: false, ...options }
    );
    models[name] = model;
    return model;
}

async function sync(force = false) {
    await sequelize.sync({ force });
}

async function create(model, data) {
    return await models[model].create(data);
}

async function findOne(model, where) {
    return await models[model].findOne({ where });
}

async function findAll(model, where = {}, options = {}) {
    return await models[model].findAll({ where, ...options });
}

async function update(model, values, where) {
    return await models[model].update(values, { where });
}

async function remove(model, where) {
    return await models[model].destroy({ where });
}

async function raw(sql, replacements = {}) {
    const [rows] = await sequelize.query(sql, { replacements, raw: true });
    return rows;
}

module.exports = {
    connect,
    disconnect,
    listTables,
    defineModel,
    sync,
    create,
    findOne,
    findAll,
    update,
    remove,
    raw,
    DataTypes,
    Op
};
