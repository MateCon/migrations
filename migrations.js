const sql = require("mssql");
const fs = require("node:fs");
const path = require("path");
const { compareAsc, format, parse } = require("date-fns");
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

function timestamp() {
    return format(new Date(), "yyyy-MM-dd HH:mm:ss");
}

function getMigrations() {
    const files = fs.readdirSync(path.join(__dirname, "migrations"));
    const migrations = files
        .map(f => ({
            file: f,
            date: parse(f.substr(0, 14), "yyyyMMddHHmmss", new Date())
        }))
    return migrations;
}

async function init() {
    try {
        await sql.query`CREATE TABLE last_migration (date SMALlDATETIME);`
        await sync();
    } catch (err) {
        console.log(err);
    }
};

async function status() {
    try {
        const last_migration = (await sql.query`SELECT * FROM last_migration ORDER BY date ASC;`).recordset[0].date;
        const migrations = getMigrations();

        let i = migrations.length - 1, j = 0;
        while (i > 0 && compareAsc(migrations[i].date, last_migration) == 1) i--;

        if (i >= 0 && i < migrations.length - 1)
            console.log(`\x1b[34m/migrations/${migrations[i - 1].file}\x1b[39m`);

        for (j = Math.max(i + 1, 0); j < migrations.length; j++)
            console.log(`\x1b[31m/migrations/${migrations[j].file}\x1b[39m`);

        if (i == migrations.length - 1)
            console.log("Migrations are up to date!");

    } catch (err) {
        console.log(err);
    }
}

async function create(name) {
    try {
        let date = timestamp();
        let fileName = date
            .replaceAll(" ", "")
            .replaceAll("-", "")
            .replaceAll(":", "");
        if (name) fileName += "-" + name;
        fileName += ".sql";
        fs.writeFileSync(path.join(__dirname, "migrations", fileName), "");
        console.log("Migration created in /migrations/" + fileName);
    } catch (err) {
        console.log(err);
    }
};

async function sync() {
    try {
        const last_migration = (await sql.query`SELECT * FROM last_migration;`).recordset[0].date;
        const migrations = (await getMigrations())
            .sort(compareAsc)
            .filter(m => compareAsc(m.date, last_migration) == 1);
        let query = "";

        migrations.forEach(m => {
            query += fs.readFileSync(path.join(__dirname, "migrations", m.file))
        });

        await sql.query(query);

        await sql.query`DELETE FROM last_migration;`
        const req = new sql.Request()
        await req
            .input("time", sql.SmallDateTime, new Date())
            .query(`INSERT INTO last_migration VALUES (@time);`);
        console.log("Migrations synced successfully!");
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

    try {
        switch (mode) {
            case "init":
                await init();
                break;
            case "status":
                await sql.connect(db_config);
                await status();
                break;
            case "create":
                await create(firstParam);
                break;
            case "sync":
                await sql.connect(db_config);
                await sync();
                break;
            case "-h":
            case "--help":
                help();
                break;
            default:
                modeNotFound();
                break;
        }
    } catch (err) {
        console.error(err);
    } finally {
        sql.close();
    }
}

// main().then(process.exit());
main();

