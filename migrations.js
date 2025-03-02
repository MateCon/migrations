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
};

async function main() {
    switch (process.argv[0]) {
        case "create":
            fs.writeFileSync(path.join(__dirname, "migrations", process.argv[3] + ".sql"), "");
    }
    try {
        await sql.connect(db_config);
        // await sql.query`CREATE TABLE migrations (
        //     id int NOT NULL IDENTITY(1,1),
        //     date DATETIME,
        //     name varchar(50),
        //     PRIMARY KEY (id)
        // );`
        // const query = await sql.query`SELECT * FROM migrations;`
        // console.log(query);
    } catch (err) {
        console.log(err);
    }
}

main();

