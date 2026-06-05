import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    console.log("Starting migration...");
    
    // Drop existing tables if they exist (for fresh start)
    await pool.query(`
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS pricing CASCADE;
      DROP TABLE IF EXISTS compliance CASCADE;
      DROP TABLE IF EXISTS shipments CASCADE;
      DROP TABLE IF EXISTS drivers CASCADE;
      DROP TABLE IF EXISTS vehicles CASCADE;
      DROP TABLE IF EXISTS customers CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log("Dropped existing tables");

    // Create users table first
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created users table");

    // Create customers table
    await pool.query(`
      CREATE TABLE customers (
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
    `);
    console.log("Created customers table");

    // Create vehicles table
    await pool.query(`
      CREATE TABLE vehicles (
        id SERIAL PRIMARY KEY,
        plate_number VARCHAR(50) UNIQUE NOT NULL,
        model VARCHAR(255),
        year INTEGER,
        status VARCHAR(50) DEFAULT 'active',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created vehicles table");

    // Create drivers table
    await pool.query(`
      CREATE TABLE drivers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        license_number VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created drivers table");

    // Create shipments table
    await pool.query(`
      CREATE TABLE shipments (
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
    `);
    console.log("Created shipments table");

    // Create compliance table
    await pool.query(`
      CREATE TABLE compliance (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        due_date TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created compliance table");

    // Create pricing table
    await pool.query(`
      CREATE TABLE pricing (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        amount DECIMAL(10,2),
        description TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created pricing table");

    // Create notifications table
    await pool.query(`
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        message TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created notifications table");

    // Seed admin user
    const existingAdmin = await pool.query("SELECT * FROM users WHERE email = $1", ["admin@mabutoltrucking.com"]);
    if (!existingAdmin.rows.length) {
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.default.hash("admin123", 10);
      await pool.query(
        "INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)",
        ["admin@mabutoltrucking.com", hashedPassword, "Admin User", "admin"]
      );
      console.log("✓ Admin user created: admin@mabutoltrucking.com / admin123");
    }

    console.log("✓ Migration completed successfully!");
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err.message);
    await pool.end();
    process.exit(1);
  }
}

migrate();
