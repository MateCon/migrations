const fs = require("node:fs");
const path = require("path");
const childProcess = require("child_process");
const {
    fileDate,
    fileToDate,
    compareAsc,
} = require("./utils/date.js");
const db = require("./adapters")("sql-server");
require("dotenv").config();

const editor = process.env.EDITOR ?? "vim";

function getMigrations() {
    const files = fs.readdirSync(path.join(__dirname, "migrations"));
    return files.map(file => ({ file, date: fileToDate(file.substr(0, 11)) }))
}

async function getDiff() {
    const last_migration = await db.getLastMigration();
    const migrations = getMigrations()
        .sort(compareAsc)
        .filter(m => compareAsc(m.date, last_migration) == 1);
    let diff = "";

    migrations.forEach(m => {
        diff += fs.readFileSync(path.join(__dirname, "migrations", m.file))
    });

    return diff;
}

async function init(params, flags) {
    fs.mkdirSync(path.join(__dirname, "migrations"));
    await db.createTable();
    await db.updateLastMigration()
};

async function status(params, flags) {
    const colors = {
        white: "\x1b[39m",
        green: "\x1b[34m",
        red: "\x1b[31m",
    };

    const last_migration = await db.getLastMigration();
    const migrations = getMigrations();

    function printMigration(idx) {
        console.log(`/migrations/${migrations[idx].file}`)
    }

    let i = migrations.length - 1, j = 0;
    while (i > 0 && compareAsc(migrations[i].date, last_migration) == 1) i--;

    process.stdout.write(colors.green, "");
    if (flags.all)
        for (j = 0; j < i - 1; j++)
            printMigration(j);

    if (i > 0 && i < migrations.length - 1)
        printMigration(i - 1);

    process.stdout.write(colors.red);
    for (j = Math.max(i, 0); j < migrations.length; j++)
        printMigration(j);

    process.stdout.write(colors.white);
    if (i == migrations.length - 1)
        console.log("Migrations are up to date!");
}

async function create(params, flags) {
    const name = params[1] ?? "";
    let fileName = fileDate() + (name && `-${name}`) + ".sql";
    fs.writeFileSync(path.join(__dirname, "migrations", fileName), "");
    console.log("Migration created in /migrations/" + fileName);
    if (flags.open == true) {
        childProcess.spawnSync(editor, [path.join(__dirname, "migrations", fileName)], {
            stdio: 'inherit',
            shell: true
        });
    }
}

async function sync(params, flags) {
    const diff = await getDiff();
    await db.query(diff);
    await db.updateLastMigration();
    console.log("Migrations synced successfully!");
}

async function updateSyncDate(params, flags) {
    const diff = await getDiff();
    console.log(diff);
    await db.updateLastMigration();
    console.log("Sync date updated");
}

async function diff(params, flags) {
    const diff = await getDiff();
    console.log(diff);
}

function help() {
    console.log("This is a CLI tool to help manage migrations for SQL Server databases.");
    console.log("Command list:");
    console.log("  init           sets up DB for syncing migrations");
    console.log("  create $NAME   creates a migration");
    console.log("     --open")
    console.log("  status         lists last migration applied and ones not applied");
    console.log("     --all");
    console.log("  diff           shows changes to be applied");
    console.log("  sync           applies migrations created after last sync");
    console.log("     -m $FILE    applies specific migration, marks all migrations as applied");
    console.log("  updateSyncDate shows diff and updates sync date, for using other databases");
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
        help: false,
    };

    function addFlag(c, flags) {
        switch (c) {
            case "o":
                flags.open = true;
                break;
            case "a":
                flags.all = true;
                break;
            case "h":
                flags.help = true;
                break;
        }
    }

    for (let i = 2; i < argument_list.length; i++) {
        const curr = argument_list[i];

        switch (curr) {
            case "--open":
                argument_list.push("-o");
                break;
            case "--all":
                argument_list.push("-a");
                break;
            case "--help":
                argument_list.push("-h");
                break;
            default:
                if (curr.length > 1 && curr[0] == "-")
                    for (let j = 1; j < curr.length; j++)
                        addFlag(curr[j], flags);
                else
                    params.push(curr);
        }
    }

    return { params, flags };
}

async function main() {
    const { params, flags } = parseArgv();
    let mode = params[0] ?? "modeNotFound";

    try {
        switch (mode) {
            case "init":
                await db.connect();
                await init(params, flags);
                await db.disconnect();
                break;
            case "status":
                await db.connect();
                await status(params, flags);
                await db.disconnect();
                break;
            case "diff":
                await db.connect();
                await diff(params, flags);
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
            case "updateSyncDate":
                await db.connect();
                await updateSyncDate(params, flags);
                await db.disconnect();
                break;
            default:
                if (flags.help == true) help();
                else modeNotFound();
                break;
        }
    } catch (err) {
        console.error(err);
    }
}

main();

