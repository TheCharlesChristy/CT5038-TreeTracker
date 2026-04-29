const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createEmailService,
  getSmtpConfig,
  EmailConfigurationError,
  EmailDeliveryError
} = require("../src/routes/api/utils/email");

function createLogCollector() {
  const entries = [];
  const log = {};
  for (const level of ["debug", "info", "warn", "error"]) {
    log[level] = (event, meta = {}) => entries.push({ level, event, meta });
  }
  return { log, entries };
}

test("SMTP config validation reports missing variables before delivery", () => {
  assert.throws(
    () => getSmtpConfig({ SMTP_HOST: "smtp.example.com" }),
    (error) => {
      assert.ok(error instanceof EmailConfigurationError);
      assert.equal(error.code, "EMAIL_CONFIG_INVALID");
      assert.deepEqual(error.details.missingVars, ["SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"]);
      return true;
    }
  );
});

test("SMTP config uses STARTTLS style settings for port 587", () => {
  const config = getSmtpConfig({
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_USER: "user@example.com",
    SMTP_PASS: "secret",
    SMTP_FROM: "noreply@example.com"
  });

  assert.equal(config.host, "smtp.example.com");
  assert.equal(config.port, 587);
  assert.equal(config.secure, false);
  assert.equal(config.displayFrom, "\"TreeGuardians\" <noreply@example.com>");
});

test("SMTP config uses implicit TLS for port 465", () => {
  const config = getSmtpConfig({
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "465",
    SMTP_USER: "user@example.com",
    SMTP_PASS: "secret",
    SMTP_FROM: "TreeGuardians <noreply@example.com>"
  });

  assert.equal(config.port, 465);
  assert.equal(config.secure, true);
  assert.equal(config.displayFrom, "TreeGuardians <noreply@example.com>");
});

test("sendEmail sends with validated transport options and logs success", async () => {
  const createdTransports = [];
  const sentMessages = [];
  const { log, entries } = createLogCollector();
  const mailer = {
    createTransport(options) {
      createdTransports.push(options);
      return {
        async sendMail(message) {
          sentMessages.push(message);
          return {
            messageId: "message-1",
            accepted: [message.to],
            rejected: [],
            response: "250 ok"
          };
        }
      };
    }
  };

  const service = createEmailService({
    env: {
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_USER: "user@example.com",
      SMTP_PASS: "secret",
      SMTP_FROM: "noreply@example.com"
    },
    mailer,
    log
  });

  await service.sendEmail({
    to: "user@example.com",
    subject: "Hello",
    html: "<p>Hello</p>"
  });

  assert.equal(createdTransports.length, 1);
  assert.equal(createdTransports[0].host, "smtp.example.com");
  assert.equal(createdTransports[0].port, 587);
  assert.equal(createdTransports[0].secure, false);
  assert.equal(createdTransports[0].requireTLS, true);
  assert.deepEqual(createdTransports[0].auth, {
    user: "user@example.com",
    pass: "secret"
  });

  assert.deepEqual(sentMessages[0], {
    from: "\"TreeGuardians\" <noreply@example.com>",
    to: "user@example.com",
    subject: "Hello",
    html: "<p>Hello</p>"
  });

  assert.ok(entries.some((entry) => entry.event === "email.send.start"));
  assert.ok(entries.some((entry) => entry.event === "email.send.success"));
});

test("sendEmail wraps SMTP delivery errors with safe details", async () => {
  const { log, entries } = createLogCollector();
  const smtpError = new Error("Invalid login");
  smtpError.code = "EAUTH";
  smtpError.command = "AUTH PLAIN";
  smtpError.responseCode = 535;
  smtpError.response = "535 Authentication failed";

  const service = createEmailService({
    env: {
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_USER: "user@example.com",
      SMTP_PASS: "secret",
      SMTP_FROM: "noreply@example.com"
    },
    mailer: {
      createTransport() {
        return {
          async sendMail() {
            throw smtpError;
          }
        };
      }
    },
    log
  });

  await assert.rejects(
    () => service.sendEmail({ to: "user@example.com", subject: "Hello", html: "<p>Hello</p>" }),
    (error) => {
      assert.ok(error instanceof EmailDeliveryError);
      assert.equal(error.code, "EMAIL_DELIVERY_FAILED");
      assert.equal(error.details.code, "EAUTH");
      assert.equal(error.details.responseCode, 535);
      assert.equal(error.details.command, "AUTH PLAIN");
      return true;
    }
  );

  assert.ok(entries.some((entry) => entry.level === "error" && entry.event === "email.send.failed"));
});
