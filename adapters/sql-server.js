const sql = require("mssql");
require("dotenv").config();

const db_config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    server: process.env.DB_HOST,
    options: {
        trustServerCertificate: true
    }
}

async function connect() {
    return sql.connect(db_config);
}

async function disconnect() {
    return sql.close();
}

async function createTable() {
    return sql.query`CREATE TABLE last_migration (date SMALlDATETIME);`;
}

async function getLastMigration() {
    const query = await sql.query`SELECT * FROM last_migration ORDER BY date ASC;`;
    return query.recordset[0].date;
}

async function updateLastMigration() {
    await sql.query`DELETE FROM last_migration;`
    const req = new sql.Request()
    await req
        .input("time", sql.SmallDateTime, new Date())
        .query(`INSERT INTO last_migration VALUES (@time);`);
}

async function query(str) {
    return sql.query(str);
}

module.exports = {
    connect,
    disconnect,
    createTable,
    getLastMigration,
    updateLastMigration,
    query,
}

