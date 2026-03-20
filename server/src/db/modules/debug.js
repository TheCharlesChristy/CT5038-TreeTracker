const TABLE_META = Object.freeze({
  users: { orderBy: "id" },
  user_passwords: { orderBy: "user_id" },
  admins: { orderBy: "user_id" },
  guardians: { orderBy: "user_id" },
  user_sessions: { orderBy: "id" },
  trees: { orderBy: "id" },
  tree_creation_data: { orderBy: "id" },
  tree_data: { orderBy: "id" },
  guardian_trees: { orderBy: "tree_id" },
  photos: { orderBy: "id" },
  tree_photos: { orderBy: "tree_id" },
  comments: { orderBy: "id" },
  comment_photos: { orderBy: "comment_id" },
  comments_tree: { orderBy: "comment_id" },
  comment_replies: { orderBy: "comment_id" },
  wildlife_observations: { orderBy: "comment_id" },
  disease_observations: { orderBy: "comment_id" },
  seen_observations: { orderBy: "comment_id" }
});

function createDebugEndpoints(ctx) {
  const { run, selectOne, runtimeExecutor, ensureOrder, validators } = ctx;
  const { assert, normalizeListParams } = validators;

  function assertKnownTable(tableName) {
    assert(typeof tableName === "string" && tableName.length > 0, "tableName must be a non-empty string");
    assert(Object.prototype.hasOwnProperty.call(TABLE_META, tableName), `Unknown table: ${tableName}`);
    return tableName;
  }

  return {
    async listTables() {
      return Object.keys(TABLE_META);
    },

    async countRows(tableName, tx) {
      const table = assertKnownTable(tableName);
      const row = await selectOne(runtimeExecutor(tx), `SELECT COUNT(*) AS total FROM ${table}`);
      return Number(row?.total || 0);
    },

    async listRows(tableName, params = {}, tx) {
      const table = assertKnownTable(tableName);
      const { limit, offset } = normalizeListParams(params);
      const order = ensureOrder(params.order);
      const orderBy = TABLE_META[table].orderBy;

      return run(
        runtimeExecutor(tx),
        `SELECT * FROM ${table} ORDER BY ${orderBy} ${order.toUpperCase()} LIMIT ? OFFSET ?`,
        [limit, offset]
      );
    },

    async previewAll(params = {}, tx) {
      const { limit } = normalizeListParams({ limit: params.limit === undefined ? 5 : params.limit, offset: 0 });
      const order = ensureOrder(params.order);
      const tables = Object.keys(TABLE_META);

      const results = await Promise.all(
        tables.map(async (table) => {
          const orderBy = TABLE_META[table].orderBy;
          const countRow = await selectOne(runtimeExecutor(tx), `SELECT COUNT(*) AS total FROM ${table}`);
          const rows = await run(
            runtimeExecutor(tx),
            `SELECT * FROM ${table} ORDER BY ${orderBy} ${order.toUpperCase()} LIMIT ?`,
            [limit]
          );
          return {
            table,
            total: Number(countRow?.total || 0),
            rows
          };
        })
      );

      return {
        limit,
        order,
        tables: results
      };
    }
  };
}

module.exports = {
  createDebugEndpoints
};
