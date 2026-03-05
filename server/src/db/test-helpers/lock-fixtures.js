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

module.exports = {
  createLeakedPromisePool
};
