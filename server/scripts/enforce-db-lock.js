const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const SERVER_ROOT = path.resolve(ROOT, "server");
const DB_ROOT = path.resolve(SERVER_ROOT, "src", "db");

const IMPORT_BAN = /\bfrom\s+['\"](?:mysql2?|knex|sequelize|typeorm|pg)['\"]|\brequire\((['\"])(?:mysql2?|knex|sequelize|typeorm|pg)\1\)/;
const QUERY_BAN = /\.query\s*\(/;

function walk(dir, output = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", ".expo", "dist", "build"].includes(entry.name)) {
        continue;
      }
      walk(target, output);
    } else if (/\.(js|cjs|mjs|ts|tsx)$/.test(entry.name)) {
      output.push(target);
    }
  }
  return output;
}

function isUnderDb(filePath) {
  const relative = path.relative(DB_ROOT, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function checkFile(filePath) {
  if (path.resolve(filePath) === path.resolve(__filename)) {
    return [];
  }

  const content = fs.readFileSync(filePath, "utf8");
  const relativePath = path.relative(ROOT, filePath);
  const violations = [];

  if (!isUnderDb(filePath) && IMPORT_BAN.test(content)) {
    violations.push(`${relativePath}: forbidden DB driver import outside server/src/db`);
  }

  if (!isUnderDb(filePath) && QUERY_BAN.test(content)) {
    violations.push(`${relativePath}: forbidden .query( usage outside server/src/db`);
  }

  return violations;
}

function main() {
  const files = walk(ROOT);
  const violations = files.flatMap(checkFile);

  if (violations.length > 0) {
    console.error("Database lock check failed:");
    for (const violation of violations) {
      console.error(` - ${violation}`);
    }
    process.exit(1);
  }

  console.log("Database lock check passed.");
}

main();
