import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_QJWl1hGKOXL3@ep-orange-frog-aqnj0jjo-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

app.use(cors());
app.use(express.json());

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(50),
        zip_code VARCHAR(10),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        plate_number VARCHAR(50) UNIQUE NOT NULL,
        model VARCHAR(255),
        year INTEGER,
        status VARCHAR(50) DEFAULT 'active',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        license_number VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS shipments (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        vehicle_id INTEGER REFERENCES vehicles(id),
        driver_id INTEGER REFERENCES drivers(id),
        origin VARCHAR(255),
        destination VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS compliance (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        due_date TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS pricing (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        amount DECIMAL(10,2),
        description TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        message TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database tables created/verified");
  } catch (err) {
    console.error("DB init error:", err);
  }
};

const seedAdmin = async () => {
  try {
    const existingAdmin = await pool.query("SELECT * FROM users WHERE email = $1", ["admin@mabutoltrucking.com"]);
    if (!existingAdmin.rows.length) {
      const hashedPassword = await bcryptjs.hash("admin123", 10);
      await pool.query(
        "INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)",
        ["admin@mabutoltrucking.com", hashedPassword, "Admin User", "admin"]
      );
      console.log("Admin user created");
    }
  } catch (err) {
    console.error("Seed error:", err);
  }
};

// Auth routes
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const valid = await bcryptjs.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, email, name, role FROM users WHERE id = $1", [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customers routes
app.get("/api/customers", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM customers ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/customers/:id", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM customers WHERE id = $1", [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/customers", verifyToken, async (req, res) => {
  try {
    const { name, email, phone, address, city, state, zip_code } = req.body;
    const result = await pool.query(
      "INSERT INTO customers (name, email, phone, address, city, state, zip_code, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [name, email, phone, address, city, state, zip_code, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/customers/:id", verifyToken, async (req, res) => {
  try {
    const { name, email, phone, address, city, state, zip_code } = req.body;
    const result = await pool.query(
      "UPDATE customers SET name = $1, email = $2, phone = $3, address = $4, city = $5, state = $6, zip_code = $7 WHERE id = $8 RETURNING *",
      [name, email, phone, address, city, state, zip_code, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/customers/:id", verifyToken, async (req, res) => {
  try {
    await pool.query("DELETE FROM customers WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Shipments routes
app.get("/api/shipments", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM shipments ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/shipments/:id", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM shipments WHERE id = $1", [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/shipments", verifyToken, async (req, res) => {
  try {
    const { customer_id, vehicle_id, driver_id, origin, destination, status } = req.body;
    const result = await pool.query(
      "INSERT INTO shipments (customer_id, vehicle_id, driver_id, origin, destination, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [customer_id, vehicle_id, driver_id, origin, destination, status || "pending", req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/shipments/:id", verifyToken, async (req, res) => {
  try {
    const { customer_id, vehicle_id, driver_id, origin, destination, status } = req.body;
    const result = await pool.query(
      "UPDATE shipments SET customer_id = $1, vehicle_id = $2, driver_id = $3, origin = $4, destination = $5, status = $6 WHERE id = $7 RETURNING *",
      [customer_id, vehicle_id, driver_id, origin, destination, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/shipments/:id", verifyToken, async (req, res) => {
  try {
    await pool.query("DELETE FROM shipments WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vehicles routes
app.get("/api/vehicles", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM vehicles ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/vehicles/:id", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM vehicles WHERE id = $1", [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/vehicles", verifyToken, async (req, res) => {
  try {
    const { plate_number, model, year, status } = req.body;
    const result = await pool.query(
      "INSERT INTO vehicles (plate_number, model, year, status, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [plate_number, model, year, status || "active", req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/vehicles/:id", verifyToken, async (req, res) => {
  try {
    const { plate_number, model, year, status } = req.body;
    const result = await pool.query(
      "UPDATE vehicles SET plate_number = $1, model = $2, year = $3, status = $4 WHERE id = $5 RETURNING *",
      [plate_number, model, year, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/vehicles/:id", verifyToken, async (req, res) => {
  try {
    await pool.query("DELETE FROM vehicles WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Drivers routes
app.get("/api/drivers", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM drivers ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/drivers/:id", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM drivers WHERE id = $1", [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/drivers", verifyToken, async (req, res) => {
  try {
    const { name, email, phone, license_number, status } = req.body;
    const result = await pool.query(
      "INSERT INTO drivers (name, email, phone, license_number, status, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [name, email, phone, license_number, status || "active", req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/drivers/:id", verifyToken, async (req, res) => {
  try {
    const { name, email, phone, license_number, status } = req.body;
    const result = await pool.query(
      "UPDATE drivers SET name = $1, email = $2, phone = $3, license_number = $4, status = $5 WHERE id = $6 RETURNING *",
      [name, email, phone, license_number, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/drivers/:id", verifyToken, async (req, res) => {
  try {
    await pool.query("DELETE FROM drivers WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Compliance routes
app.get("/api/compliance", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM compliance ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/compliance", verifyToken, async (req, res) => {
  try {
    const { title, description, status, due_date } = req.body;
    const result = await pool.query(
      "INSERT INTO compliance (title, description, status, due_date, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [title, description, status || "pending", due_date, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/compliance/:id", verifyToken, async (req, res) => {
  try {
    const { title, description, status, due_date } = req.body;
    const result = await pool.query(
      "UPDATE compliance SET title = $1, description = $2, status = $3, due_date = $4 WHERE id = $5 RETURNING *",
      [title, description, status, due_date, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/compliance/:id", verifyToken, async (req, res) => {
  try {
    await pool.query("DELETE FROM compliance WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard routes
app.get("/api/dashboard/stats", verifyToken, async (req, res) => {
  try {
    const customers = await pool.query("SELECT COUNT(*) as count FROM customers");
    const shipments = await pool.query("SELECT COUNT(*) as count FROM shipments");
    const vehicles = await pool.query("SELECT COUNT(*) as count FROM vehicles");
    const drivers = await pool.query("SELECT COUNT(*) as count FROM drivers");
    
    res.json({
      customers: customers.rows[0].count,
      shipments: shipments.rows[0].count,
      vehicles: vehicles.rows[0].count,
      drivers: drivers.rows[0].count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/dashboard/feed", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 'shipment' as type, 'Created shipment' as message, created_at FROM shipments 
      UNION ALL 
      SELECT 'customer' as type, 'Added customer' as message, created_at FROM customers 
      ORDER BY created_at DESC LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/dashboard/alerts", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 'alert' as type, title as message FROM compliance WHERE status = 'pending' LIMIT 5
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pricing routes
app.get("/api/pricing", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pricing ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pricing", verifyToken, async (req, res) => {
  try {
    const { name, amount, description } = req.body;
    const result = await pool.query(
      "INSERT INTO pricing (name, amount, description, created_by) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, amount, description, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/pricing/:id", verifyToken, async (req, res) => {
  try {
    const { name, amount, description } = req.body;
    const result = await pool.query(
      "UPDATE pricing SET name = $1, amount = $2, description = $3 WHERE id = $4 RETURNING *",
      [name, amount, description, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/pricing/:id", verifyToken, async (req, res) => {
  try {
    await pool.query("DELETE FROM pricing WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Notifications routes
app.get("/api/notifications", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC", [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/notifications/:id/read", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *", [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/notifications/read-all", verifyToken, async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1", [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const start = async () => {
  await initDB();
  await seedAdmin();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

start();
