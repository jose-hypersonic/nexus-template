const fs = require('fs');
const path = require('path');

let dbConfig = null;
const registeredModels = [];
let connectionPromise = null;

function loadConfig() {
    try {
        const configPath = path.resolve(__dirname, '../config.hx');
        if (!fs.existsSync(configPath)) {
            return null;
        }

        const content = fs.readFileSync(configPath, 'utf8');
        const config = {};
        const lines = content.split('\n');

        for (const line of lines) {
            const match = line.match(/set\s+(\w+)\s+"([^"]+)"/);
            if (match) {
                config[match[1]] = match[2];
            }
        }
        return config;
    } catch (err) {
        return null;
    }
}

async function initializeDatabase() {
    if (connectionPromise) return connectionPromise;

    connectionPromise = (async () => {
        dbConfig = loadConfig();
        if (!dbConfig) throw new Error("Config not found");

        const connectionOptions = {
            host: dbConfig.DATABASE_HOST,
            database: dbConfig.DATABASE_NAME,
            username: dbConfig.DATABASE_USER,
            password: dbConfig.DATABASE_PASSWORD,
            port: parseInt(dbConfig.DATABASE_PORT) || 3306,
            dialect: 'mysql'
        };

        const success = await Database.connect(connectionOptions);
        if (success) {
            defineModels();
            console.log("Database connected")
            return true;
        }

        console.log("Database connection failed, seeking to create database...");
        await createDatabase();

        const retrySuccess = await Database.connect(connectionOptions);
        if (retrySuccess) {
            defineModels();
            return true;
        } else {
            throw new Error("Failed to connect to database after creation attempt.");
        }
    })();

    return connectionPromise;
}

async function createDatabase() {
    try {
        const success = await Database.connect({
            host: dbConfig.DATABASE_HOST,
            username: dbConfig.DATABASE_USER,
            password: dbConfig.DATABASE_PASSWORD,
            port: parseInt(dbConfig.DATABASE_PORT) || 3306,
            dialect: 'mysql'
        });

        if (!success) {
            throw new Error("Failed to connect to database server for creation.");
        }

        await Database.raw(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.DATABASE_NAME}\``);
        await Database.disconnect();
    } catch (err) {
        throw err;
    }
}

function defineModel(name, schema) {
    registeredModels.push({ name, schema });
    return Database.defineModel(name, schema);
}

let Player = null;

function defineModels() {
    Player = defineModel('Players', {
        id: {
            type: Database.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        helixId: {
            type: Database.DataTypes.STRING,
            allowNull: false
        },
        slot: {
            type: Database.DataTypes.INTEGER,
            allowNull: false
        },
        active: {
            type: Database.DataTypes.BOOLEAN,
            defaultValue: false
        },
        firstName: {
            type: Database.DataTypes.STRING
        },
        lastName: {
            type: Database.DataTypes.STRING
        },
        dob: {
            type: Database.DataTypes.STRING
        },
        country: {
            type: Database.DataTypes.STRING
        },
        inventory: {
            type: Database.DataTypes.TEXT,
            allowNull: true
        },
        health: {
            type: Database.DataTypes.FLOAT,
            defaultValue: 100
        },
        hunger: {
            type: Database.DataTypes.FLOAT,
            defaultValue: 100
        },
        thirst: {
            type: Database.DataTypes.FLOAT,
            defaultValue: 100
        },
        stress: {
            type: Database.DataTypes.FLOAT,
            defaultValue: 0
        },
        sickness: {
            type: Database.DataTypes.FLOAT,
            defaultValue: 0
        }
    });
}

module.exports = {
    connect: initializeDatabase,
    waitForConnection: initializeDatabase,
    defineModel: defineModel,
    get Player() { return Player; },
    DataTypes: Database.DataTypes,
    Op: Database.Op,
    sync: Database.sync,
    findAll: Database.findAll,
    findOne: Database.findOne,
    create: Database.create,
    update: Database.update,
    remove: Database.remove,
    raw: Database.raw
};
