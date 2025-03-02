const sql = require("mssql");
const fs = require("node:fs");
const path = require("path");
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

async function init() {
    try {
        sql.connect(db_config);
        await sql.query`CREATE TABLE last_migration (date DATETIME);`
        await sync();
    } catch (err) {
        console.log(err);
    }
};

async function status() {
    try {
        sql.connect(db_config);
        const query = await sql.query`SELECT * FROM migrations;`
        console.log(query);
    } catch (err) {
        console.log(err);
    }
}

async function create(name) {
    try {
        const fileName = format(new Date());
        if (name) fileName += "-" + name;
        fileName += ".sql";
        fs.writeFileSync(path.join(__dirname, "migrations", fileName), "");
    } catch (err) {
        console.log(err);
    }
};

async function sync() {
    try {
        sql.connect(db_config);
        await sql.query``
        await sync();
    } catch (err) {
        console.log(err);
    }
};

function help() {
    console.log("This is a CLI tool to help manage migrations for SQL Server databases.");
    console.log("Command list:");
    console.log("  init          sets up DB for syncing migrations");
    console.log("  create $NAME  creates a migration");
    console.log("  status        lists last migration applied and ones not applied");
    console.log("     --all      shows all migrations");
    console.log("  sync          applies migrations created after last sync");
    console.log("     -m $FILE   applies specific migration, marks all migrations as applied");
    console.log("Created by https://github.com/matecon");
}

function modeNotFound() {
    console.log("Command not found, for help use the flag --help or -h.");
}

async function main() {
    let mode = process.argv[2] ?? "modeNotFound";
    let firstParam = process.argv[3] ?? "";

    switch (mode) {
        case "init":
            init();
            break;
        case "status":
            status();
            break;
        case "create":
            create(firstParam);
            break;
        case "sync":
            sync();
            break;
        case "-h":
        case "--help":
            help();
            break;
        default:
            modeNotFound();
            break;
    }
}

main();

