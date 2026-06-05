import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./src/db/schema.js";
import { users, agents, customers, products, drivers, trucks, bookings, booking_items, invoices, deliveries, delivery_items, audit_logs } from "./src/db/schema.js";
import { signToken, verifyToken, verifyPassword, hashPassword } from "./src/utils/auth.js";

interface TokenPayload {
  userId: string;
  username: string;
  role: "admin" | "agent";
}

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Middleware: Verify JWT token
interface AuthRequest extends express.Request {
  user?: TokenPayload;
}

const verifyJWT = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.user = payload;
  next();
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────

app.post("/api/auth/login", async (req: express.Request, res: express.Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const result = await db.select().from(users).where(eq(users.username, username));
    const user = result[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role as "admin" | "agent",
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", verifyJWT, async (req: AuthRequest, res: express.Response) => {
  try {
    const result = await db.select().from(users).where(eq(users.id, req.user?.userId || ""));
    const user = result[0];
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CUSTOMER ROUTES ──────────────────────────────────────────────────────

app.get("/api/customers", verifyJWT, async (req: AuthRequest, res: express.Response) => {
  try {
    const result = await db.select().from(customers);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/customers/:id", verifyJWT, async (req: express.Request, res: express.Response) => {
  try {
    const result = await db.select().from(customers).where(eq(customers.id, req.params.id));
    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/customers", verifyJWT, async (req: AuthRequest, res: express.Response) => {
  try {
    const { store_name, location, contact_person, contact_info, payment_type, tax_rate, agent_id } = req.body;
    
    if (!store_name || !location) {
      return res.status(400).json({ error: "Store name and location required" });
    }

    const customerId = uuid();
    await db.insert(customers).values({
      id: customerId,
      store_name,
      location,
      contact_person,
      contact_info,
      payment_type,
      tax_rate: tax_rate ? String(tax_rate) : undefined,
      agent_id,
    });

    const result = await db.select().from(customers).where(eq(customers.id, customerId));
    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/customers/:id", verifyJWT, async (req: AuthRequest, res: express.Response) => {
  try {
    const { store_name, location, contact_person, contact_info, payment_type, tax_rate, agent_id } = req.body;
    
    await db.update(customers)
      .set({
        ...(store_name && { store_name }),
        ...(location && { location }),
        ...(contact_person !== undefined && { contact_person }),
        ...(contact_info !== undefined && { contact_info }),
        ...(payment_type && { payment_type }),
        ...(tax_rate !== undefined && { tax_rate: String(tax_rate) }),
        ...(agent_id && { agent_id }),
        updated_at: new Date(),
      })
      .where(eq(customers.id, req.params.id));

    const result = await db.select().from(customers).where(eq(customers.id, req.params.id));
    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/customers/:id", verifyJWT, async (req: AuthRequest, res: express.Response) => {
  try {
    await db.delete(customers).where(eq(customers.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DRIVER ROUTES ────────────────────────────────────────────────────────

app.get("/api/drivers", verifyJWT, async (req: AuthRequest, res: express.Response) => {
  try {
    const result = await db.select().from(drivers);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/drivers/:id", verifyJWT, async (req: express.Request, res: express.Response) => {
  try {
    const result = await db.select().from(drivers).where(eq(drivers.id, req.params.id));
    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/drivers", verifyJWT, async (req: AuthRequest, res: express.Response) => {
  try {
    const { full_name, contact_info, license, hire_date, employment_type, is_active } = req.body;
    
    if (!full_name) {
      return res.status(400).json({ error: "Full name required" });
    }

    const driverId = uuid();
    await db.insert(drivers).values({
      id: driverId,
      full_name,
      contact_info,
      license,
      hire_date,
      employment_type,
      is_active: is_active ?? true,
    });

    const result = await db.select().from(drivers).where(eq(drivers.id, driverId));
    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/drivers/:id", verifyJWT, async (req: AuthRequest, res: express.Response) => {
  try {
    const { full_name, contact_info, license, hire_date, employment_type, is_active } = req.body;
    
    await db.update(drivers)
      .set({
        ...(full_name && { full_name }),
        ...(contact_info !== undefined && { contact_info }),
        ...(license && { license }),
        ...(hire_date && { hire_date }),
        ...(employment_type && { employment_type }),
        ...(is_active !== undefined && { is_active }),
        updated_at: new Date(),
      })
      .where(eq(drivers.id, req.params.id));

    const result = await db.select().from(drivers).where(eq(drivers.id, req.params.id));
    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/drivers/:id", verifyJWT, async (req: AuthRequest, res: express.Response) => {
  try {
    await db.delete(drivers).where(eq(drivers.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TRUCK ROUTES ─────────────────────────────────────────────────────────

app.get("/api/trucks", verifyJWT, async (req: AuthRequest, res: express.Response) => {
  try {
    const result = await db.select().from(trucks);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/trucks/:id", verifyJWT, async (req: express.Request, res: express.Response) => {
  try {
    const result = await db.select().from(trucks).where(eq(trucks.id, req.params.id));
    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/trucks", verifyJWT, async (req: AuthRequest, res: express.Response) => {
  try {
    const { name, district, driver_id, status } = req.body;
    
    if (!name || !district) {
      return res.status(400).json({ error: "Name and district required" });
    }

    const truckId = uuid();
    await db.insert(trucks).values({
      id: truckId,
      name,
      district,
      driver_id,
      status: (status || "available") as any,
    });

    const result = await db.select().from(trucks).where(eq(trucks.id, truckId));
    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/trucks/:id", verifyJWT, async (req: AuthRequest, res: express.Response) => {
  try {
    const { name, district, driver_id, status } = req.body;
    
    await db.update(trucks)
      .set({
        ...(name && { name }),
        ...(district && { district }),
        ...(driver_id !== undefined && { driver_id }),
        ...(status && { status: status as any }),
        updated_at: new Date(),
      })
      .where(eq(trucks.id, req.params.id));

    const result = await db.select().from(trucks).where(eq(trucks.id, req.params.id));
    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/trucks/:id", verifyJWT, async (req: AuthRequest, res: express.Response) => {
  try {
    await db.delete(trucks).where(eq(trucks.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PRODUCT ROUTES ───────────────────────────────────────────────────────

app.get("/api/products", verifyJWT, async (req: AuthRequest, res: express.Response) => {
  try {
    const result = await db.select().from(products);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const { name, sku, price, image_filename, batch_tracking_enabled, manufacturer, reorder_point, is_discontinued } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ error: "Name and price required" });
    }

    const productId = uuid();
    await db.insert(products).values({
      id: productId,
      name,
      sku,
      price: String(price),
      image_filename,
      batch_tracking_enabled: batch_tracking_enabled ?? true,
      manufacturer,
      reorder_point,
      is_discontinued: is_discontinued ?? false,
    });

    const result = await db.select().from(products).where(eq(products.id, productId));
    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BOOKING ROUTES ───────────────────────────────────────────────────────

app.get("/api/bookings", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const result = await db.select().from(bookings);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/bookings", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const { customer_id, truck_id, status, items } = req.body;
    
    if (!customer_id) {
      return res.status(400).json({ error: "Customer ID required" });
    }

    const bookingId = uuid();
    await db.insert(bookings).values({
      id: bookingId,
      customer_id,
      truck_id,
      status: (status || "pending") as any,
    });

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await db.insert(booking_items).values({
          id: uuid(),
          booking_id: bookingId,
          product_id: item.product_id,
          qty_ordered: item.qty_ordered,
        });
      }
    }

    const result = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── INVOICE ROUTES ───────────────────────────────────────────────────────

app.get("/api/invoices", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const result = await db.select().from(invoices);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/invoices", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const { booking_id, agent_id, status, payment_status } = req.body;
    
    if (!booking_id || !agent_id) {
      return res.status(400).json({ error: "Booking ID and Agent ID required" });
    }

    const invoiceId = uuid();
    await db.insert(invoices).values({
      id: invoiceId,
      booking_id,
      agent_id,
      status: (status || "draft") as any,
      payment_status: payment_status || "unpaid",
    });

    const result = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELIVERY ROUTES ──────────────────────────────────────────────────────

app.get("/api/deliveries", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const result = await db.select().from(deliveries);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/deliveries", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const { truck_id, status, items } = req.body;
    
    if (!truck_id) {
      return res.status(400).json({ error: "Truck ID required" });
    }

    const deliveryId = uuid();
    await db.insert(deliveries).values({
      id: deliveryId,
      truck_id,
      status: (status || "pending") as any,
    });

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await db.insert(delivery_items).values({
          id: uuid(),
          delivery_id: deliveryId,
          invoice_id: item.invoice_id,
          destination_customer_id: item.destination_customer_id,
          status: "pending",
        });
      }
    }

    const result = await db.select().from(deliveries).where(eq(deliveries.id, deliveryId));
    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DASHBOARD ROUTES ─────────────────────────────────────────────────────

app.get("/api/dashboard/stats", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const customerCount = await db.select().from(customers);
    const bookingCount = await db.select().from(bookings);
    const truckCount = await db.select().from(trucks);
    const driverCount = await db.select().from(drivers);

    res.json({
      customers: customerCount.length,
      bookings: bookingCount.length,
      trucks: truckCount.length,
      drivers: driverCount.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const start = async () => {
  app.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
  });
};

start();
