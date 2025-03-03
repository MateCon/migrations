const { compareAsc, format, parse } = require("date-fns");

function timestamp() {
    return format(new Date(), "yyyy-MM-dd HH:mm:ss");
}

function timestampToDate(str) {
    return parse(str, "yyyy-MM-dd HH:mm:ss", new Date());
}

function fileDate() {
    return format(new Date(), "yyMMdd-HHmm");
}

function fileToDate(str) {
    return parse(str, "yyMMdd-HHmm", new Date());
}

module.exports = {
    timestamp,
    timestampToDate,
    fileDate,
    fileToDate,
    compareAsc,
}

