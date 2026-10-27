// Database migration + seed, run automatically when the service starts.
//
// Why: the RDS database sits in private subnets with no public access, so
// there's no easy way to run init.sql against it from your laptop. Instead,
// the container prepares its own schema on startup.
//
// Safe to run any number of times, even by several containers at once:
//   - CREATE TABLE IF NOT EXISTS does nothing if the table is already there
//   - INSERT IGNORE with fixed ids skips rows that already exist, so the
//     sample products are never duplicated
const pool = require('./db');

const SAMPLE_PRODUCTS = [
  [1, 'Wireless Noise-Cancelling Headphones', 'Over-ear Bluetooth headphones with 30-hour battery life', 149.99, 42],
  [2, 'Mechanical Keyboard', 'Hot-swappable switches with RGB backlight', 89.5, 18],
  [3, '27-inch 4K Monitor', 'IPS panel, USB-C with 65W power delivery', 329.0, 7],
  [4, 'Ergonomic Office Chair', 'Adjustable lumbar support and armrests', 219.95, 12],
  [5, 'Portable SSD 1TB', 'USB 3.2 Gen 2, up to 1050MB/s read speed', 99.99, 55],
  [6, 'Smart Fitness Watch', 'Heart-rate, GPS and sleep tracking', 179.0, 23],
];

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id          INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(255)  NOT NULL,
      description TEXT,
      price       DECIMAL(10,2) NOT NULL,
      stock       INT UNSIGNED  NOT NULL DEFAULT 0,
      created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

  // "VALUES ?" with a nested array is mysql2's bulk-insert syntax:
  // it expands to (..),(..),(..) with every value safely escaped.
  const [result] = await pool.query(
    'INSERT IGNORE INTO products (id, name, description, price, stock) VALUES ?',
    [SAMPLE_PRODUCTS]
  );
  console.log(`Migration complete (${result.affectedRows} sample rows inserted)`);
}

// Retry with a pause: on first deploy the container can start before the
// database is reachable. Gives up after ~1 minute but never crashes the app -
// /health keeps working and /products returns 503 until the DB is ready.
async function migrateWithRetry(attempts = 12, delayMs = 5000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await migrate();
      return;
    } catch (err) {
      console.error(`Migration attempt ${i}/${attempts} failed: ${err.message}`);
      if (i < attempts) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  console.error('Migration gave up - check DB connectivity and credentials');
}

module.exports = { migrateWithRetry };
