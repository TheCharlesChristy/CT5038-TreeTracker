const nodemailer = require("nodemailer");
const { createLogger, serializeError } = require("../../../logging");

const logger = createLogger("routes.api.email");

class EmailConfigurationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "EmailConfigurationError";
    this.code = "EMAIL_CONFIG_INVALID";
    this.statusCode = 503;
    this.details = details;
    this.isEmailError = true;
  }
}

class EmailDeliveryError extends Error {
  constructor(message, details = {}, cause = null) {
    super(message);
    this.name = "EmailDeliveryError";
    this.code = "EMAIL_DELIVERY_FAILED";
    this.statusCode = 503;
    this.details = details;
    this.cause = cause;
    this.isEmailError = true;
  }
}

function envValue(env, name) {
  const value = env[name];
  return typeof value === "string" ? value.trim() : "";
}

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return value === true || value === "true" || value === "1";
}

function getSmtpConfig(env = process.env) {
  const host = envValue(env, "SMTP_HOST");
  const user = envValue(env, "SMTP_USER");
  const pass = envValue(env, "SMTP_PASS");
  const from = envValue(env, "SMTP_FROM");
  const rawPort = envValue(env, "SMTP_PORT");
  const missing = [];

  const requiredValues = {
    SMTP_HOST: host,
    SMTP_PORT: rawPort,
    SMTP_USER: user,
    SMTP_PASS: pass,
    SMTP_FROM: from
  };

  for (const [name, value] of Object.entries(requiredValues)) {
    if (!value) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    throw new EmailConfigurationError("Email service is missing required SMTP environment variables", {
      missingVars: missing
    });
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new EmailConfigurationError("Email service has an invalid SMTP_PORT value", {
      smtpPort: rawPort
    });
  }

  const secure = parseBool(env.SMTP_SECURE, port === 465);

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    displayFrom: from.includes("<") ? from : `"TreeGuardians" <${from}>`
  };
}

function getErrorMeta(error) {
  return {
    name: error?.name || "Error",
    message: error?.message || String(error),
    code: error?.code || null,
    command: error?.command || null,
    responseCode: error?.responseCode || null,
    response: error?.response || null,
    errno: error?.errno || null,
    address: error?.address || null,
    port: error?.port || null
  };
}

function createEmailService({ env = process.env, mailer = nodemailer, log = logger } = {}) {
  async function sendEmail({ to, subject, html }) {
    const smtp = getSmtpConfig(env);

    if (!to) {
      throw new EmailConfigurationError("Email recipient is required");
    }

    if (!subject) {
      throw new EmailConfigurationError("Email subject is required");
    }

    if (!html) {
      throw new EmailConfigurationError("Email HTML body is required");
    }

    const transportOptions = {
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      requireTLS: !smtp.secure,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      tls: {
        servername: smtp.host
      },
      auth: {
        user: smtp.user,
        pass: smtp.pass
      }
    };

    log.info("email.send.start", {
      to,
      subject,
      smtpHost: smtp.host,
      smtpPort: smtp.port,
      smtpSecure: smtp.secure,
      from: smtp.from
    });

    try {
      const transporter = mailer.createTransport(transportOptions);
      const result = await transporter.sendMail({
        from: smtp.displayFrom,
        to,
        subject,
        html
      });

      log.info("email.send.success", {
        to,
        subject,
        messageId: result?.messageId || null,
        accepted: result?.accepted || [],
        rejected: result?.rejected || [],
        response: result?.response || null
      });

      return result;
    } catch (error) {
      const errorMeta = getErrorMeta(error);
      log.error("email.send.failed", {
        to,
        subject,
        smtpHost: smtp.host,
        smtpPort: smtp.port,
        smtpSecure: smtp.secure,
        from: smtp.from,
        error: errorMeta
      });

      throw new EmailDeliveryError(
        `Email delivery failed: ${errorMeta.message}`,
        errorMeta,
        error
      );
    }
  }

  return {
    sendEmail
  };
}

const defaultEmailService = createEmailService();

async function sendEmail(message) {
  try {
    return await defaultEmailService.sendEmail(message);
  } catch (error) {
    if (error instanceof EmailConfigurationError) {
      logger.error("email.config.invalid", {
        error: serializeError(error),
        details: error.details || {}
      });
    }

    throw error;
  }
}

module.exports = {
  sendEmail,
  createEmailService,
  getSmtpConfig,
  EmailConfigurationError,
  EmailDeliveryError
};
