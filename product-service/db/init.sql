-- Schema + sample data for the Product Service.
-- Locally: docker-compose runs this automatically the first time MySQL starts.
-- On AWS: we'll run the same file once against the RDS instance.

CREATE TABLE IF NOT EXISTS products (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255)  NOT NULL,
  description TEXT,
  price       DECIMAL(10,2) NOT NULL,   -- DECIMAL, not FLOAT: money must be exact
  stock       INT UNSIGNED  NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, description, price, stock) VALUES
  ('Wireless Noise-Cancelling Headphones', 'Over-ear Bluetooth headphones with 30-hour battery life', 149.99, 42),
  ('Mechanical Keyboard',                  'Hot-swappable switches with RGB backlight',              89.50,  18),
  ('27-inch 4K Monitor',                   'IPS panel, USB-C with 65W power delivery',               329.00, 7),
  ('Ergonomic Office Chair',               'Adjustable lumbar support and armrests',                 219.95, 12),
  ('Portable SSD 1TB',                     'USB 3.2 Gen 2, up to 1050MB/s read speed',               99.99,  55),
  ('Smart Fitness Watch',                  'Heart-rate, GPS and sleep tracking',                     179.00, 23);
