const test = require("node:test");
const assert = require("node:assert/strict");
const { createWorkflows } = require("../src/db/modules/workflows");
const { NotFoundError } = require("../src/errors");
const validators = require("../src/db/validation");

function createCtx(overrides = {}) {
  return {
    transaction: async (fn) => fn({}),
    run: async () => [],
    runtimeExecutor: () => ({}),
    toDateInput: (_n, v) => (v ? new Date(v) : undefined),
    validators,
    NotFoundError,
    users: { getById: async () => ({ id: 1 }) },
    userPasswords: {},
    admins: { isAdmin: async () => true },
    userSessions: { getByToken: async () => null },
    trees: { getById: async () => ({ id: 1 }) },
    treeCreationData: { getByTreeId: async () => ({ tree_id: 1 }) },
    treeData: {
      getByTreeId: async () => null,
      updateByTreeId: async () => {},
      create: async () => {}
    },
    guardians: {
      listByTree: async () => [],
      listByUser: async () => []
    },
    photos: {},
    treePhotos: { listPhotoIdsByTree: async () => [] },
    comments: {},
    commentPhotos: {},
    commentsTree: {},
    commentReplies: {},
    wildlifeObservations: {},
    diseaseObservations: {},
    seenObservations: {},
    ...overrides
  };
}

test("setTreeData updates existing row and creates when missing", async () => {
  const calls = [];
  const ctx = createCtx({
    treeData: {
      getByTreeId: async () => ({ id: 1 }),
      updateByTreeId: async (...args) => calls.push(["update", ...args]),
      create: async (...args) => calls.push(["create", ...args])
    }
  });
  const workflows = createWorkflows(ctx);
  await workflows.trees.setTreeData({ treeId: 1, treeDataFields: { treeHeight: 3 } });
  assert.equal(calls[0][0], "update");

  calls.length = 0;
  ctx.treeData.getByTreeId = async () => null;
  await workflows.trees.setTreeData({ treeId: 1, treeDataFields: { treeHeight: 3 } });
  assert.equal(calls[0][0], "create");
});

test("getTreeDetails throws not found and users profile aggregates", async () => {
  const missingCtx = createCtx({ trees: { getById: async () => null } });
  const missingWf = createWorkflows(missingCtx);
  await assert.rejects(() => missingWf.trees.getTreeDetails(9), /not found/);

  const profileCtx = createCtx({
    users: { getById: async () => ({ id: 2, username: "x" }) },
    admins: { isAdmin: async () => false },
    guardians: { listByTree: async () => [], listByUser: async () => [3, 4] }
  });
  const profileWf = createWorkflows(profileCtx);
  const result = await profileWf.users.getUserProfile(2);
  assert.deepEqual(result, {
    user: { id: 2, username: "x" },
    isAdmin: false,
    guardianTreeIds: [3, 4]
  });
});

test("getRecentComments normalizes list params and queries newest tree comments", async () => {
  const calls = [];
  const executor = { name: "runtime" };
  const expectedRows = [{ comment_id: 9, tree_id: 2, content: "Nice tree" }];
  const ctx = createCtx({
    runtimeExecutor: () => executor,
    run: async (...args) => {
      calls.push(args);
      return expectedRows;
    }
  });
  const workflows = createWorkflows(ctx);

  const rows = await workflows.trees.getRecentComments({ limit: "12", offset: "3" });

  assert.equal(rows, expectedRows);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], executor);
  assert.match(calls[0][1], /FROM comments_tree ct/);
  assert.match(calls[0][1], /ORDER BY ct\.created_at DESC/);
  assert.deepEqual(calls[0][2], [12, 3]);
});

test("getActivityTrend returns calendar-day tree and comment counts", async () => {
  const calls = [];
  const executor = { name: "runtime" };
  const ctx = createCtx({
    runtimeExecutor: () => executor,
    run: async (...args) => {
      calls.push(args);
      const sql = args[1];
      if (sql.includes("FROM tree_creation_data")) {
        return [{ day: "2026-04-29", count: "2" }];
      }
      if (sql.includes("FROM comments")) {
        return [{ day: "2026-04-30", count: "3" }];
      }
      if (sql.includes("FROM users")) {
        return [{ day: "2026-04-28", count: "4" }];
      }
      if (sql.includes("FROM user_sessions")) {
        return [{ day: "2026-04-27", count: "5" }];
      }
      return [];
    }
  });
  const workflows = createWorkflows(ctx);

  const trend = await workflows.analytics.getActivityTrend(14);

  assert.deepEqual(trend, {
    treesPerDay: [{ day: "2026-04-29", count: 2 }],
    commentsPerDay: [{ day: "2026-04-30", count: 3 }],
    registeredUsersPerDay: [{ day: "2026-04-28", count: 4 }],
    loginsPerDay: [{ day: "2026-04-27", count: 5 }]
  });
  assert.equal(calls.length, 4);
  assert.match(calls[0][1], /DATE_FORMAT\(created_at, '%Y-%m-%d'\) AS day/);
  assert.match(calls[1][1], /FROM comments/);
  assert.doesNotMatch(calls[1][1], /FROM comments_tree/);
  assert.match(calls[2][1], /FROM users/);
  assert.match(calls[3][1], /FROM user_sessions/);
  assert.match(calls[3][1], /COUNT\(DISTINCT user_id\) AS count/);
  assert.deepEqual(calls[0][2], [13]);
  assert.deepEqual(calls[1][2], [13]);
  assert.deepEqual(calls[2][2], [13]);
  assert.deepEqual(calls[3][2], [13]);
});

test("validateSession handles valid invalid and expired", async () => {
  const workflowsInvalid = createWorkflows(createCtx({ userSessions: { getByToken: async () => null } }));
  const invalid = await workflowsInvalid.auth.validateSession({ sessionToken: "a".repeat(64) });
  assert.deepEqual(invalid, { valid: false });

  const workflowsExpired = createWorkflows(
    createCtx({ userSessions: { getByToken: async () => ({ user_id: 1, expires_at: "2001-01-01T00:00:00.000Z" }) } })
  );
  const expired = await workflowsExpired.auth.validateSession({
    sessionToken: "a".repeat(64),
    now: "2002-01-01T00:00:00.000Z"
  });
  assert.deepEqual(expired, { valid: false });

  const workflowsValid = createWorkflows(
    createCtx({ userSessions: { getByToken: async () => ({ user_id: 7, expires_at: "2099-01-01T00:00:00.000Z" }) } })
  );
  const valid = await workflowsValid.auth.validateSession({
    sessionToken: "a".repeat(64),
    now: "2002-01-01T00:00:00.000Z"
  });
  assert.deepEqual(valid, { valid: true, userId: 7 });
});

test("deleteTreeComment is admin-only", async () => {
  const createCommentCtx = (isAdmin) => {
    const deleted = [];
    return {
      deleted,
      ctx: createCtx({
        admins: { isAdmin: async () => isAdmin },
        comments: { getById: async () => ({ id: 10, user_id: 2 }) },
        commentsTree: { getByCommentId: async () => ({ tree_id: 7 }) },
        commentReplies: { listParentsOfComment: async () => [] },
        run: async (_executor, sql, params) => {
          if (sql === "DELETE FROM comments WHERE id = ?") {
            deleted.push(params[0]);
          }
          return { affectedRows: 1 };
        }
      })
    };
  };

  const nonAdmin = createCommentCtx(false);
  await assert.rejects(
    () => createWorkflows(nonAdmin.ctx).comments.deleteTreeComment({ commentId: 10, userId: 2 }),
    (error) => error && error.name === "ForbiddenError"
  );
  assert.deepEqual(nonAdmin.deleted, []);

  const admin = createCommentCtx(true);
  const result = await createWorkflows(admin.ctx).comments.deleteTreeComment({ commentId: 10, userId: 99 });
  assert.deepEqual(result, { deleted: true });
  assert.deepEqual(admin.deleted, [10]);
});
