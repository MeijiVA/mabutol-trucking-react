import pg from "pg";
import { hash } from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate(): Promise<void> {
  try {
    console.log("Starting migration...");

    await pool.query(`
      CREATE TYPE user_role AS ENUM ('admin', 'user');
      CREATE TYPE vehicle_status AS ENUM ('active', 'in_maintenance', 'retired');
      CREATE TYPE driver_status AS ENUM ('active', 'on_leave', 'inactive');
      CREATE TYPE shipment_status AS ENUM ('pending', 'in_transit', 'delivered', 'cancelled');
      CREATE TYPE compliance_status AS ENUM ('pending', 'approved', 'rejected');
    `).catch(() => console.log("Enums already exist"));

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role user_role NOT NULL DEFAULT 'user',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ users table");

    await pool.query(`
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
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ customers table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        plate_number VARCHAR(50) UNIQUE NOT NULL,
        model VARCHAR(255),
        year INTEGER,
        status vehicle_status NOT NULL DEFAULT 'active',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ vehicles table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        license_number VARCHAR(50) UNIQUE NOT NULL,
        status driver_status NOT NULL DEFAULT 'active',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ drivers table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS shipments (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        vehicle_id INTEGER REFERENCES vehicles(id),
        driver_id INTEGER REFERENCES drivers(id),
        origin VARCHAR(255),
        destination VARCHAR(255),
        status shipment_status NOT NULL DEFAULT 'pending',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ shipments table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS compliance (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        description TEXT,
        status compliance_status NOT NULL DEFAULT 'pending',
        due_date TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ compliance table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pricing (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        amount DECIMAL(10,2),
        description TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ pricing table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        message TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ notifications table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(255) NOT NULL,
        resource_type VARCHAR(255) NOT NULL,
        resource_id INTEGER,
        before_state TEXT,
        after_state TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ audit_logs table");

    // Seed admin user
    const existingAdmin = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      ["admin@mabutoltrucking.com"]
    );
    if (!existingAdmin.rows.length) {
      const hashedPassword = await hash("admin123", 10);
      await pool.query(
        "INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)",
        ["admin@mabutoltrucking.com", hashedPassword, "Admin User", "admin"]
      );
      console.log("✓ Admin user created: admin@mabutoltrucking.com / admin123");
    }

    console.log("\n✓ Migration completed successfully!");
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    await pool.end();
    process.exit(1);
  }
}

migrate();
