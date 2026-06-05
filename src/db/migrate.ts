import { Pool } from "pg";
import { hash } from "bcryptjs";
import { v4 as uuid } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate(): Promise<void> {
  try {
    console.log("Starting migration...");

    // Drop existing enums first
    const enums = ["truck_status", "delivery_status", "invoice_status", "booking_status", "user_role"];
    for (const enumType of enums) {
      await pool.query(`DROP TYPE IF EXISTS ${enumType} CASCADE;`).catch(() => null);
    }

    // Drop existing tables to avoid conflicts
    const tables = ["agents", "audit_logs", "accounts_receivable", "receipts", "delivery_items", "deliveries", "invoices", "booking_items", "bookings", "trucks", "drivers", "pallet_items", "batch_pallets", "inventory_batches", "products", "customers", "users"];
    for (const table of tables) {
      await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE;`).catch(() => null);
    }
    console.log("✓ Cleaned up existing tables and enums");

    // Create enums
    await pool.query(`CREATE TYPE user_role AS ENUM ('admin', 'agent');`);
    console.log("✓ user_role enum");

    await pool.query(`CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'prep', 'ready');`);
    console.log("✓ booking_status enum");

    await pool.query(`CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid');`);
    console.log("✓ invoice_status enum");

    await pool.query(`CREATE TYPE delivery_status AS ENUM ('pending', 'in_transit', 'completed');`);
    console.log("✓ delivery_status enum");

    await pool.query(`CREATE TYPE truck_status AS ENUM ('available', 'in_transit', 'maintenance');`);
    console.log("✓ truck_status enum");

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role user_role NOT NULL DEFAULT 'agent',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ users table");

    // Create customers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        store_name TEXT NOT NULL,
        location TEXT NOT NULL,
        contact_person TEXT,
        contact_info TEXT,
        agent_id TEXT REFERENCES users(id),
        payment_type TEXT,
        tax_rate DECIMAL(5, 2),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ customers table");

    // Create products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sku TEXT UNIQUE,
        price DECIMAL(10, 2) NOT NULL,
        image_filename TEXT,
        batch_tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        manufacturer TEXT,
        reorder_point INTEGER,
        is_discontinued BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ products table");

    // Create inventory_batches table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_batches (
        id TEXT PRIMARY KEY,
        batch_name TEXT NOT NULL,
        is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ inventory_batches table");

    // Create batch_pallets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS batch_pallets (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL REFERENCES inventory_batches(id) ON DELETE CASCADE,
        pallet_id TEXT NOT NULL,
        supplier_name TEXT,
        received_date TEXT,
        temperature_log TEXT,
        storage_zone TEXT,
        placement_location TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ batch_pallets table");

    // Create pallet_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pallet_items (
        id TEXT PRIMARY KEY,
        pallet_id TEXT NOT NULL REFERENCES batch_pallets(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id),
        qty_units INTEGER NOT NULL,
        expiration_date_note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ pallet_items table");

    // Create agents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        full_name TEXT,
        email TEXT,
        contact_info TEXT,
        emergency_contact TEXT,
        hire_date TEXT,
        address TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ agents table");

    // Create drivers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        full_name TEXT,
        contact_info TEXT,
        license TEXT,
        hire_date TEXT,
        employment_type TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ drivers table");

    // Create trucks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trucks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        district TEXT NOT NULL,
        driver_id TEXT REFERENCES drivers(id),
        status truck_status NOT NULL DEFAULT 'available',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ trucks table");

    // Create bookings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customers(id),
        truck_id TEXT REFERENCES trucks(id),
        status booking_status NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ bookings table");

    // Create booking_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS booking_items (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id),
        qty_ordered INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ booking_items table");

    // Create invoices table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL REFERENCES bookings(id),
        agent_id TEXT NOT NULL REFERENCES users(id),
        status invoice_status NOT NULL DEFAULT 'draft',
        payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ invoices table");

    // Create deliveries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id TEXT PRIMARY KEY,
        truck_id TEXT NOT NULL REFERENCES trucks(id),
        status delivery_status NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ deliveries table");

    // Create delivery_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS delivery_items (
        id TEXT PRIMARY KEY,
        delivery_id TEXT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
        invoice_id TEXT NOT NULL REFERENCES invoices(id),
        destination_customer_id TEXT NOT NULL REFERENCES customers(id),
        status delivery_status NOT NULL DEFAULT 'pending',
        completed_at TIMESTAMP,
        receipt_number TEXT,
        is_paid BOOLEAN NOT NULL DEFAULT FALSE,
        payment_method VARCHAR(50),
        paid_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ delivery_items table");

    // Create receipts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        receipt_number TEXT NOT NULL UNIQUE,
        delivery_item_id TEXT NOT NULL REFERENCES delivery_items(id),
        customer_id TEXT NOT NULL REFERENCES customers(id),
        truck_id TEXT NOT NULL REFERENCES trucks(id),
        invoice_id TEXT NOT NULL REFERENCES invoices(id),
        confirmed_by TEXT,
        notes TEXT,
        confirmed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ receipts table");

    // Create accounts_receivable table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts_receivable (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customers(id),
        delivery_item_id TEXT NOT NULL REFERENCES delivery_items(id),
        invoice_id TEXT NOT NULL REFERENCES invoices(id),
        amount_due DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'outstanding',
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ accounts_receivable table");

    // Create audit_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        before_state TEXT,
        after_state TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ audit_logs table");

    // Seed admin user
    const existingAdmin = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      ["admin"]
    );
    if (!existingAdmin.rows.length) {
      const userId = uuid();
      const hashedPassword = await hash("admin123", 10);
      await pool.query(
        "INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, $4)",
        [userId, "admin", hashedPassword, "admin"]
      );
      const agentId = uuid();
      await pool.query(
        "INSERT INTO agents (id, user_id, full_name, email, is_active) VALUES ($1, $2, $3, $4, $5)",
        [agentId, userId, "Administrator", "admin@mabutoltrucking.com", true]
      );
      console.log("✓ Admin user created: admin / admin123");
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
