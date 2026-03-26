const mysql = require("mysql2");
const mysqlPromise = require("mysql2/promise");

function createLeakedPromisePool() {
  // Created inside db middleware path so factory lock allows creation.
  return mysqlPromise.createPool({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    database: "any",
    connectionLimit: 1,
    waitForConnections: true
  });
}

function createLeakedCallbackPool() {
  // Created inside db middleware path so factory lock allows creation.
  // Returns a callback-style pool, which exposes .promise() for conversion.
  return mysql.createPool({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    database: "any",
    connectionLimit: 1,
    waitForConnections: true
  });
}

module.exports = {
  createLeakedPromisePool,
  createLeakedCallbackPool
};
