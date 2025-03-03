const fs = require("node:fs");
const path = require("path");
const childProcess = require("child_process");
const { compareAsc, format, parse } = require("date-fns");
const db = require("./adapters")("sql-server");
require("dotenv").config();

const editor = process.env.EDITOR ?? "vim";

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

async function init(params, flags) {
    await db.createTable();
    await sync();
};

async function status(params, flags) {
    const last_migration = await db.getLastMigration();
    const migrations = getMigrations();

    let i = migrations.length - 1, j = 0;
    while (i > 0 && compareAsc(migrations[i].date, last_migration) == 1) i--;

    if (flags.all == true) {
        while (j < i - 1) {
            console.log(`\x1b[34m/migrations/${migrations[j].file}\x1b[39m`);
            j++;
        }
    }

    if (i >= 0 && i < migrations.length - 1)
        console.log(`\x1b[34m/migrations/${migrations[i - 1].file}\x1b[39m`);

    for (j = Math.max(i + 1, 0); j < migrations.length; j++)
        console.log(`\x1b[31m/migrations/${migrations[j].file}\x1b[39m`);

    if (i == migrations.length - 1)
        console.log("Migrations are up to date!");
}

async function create(params, flags) {
    const name = params[0];
    let date = timestamp();
    let fileName = date
        .replaceAll(" ", "")
        .replaceAll("-", "")
        .replaceAll(":", "");
    if (name) fileName += "-" + name;
    fileName += ".sql";
    fs.writeFileSync(path.join(__dirname, "migrations", fileName), "");
    console.log("Migration created in /migrations/" + fileName);
    if (flags.open == true) {
        childProcess.spawnSync(editor, [path.join(__dirname, "migrations", fileName)], {
            stdio: 'inherit',
            shell: true
        });
    }
}

async function sync() {
    const last_migration = await db.getLastMigration();
    const migrations = getMigrations()
        .sort(compareAsc)
        .filter(m => compareAsc(m.date, last_migration) == 1);
    let query = "";

    migrations.forEach(m => {
        query += fs.readFileSync(path.join(__dirname, "migrations", m.file))
    });

    await db.query(query);

    await db.updateLastMigration();
    console.log("Migrations synced successfully!");
};

function help() {
    console.log("This is a CLI tool to help manage migrations for SQL Server databases.");
    console.log("Command list:");
    console.log("  init          sets up DB for syncing migrations");
    console.log("  create $NAME  creates a migration");
    console.log("  status        lists last migration applied and ones not applied");
    console.log("     -a         shows all migrations");
    console.log("  sync          applies migrations created after last sync");
    console.log("     -m $FILE   applies specific migration, marks all migrations as applied");
    console.log(".env setup:");
    console.log("  EDITOR=nano|vim|nvim|code");
    // To do
    // console.log("  DB=SQL_SERVER|MYSQL|POSTGRESQL");
    console.log("  DB_USER");
    console.log("  DB_PASS");
    console.log("  DB_NAME");
    console.log("  DB_HOST");
    console.log("Created by https://github.com/matecon");
}

function modeNotFound() {
    console.log("Command not found, for help use the flag --help or -h.");
}

function parseArgv() {
    const argument_list = process.argv.map(a => a);
    const params = [];
    const flags = {
        open: false,
        all: false,
    };

    function addFlag(c, flags) {
        console.log(c)
        switch (c) {
            case "o":
                flags.open = true;
                break;
            case "a":
                flags.all = true;
                break;
        }
    }

    for (let i = 3; i < argument_list.length; i++) {
        const curr = argument_list[i];

        switch (curr) {
            case "--open":
                argument_list.push("-o");
                break;
            case "--all":
                argument_list.push("-a");
                break;
            default:
                if (curr.length > 1 && curr[0] == "-")
                    for (let j = 1; j < curr.length; j++)
                        addFlag(curr[j], flags);
                else
                    params.append(curr);
        }
    }

    return { params, flags };
}

async function main() {
    let mode = process.argv[2] ?? "modeNotFound";
    const { params, flags } = parseArgv();

    try {
        switch (mode) {
            case "init":
                await init(params, flags);
                break;
            case "status":
                await db.connect();
                await status(params, flags);
                await db.disconnect();
                break;
            case "create":
                await create(params, flags);
                break;
            case "sync":
                await db.connect();
                await sync(params, flags);
                await db.disconnect();
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
    }
}

main();

