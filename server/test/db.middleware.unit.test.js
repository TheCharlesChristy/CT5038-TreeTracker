const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("../src/db");

const EXPECTED_ENDPOINTS = {
  users: ["create", "getById", "getByUsername", "list", "updateById", "deleteById", "existsById", "existsByUsername"],
  userPasswords: ["setForUser", "getHashByUserId", "deleteForUser", "existsForUser"],
  admins: ["grant", "revoke", "isAdmin", "list"],
  userSessions: [
    "create",
    "getById",
    "getByToken",
    "listByUserId",
    "extendByToken",
    "deleteById",
    "deleteByToken",
    "deleteAllForUser",
    "deleteExpired"
  ],
  trees: ["create", "getById", "list", "updateById", "deleteById", "findByBoundingBox", "findNear", "count"],
  treeCreationData: ["create", "getById", "getByTreeId", "list", "updateById", "deleteById", "deleteByTreeId"],
  treeData: ["create", "getById", "getByTreeId", "updateByTreeId", "deleteByTreeId", "list"],
  guardians: ["add", "remove", "exists", "listByUser", "listByTree", "countByUser", "countByTree"],
  photos: ["create", "getById", "getBySha256", "list", "updateById", "deleteById", "existsById"],
  treePhotos: [
    "add",
    "remove",
    "exists",
    "listPhotoIdsByTree",
    "listTreeIdsByPhoto",
    "deleteAllForTree",
    "deleteAllForPhoto"
  ],
  comments: ["create", "getById", "list", "listByUserId", "updateUserById", "deleteById"],
  commentPhotos: [
    "add",
    "remove",
    "exists",
    "listPhotoIdsByComment",
    "listCommentIdsByPhoto",
    "deleteAllForComment",
    "deleteAllForPhoto"
  ],
  commentsTree: [
    "create",
    "get",
    "getByCommentId",
    "listByTreeId",
    "updateContent",
    "delete",
    "deleteByCommentId",
    "deleteAllForTree"
  ],
  commentReplies: [
    "create",
    "get",
    "listByParent",
    "listParentsOfComment",
    "updateContent",
    "delete",
    "deleteByCommentId",
    "deleteAllForParent"
  ],
  wildlifeObservations: ["create", "getByCommentId", "listByTreeId", "updateByCommentId", "deleteByCommentId"],
  diseaseObservations: ["create", "getByCommentId", "listByTreeId", "updateByCommentId", "deleteByCommentId"],
  seenObservations: ["create", "getByCommentId", "listByTreeId", "updateByCommentId", "deleteByCommentId"]
};

const EXPECTED_WORKFLOWS = {
  auth: ["registerUser", "createSession", "validateSession", "logout"],
  trees: ["createTreeWithMeta", "setTreeData", "getTreeDetails", "getTreeFeed"],
  photos: ["addPhotoAndAttachToTree", "addPhotoAndAttachToComment"],
  comments: ["addTreeComment", "replyToComment"],
  observations: ["addWildlifeObservation", "addDiseaseObservation", "addSeenObservation"],
  users: ["getUserProfile"]
};

function assertDbError(error) {
  return error && error.name === "DbError";
}

test("db middleware exports expected endpoint surface", () => {
  for (const [groupName, methods] of Object.entries(EXPECTED_ENDPOINTS)) {
    assert.ok(db[groupName], `Missing endpoint group: ${groupName}`);
    for (const method of methods) {
      assert.equal(typeof db[groupName][method], "function", `Missing endpoint method: ${groupName}.${method}`);
    }
  }

  for (const [workflowName, methods] of Object.entries(EXPECTED_WORKFLOWS)) {
    assert.ok(db.workflows[workflowName], `Missing workflow group: workflows.${workflowName}`);
    for (const method of methods) {
      assert.equal(
        typeof db.workflows[workflowName][method],
        "function",
        `Missing workflow method: workflows.${workflowName}.${method}`
      );
    }
  }
});

test("db middleware does not expose raw pool/query internals", () => {
  assert.equal(Object.prototype.hasOwnProperty.call(db, "pool"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(db, "query"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(db, "execute"), false);
});

test("all representative endpoint operations fail with DbError before init", async () => {
  const representativeCalls = [
    () => db.transaction(async () => {}),
    () => db.users.list(),
    () => db.userPasswords.existsForUser(1),
    () => db.admins.list(),
    () => db.userSessions.listByUserId(1),
    () => db.trees.list(),
    () => db.treeCreationData.list(),
    () => db.treeData.list(),
    () => db.guardians.listByTree(1),
    () => db.photos.list(),
    () => db.treePhotos.listPhotoIdsByTree(1),
    () => db.comments.list(),
    () => db.commentPhotos.listPhotoIdsByComment(1),
    () => db.commentsTree.listByTreeId(1),
    () => db.commentReplies.listByParent(1),
    () => db.wildlifeObservations.listByTreeId(1),
    () => db.diseaseObservations.listByTreeId(1),
    () => db.seenObservations.listByTreeId(1),
    () => db.workflows.auth.createSession({ userId: 1, sessionToken: "a".repeat(64), expiresAt: new Date() }),
    () => db.workflows.trees.getTreeFeed(1),
    () => db.workflows.users.getUserProfile(1)
  ];

  for (const call of representativeCalls) {
    await assert.rejects(async () => call(), assertDbError);
  }
});
