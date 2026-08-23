function notFound(req, res, next) {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
}

function dbHint(err) {
  const code = err && err.code;
  if (code === 'ECONNREFUSED') {
    return 'MySQL connect nahi ho raha. docker compose up -d chalao aur backend/.env check karo.';
  }
  if (code === 'ER_BAD_DB_ERROR' || code === 'ER_NO_SUCH_TABLE') {
    return 'Database/tables missing hain. backend folder mein npm run db:init chalao.';
  }
  if (code === 'ER_ACCESS_DENIED_ERROR') {
    return 'MySQL user/password galat hai. backend/.env mein DB_USER / DB_PASSWORD check karo.';
  }
  if (code === 'ETIMEDOUT' || code === 'PROTOCOL_CONNECTION_LOST') {
    return 'MySQL connection drop ho gaya. MySQL running hai ya nahi check karo.';
  }
  return null;
}

function errorHandler(err, req, res, next) {
  const mapped = dbHint(err);
  const status = err.status || err.statusCode || (mapped ? 503 : 500);
  const message = mapped
    || ((err.expose || status < 500) ? err.message : 'Internal server error');
  if (status >= 500 || mapped) {
    console.error(err);
  }
  res.status(status).json({
    error: message,
    ...(err.code ? { code: err.code } : {}),
    ...(err.details ? { details: err.details } : {}),
  });
}

function httpError(status, message, details) {
  const err = new Error(message);
  err.status = status;
  err.expose = true;
  if (details) err.details = details;
  return err;
}

module.exports = { notFound, errorHandler, httpError };
