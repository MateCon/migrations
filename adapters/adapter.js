const path = require("path");

function getAdapter(adapter) {
    return require(path.join(__dirname, adapter + ".js"));
}

module.exports = getAdapter;

