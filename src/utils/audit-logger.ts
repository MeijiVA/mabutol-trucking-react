import { Pool } from "pg";

export interface AuditLogEntry {
  userId: number;
  action: string;
  resourceType: string;
  resourceId?: number | null;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
}

export class AuditLogger {
  constructor(private pool: Pool) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO audit_logs 
         (user_id, action, resource_type, resource_id, before_state, after_state) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          entry.userId,
          entry.action,
          entry.resourceType,
          entry.resourceId || null,
          entry.beforeState ? JSON.stringify(entry.beforeState) : null,
          entry.afterState ? JSON.stringify(entry.afterState) : null,
        ]
      );
    } catch (error) {
      console.error("Audit logging failed:", error);
    }
  }
}
