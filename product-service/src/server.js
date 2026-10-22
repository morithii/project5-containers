// Product Service - a small REST API that runs inside a Docker container.
//
// Endpoints:
//   GET /health    -> liveness check used by Docker and (later) the ALB/ECS
//   GET /products  -> list of products, read from the MySQL database on Amazon RDS
const express = require('express');
const pool = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Health check: deliberately does NOT touch the database.
// If RDS has a brief blip, we don't want the load balancer to mark EVERY
// container unhealthy and kill them all - the containers themselves are fine.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Main endpoint: return all products as JSON.
app.get('/products', async (req, res) => {
  try {
    // Plain SELECT with an explicit column list (never SELECT *), so a schema
    // change can't accidentally leak new columns through the API.
    const [rows] = await pool.query(
      'SELECT id, name, description, price, stock FROM products ORDER BY id'
    );
    res.json({ count: rows.length, products: rows });
  } catch (err) {
    // Log the real error for CloudWatch, but don't leak DB details to callers.
    console.error('Failed to query products:', err.message);
    res.status(503).json({ error: 'Product database unavailable' });
  }
});

// Anything else -> 404 in JSON rather than Express's default HTML page.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Listen on 0.0.0.0 (all interfaces), not localhost - inside a container,
// "localhost" would only accept connections from within the container itself.
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Product Service listening on port ${PORT}`);
});

// Graceful shutdown. When ECS stops a task (deploys, scale-in, Spot
// interruption) it sends SIGTERM and waits before force-killing it.
// We stop accepting new requests, let in-flight ones finish, close DB
// connections, then exit cleanly - so no user sees a dropped request.
function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
  // Safety net: if something hangs, exit anyway after 10s.
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
