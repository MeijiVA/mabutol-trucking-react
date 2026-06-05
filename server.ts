import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";
import {
  UserRole,
  LoginRequestSchema,
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CreateVehicleSchema,
  UpdateVehicleSchema,
  CreateDriverSchema,
  UpdateDriverSchema,
  CreateShipmentSchema,
  UpdateShipmentSchema,
  CreateComplianceSchema,
  UpdateComplianceSchema,
  CreatePricingSchema,
  UpdatePricingSchema,
} from "./src/db/schema.js";
import {
  signToken,
  verifyToken,
  verifyPassword,
  hashPassword,
  TokenPayload,
} from "./src/utils/auth.js";
import { AuditLogger } from "./src/utils/audit-logger.js";

dotenv.config();

const app = express();
const PORT = 5000;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const auditLogger = new AuditLogger(pool);

app.use(cors());
app.use(express.json());

// Middleware: Verify JWT token
interface AuthRequest extends Request {
  user?: TokenPayload;
}

const verifyJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
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

// Middleware: Validate request body with Zod schema
const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      (req as any).validatedBody = validated;
      next();
    } catch (error: any) {
      res.status(400).json({ error: "Validation error", details: error.errors });
    }
  };
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────

app.post("/api/auth/login", validateRequest(LoginRequestSchema), async (req, res) => {
  try {
    const { email, password } = (req as any).validatedBody;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, name, role FROM users WHERE id = $1",
      [req.user?.userId]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CUSTOMER ROUTES ──────────────────────────────────────────────────────

app.get("/api/customers", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query("SELECT * FROM customers ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/customers/:id", verifyJWT, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM customers WHERE id = $1", [req.params.id]);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/customers",
  verifyJWT,
  validateRequest(CreateCustomerSchema),
  async (req: AuthRequest, res) => {
    try {
      const { name, email, phone, address, city, state, zip_code } = (req as any).validatedBody;
      const result = await pool.query(
        `INSERT INTO customers (name, email, phone, address, city, state, zip_code, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [name, email, phone, address, city, state, zip_code, req.user?.userId]
      );
      const customer = result.rows[0];

      await auditLogger.log({
        userId: req.user?.userId || 0,
        action: "CREATE",
        resourceType: "customer",
        resourceId: customer.id,
        afterState: customer,
      });

      res.json(customer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.patch(
  "/api/customers/:id",
  verifyJWT,
  validateRequest(UpdateCustomerSchema),
  async (req: AuthRequest, res) => {
    try {
      const before = await pool.query("SELECT * FROM customers WHERE id = $1", [req.params.id]);
      const { name, email, phone, address, city, state, zip_code } = (req as any).validatedBody;

      const result = await pool.query(
        `UPDATE customers SET name = COALESCE($1, name), email = COALESCE($2, email), 
         phone = COALESCE($3, phone), address = COALESCE($4, address), 
         city = COALESCE($5, city), state = COALESCE($6, state), 
         zip_code = COALESCE($7, zip_code), updated_at = CURRENT_TIMESTAMP
         WHERE id = $8 RETURNING *`,
        [name, email, phone, address, city, state, zip_code, req.params.id]
      );

      await auditLogger.log({
        userId: req.user?.userId || 0,
        action: "UPDATE",
        resourceType: "customer",
        resourceId: parseInt(req.params.id),
        beforeState: before.rows[0],
        afterState: result.rows[0],
      });

      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.delete("/api/customers/:id", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const before = await pool.query("SELECT * FROM customers WHERE id = $1", [req.params.id]);
    await pool.query("DELETE FROM customers WHERE id = $1", [req.params.id]);

    await auditLogger.log({
      userId: req.user?.userId || 0,
      action: "DELETE",
      resourceType: "customer",
      resourceId: parseInt(req.params.id),
      beforeState: before.rows[0],
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── VEHICLE ROUTES ───────────────────────────────────────────────────────

app.get("/api/vehicles", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query("SELECT * FROM vehicles ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/vehicles/:id", verifyJWT, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM vehicles WHERE id = $1", [req.params.id]);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/vehicles",
  verifyJWT,
  validateRequest(CreateVehicleSchema),
  async (req: AuthRequest, res) => {
    try {
      const { plate_number, model, year, status } = (req as any).validatedBody;
      const result = await pool.query(
        `INSERT INTO vehicles (plate_number, model, year, status, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [plate_number, model, year, status || "active", req.user?.userId]
      );
      const vehicle = result.rows[0];

      await auditLogger.log({
        userId: req.user?.userId || 0,
        action: "CREATE",
        resourceType: "vehicle",
        resourceId: vehicle.id,
        afterState: vehicle,
      });

      res.json(vehicle);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.patch(
  "/api/vehicles/:id",
  verifyJWT,
  validateRequest(UpdateVehicleSchema),
  async (req: AuthRequest, res) => {
    try {
      const before = await pool.query("SELECT * FROM vehicles WHERE id = $1", [req.params.id]);
      const { plate_number, model, year, status } = (req as any).validatedBody;

      const result = await pool.query(
        `UPDATE vehicles SET plate_number = COALESCE($1, plate_number), model = COALESCE($2, model),
         year = COALESCE($3, year), status = COALESCE($4, status), updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 RETURNING *`,
        [plate_number, model, year, status, req.params.id]
      );

      await auditLogger.log({
        userId: req.user?.userId || 0,
        action: "UPDATE",
        resourceType: "vehicle",
        resourceId: parseInt(req.params.id),
        beforeState: before.rows[0],
        afterState: result.rows[0],
      });

      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.delete("/api/vehicles/:id", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const before = await pool.query("SELECT * FROM vehicles WHERE id = $1", [req.params.id]);
    await pool.query("DELETE FROM vehicles WHERE id = $1", [req.params.id]);

    await auditLogger.log({
      userId: req.user?.userId || 0,
      action: "DELETE",
      resourceType: "vehicle",
      resourceId: parseInt(req.params.id),
      beforeState: before.rows[0],
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DRIVER ROUTES ────────────────────────────────────────────────────────

app.get("/api/drivers", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query("SELECT * FROM drivers ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/drivers/:id", verifyJWT, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM drivers WHERE id = $1", [req.params.id]);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/drivers",
  verifyJWT,
  validateRequest(CreateDriverSchema),
  async (req: AuthRequest, res) => {
    try {
      const { name, email, phone, license_number, status } = (req as any).validatedBody;
      const result = await pool.query(
        `INSERT INTO drivers (name, email, phone, license_number, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, email, phone, license_number, status || "active", req.user?.userId]
      );
      const driver = result.rows[0];

      await auditLogger.log({
        userId: req.user?.userId || 0,
        action: "CREATE",
        resourceType: "driver",
        resourceId: driver.id,
        afterState: driver,
      });

      res.json(driver);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.patch(
  "/api/drivers/:id",
  verifyJWT,
  validateRequest(UpdateDriverSchema),
  async (req: AuthRequest, res) => {
    try {
      const before = await pool.query("SELECT * FROM drivers WHERE id = $1", [req.params.id]);
      const { name, email, phone, license_number, status } = (req as any).validatedBody;

      const result = await pool.query(
        `UPDATE drivers SET name = COALESCE($1, name), email = COALESCE($2, email),
         phone = COALESCE($3, phone), license_number = COALESCE($4, license_number),
         status = COALESCE($5, status), updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 RETURNING *`,
        [name, email, phone, license_number, status, req.params.id]
      );

      await auditLogger.log({
        userId: req.user?.userId || 0,
        action: "UPDATE",
        resourceType: "driver",
        resourceId: parseInt(req.params.id),
        beforeState: before.rows[0],
        afterState: result.rows[0],
      });

      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.delete("/api/drivers/:id", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const before = await pool.query("SELECT * FROM drivers WHERE id = $1", [req.params.id]);
    await pool.query("DELETE FROM drivers WHERE id = $1", [req.params.id]);

    await auditLogger.log({
      userId: req.user?.userId || 0,
      action: "DELETE",
      resourceType: "driver",
      resourceId: parseInt(req.params.id),
      beforeState: before.rows[0],
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SHIPMENT ROUTES ──────────────────────────────────────────────────────

app.get("/api/shipments", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query("SELECT * FROM shipments ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/shipments/:id", verifyJWT, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM shipments WHERE id = $1", [req.params.id]);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/shipments",
  verifyJWT,
  validateRequest(CreateShipmentSchema),
  async (req: AuthRequest, res) => {
    try {
      const { customer_id, vehicle_id, driver_id, origin, destination, status } = (req as any)
        .validatedBody;
      const result = await pool.query(
        `INSERT INTO shipments (customer_id, vehicle_id, driver_id, origin, destination, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [customer_id, vehicle_id, driver_id, origin, destination, status || "pending", req.user?.userId]
      );
      const shipment = result.rows[0];

      await auditLogger.log({
        userId: req.user?.userId || 0,
        action: "CREATE",
        resourceType: "shipment",
        resourceId: shipment.id,
        afterState: shipment,
      });

      res.json(shipment);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.patch(
  "/api/shipments/:id",
  verifyJWT,
  validateRequest(UpdateShipmentSchema),
  async (req: AuthRequest, res) => {
    try {
      const before = await pool.query("SELECT * FROM shipments WHERE id = $1", [req.params.id]);
      const { customer_id, vehicle_id, driver_id, origin, destination, status } = (req as any)
        .validatedBody;

      const result = await pool.query(
        `UPDATE shipments SET customer_id = COALESCE($1, customer_id), 
         vehicle_id = COALESCE($2, vehicle_id), driver_id = COALESCE($3, driver_id),
         origin = COALESCE($4, origin), destination = COALESCE($5, destination),
         status = COALESCE($6, status), updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 RETURNING *`,
        [customer_id, vehicle_id, driver_id, origin, destination, status, req.params.id]
      );

      await auditLogger.log({
        userId: req.user?.userId || 0,
        action: "UPDATE",
        resourceType: "shipment",
        resourceId: parseInt(req.params.id),
        beforeState: before.rows[0],
        afterState: result.rows[0],
      });

      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.delete("/api/shipments/:id", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const before = await pool.query("SELECT * FROM shipments WHERE id = $1", [req.params.id]);
    await pool.query("DELETE FROM shipments WHERE id = $1", [req.params.id]);

    await auditLogger.log({
      userId: req.user?.userId || 0,
      action: "DELETE",
      resourceType: "shipment",
      resourceId: parseInt(req.params.id),
      beforeState: before.rows[0],
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── COMPLIANCE ROUTES ────────────────────────────────────────────────────

app.get("/api/compliance", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query("SELECT * FROM compliance ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/compliance",
  verifyJWT,
  validateRequest(CreateComplianceSchema),
  async (req: AuthRequest, res) => {
    try {
      const { title, description, status, due_date } = (req as any).validatedBody;
      const result = await pool.query(
        `INSERT INTO compliance (title, description, status, due_date, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [title, description, status || "pending", due_date, req.user?.userId]
      );
      const compliance = result.rows[0];

      await auditLogger.log({
        userId: req.user?.userId || 0,
        action: "CREATE",
        resourceType: "compliance",
        resourceId: compliance.id,
        afterState: compliance,
      });

      res.json(compliance);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.patch(
  "/api/compliance/:id",
  verifyJWT,
  validateRequest(UpdateComplianceSchema),
  async (req: AuthRequest, res) => {
    try {
      const before = await pool.query("SELECT * FROM compliance WHERE id = $1", [req.params.id]);
      const { title, description, status, due_date } = (req as any).validatedBody;

      const result = await pool.query(
        `UPDATE compliance SET title = COALESCE($1, title), description = COALESCE($2, description),
         status = COALESCE($3, status), due_date = COALESCE($4, due_date), updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 RETURNING *`,
        [title, description, status, due_date, req.params.id]
      );

      await auditLogger.log({
        userId: req.user?.userId || 0,
        action: "UPDATE",
        resourceType: "compliance",
        resourceId: parseInt(req.params.id),
        beforeState: before.rows[0],
        afterState: result.rows[0],
      });

      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.delete("/api/compliance/:id", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const before = await pool.query("SELECT * FROM compliance WHERE id = $1", [req.params.id]);
    await pool.query("DELETE FROM compliance WHERE id = $1", [req.params.id]);

    await auditLogger.log({
      userId: req.user?.userId || 0,
      action: "DELETE",
      resourceType: "compliance",
      resourceId: parseInt(req.params.id),
      beforeState: before.rows[0],
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PRICING ROUTES ───────────────────────────────────────────────────────

app.get("/api/pricing", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query("SELECT * FROM pricing ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/pricing",
  verifyJWT,
  validateRequest(CreatePricingSchema),
  async (req: AuthRequest, res) => {
    try {
      const { name, amount, description } = (req as any).validatedBody;
      const result = await pool.query(
        `INSERT INTO pricing (name, amount, description, created_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, amount, description, req.user?.userId]
      );
      const pricing = result.rows[0];

      await auditLogger.log({
        userId: req.user?.userId || 0,
        action: "CREATE",
        resourceType: "pricing",
        resourceId: pricing.id,
        afterState: pricing,
      });

      res.json(pricing);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.patch(
  "/api/pricing/:id",
  verifyJWT,
  validateRequest(UpdatePricingSchema),
  async (req: AuthRequest, res) => {
    try {
      const before = await pool.query("SELECT * FROM pricing WHERE id = $1", [req.params.id]);
      const { name, amount, description } = (req as any).validatedBody;

      const result = await pool.query(
        `UPDATE pricing SET name = COALESCE($1, name), amount = COALESCE($2, amount),
         description = COALESCE($3, description), updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 RETURNING *`,
        [name, amount, description, req.params.id]
      );

      await auditLogger.log({
        userId: req.user?.userId || 0,
        action: "UPDATE",
        resourceType: "pricing",
        resourceId: parseInt(req.params.id),
        beforeState: before.rows[0],
        afterState: result.rows[0],
      });

      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.delete("/api/pricing/:id", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const before = await pool.query("SELECT * FROM pricing WHERE id = $1", [req.params.id]);
    await pool.query("DELETE FROM pricing WHERE id = $1", [req.params.id]);

    await auditLogger.log({
      userId: req.user?.userId || 0,
      action: "DELETE",
      resourceType: "pricing",
      resourceId: parseInt(req.params.id),
      beforeState: before.rows[0],
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DASHBOARD ROUTES ─────────────────────────────────────────────────────

app.get("/api/dashboard/stats", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const customers = await pool.query("SELECT COUNT(*) as count FROM customers");
    const shipments = await pool.query("SELECT COUNT(*) as count FROM shipments");
    const vehicles = await pool.query("SELECT COUNT(*) as count FROM vehicles");
    const drivers = await pool.query("SELECT COUNT(*) as count FROM drivers");

    res.json({
      customers: customers.rows[0].count,
      shipments: shipments.rows[0].count,
      vehicles: vehicles.rows[0].count,
      drivers: drivers.rows[0].count,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/dashboard/feed", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT 'shipment' as type, 'Created shipment' as message, created_at FROM shipments 
      UNION ALL 
      SELECT 'customer' as type, 'Added customer' as message, created_at FROM customers 
      ORDER BY created_at DESC LIMIT 10
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/dashboard/alerts", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT 'alert' as type, title as message FROM compliance WHERE status = 'pending' LIMIT 5
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── NOTIFICATIONS ROUTES ─────────────────────────────────────────────────

app.get("/api/notifications", verifyJWT, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user?.userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/notifications/:id/read", verifyJWT, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/notifications/read-all", verifyJWT, async (req: AuthRequest, res) => {
  try {
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1", [
      req.user?.userId,
    ]);
    res.json({ success: true });
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
