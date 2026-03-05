const {
  init,
  close,
  health,
  transaction,
  run,
  selectOne,
  runtimeExecutor,
  toDateInput,
  ensureOrder,
  buildUpdate,
  validators
} = require("./core");
const { createAccountEndpoints } = require("./modules/accounts");
const { createTreeEndpoints } = require("./modules/trees");
const { createContentEndpoints } = require("./modules/content");
const { createWorkflows } = require("./modules/workflows");
const { createDebugEndpoints } = require("./modules/debug");
const { ValidationError, NotFoundError, ConflictError, AuthError, DbError } = require("../errors");

const endpointContext = {
  run,
  selectOne,
  runtimeExecutor,
  toDateInput,
  ensureOrder,
  buildUpdate,
  validators,
  NotFoundError
};

const accountEndpoints = createAccountEndpoints(endpointContext);
const treeEndpoints = createTreeEndpoints(endpointContext);
const contentEndpoints = createContentEndpoints(endpointContext);
const debugEndpoints = createDebugEndpoints(endpointContext);

const workflows = createWorkflows({
  ...endpointContext,
  transaction,
  ...accountEndpoints,
  ...treeEndpoints,
  ...contentEndpoints
});

module.exports = {
  init,
  close,
  health,
  transaction,
  ...accountEndpoints,
  ...treeEndpoints,
  ...contentEndpoints,
  debug: debugEndpoints,
  workflows,
  errors: {
    ValidationError,
    NotFoundError,
    ConflictError,
    AuthError,
    DbError
  }
};
