// Database connection pool for the Product Service.
//
// All connection details come from environment variables, so the SAME image
// runs locally (pointing at the docker-compose MySQL) and on ECS (pointing at
// Amazon RDS). Nothing environment-specific is baked into the image.
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'app',
  // In a later exercise the password is injected from AWS Secrets Manager by
  // ECS at runtime - it is never written into code or the task definition.
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'products',

  // A pool reuses a small set of open connections instead of opening a new
  // one per request - important once several containers share one RDS instance.
  connectionLimit: Number(process.env.DB_POOL_SIZE || 5),
  waitForConnections: true,

  // Fail fast if RDS is unreachable, rather than hanging the request.
  connectTimeout: 5000,

  // RDS requires TLS when DB_SSL=true (set on ECS). Local MySQL doesn't use it.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

module.exports = pool;
