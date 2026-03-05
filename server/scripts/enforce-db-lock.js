const mysqlPromise = require("mysql2/promise");

function main() {
  // Importing db installs the runtime lock for mysql2 client factories.
  require("../src/db");

  try {
    mysqlPromise.createPool({ host: "127.0.0.1", user: "root", database: "any" });
  } catch (error) {
    if (error && error.code === "DB_LOCK_VIOLATION") {
      console.log("Database runtime lock check passed.");
      return;
    }

    console.error("Database runtime lock check failed with unexpected error:");
    console.error(error);
    process.exit(1);
  }

  console.error("Database runtime lock check failed: direct DB client creation was not blocked.");
  process.exit(1);
}

main();
