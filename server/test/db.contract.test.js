const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("../src/db");

test("db middleware exposes required top-level endpoint groups", () => {
  const requiredGroups = [
    "users",
    "userPasswords",
    "admins",
    "userSessions",
    "trees",
    "treeCreationData",
    "treeData",
    "guardians",
    "photos",
    "treePhotos",
    "comments",
    "commentPhotos",
    "commentsTree",
    "commentReplies",
    "wildlifeObservations",
    "diseaseObservations",
    "seenObservations",
    "workflows"
  ];

  for (const group of requiredGroups) {
    assert.ok(db[group], `Missing endpoint group: ${group}`);
  }
});

test("db health reports not ready before init", async () => {
  const health = await db.health();
  assert.deepEqual(health, { ready: false });
});

test("db endpoints reject access before init", async () => {
  await assert.rejects(async () => db.users.list(), (error) => error && error.name === "DbError");
});
