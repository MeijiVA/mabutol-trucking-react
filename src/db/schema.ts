import { z } from "zod";

export enum UserRole {
  Admin = "admin",
  User = "user",
}

export enum CustomerStatus {
  Active = "active",
  Inactive = "inactive",
}

export enum VehicleStatus {
  Active = "active",
  InMaintenance = "in_maintenance",
  Retired = "retired",
}

export enum DriverStatus {
  Active = "active",
  OnLeave = "on_leave",
  Inactive = "inactive",
}

export enum ShipmentStatus {
  Pending = "pending",
  InTransit = "in_transit",
  Delivered = "delivered",
  Cancelled = "cancelled",
}

export enum ComplianceStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
}

// Zod Schemas for validation
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const CreateCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
});

export const UpdateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
});

export const CreateVehicleSchema = z.object({
  plate_number: z.string().min(1),
  model: z.string().optional(),
  year: z.number().int().optional(),
  status: z.nativeEnum(VehicleStatus).optional(),
});

export const UpdateVehicleSchema = z.object({
  plate_number: z.string().min(1).optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  status: z.nativeEnum(VehicleStatus).optional(),
});

export const CreateDriverSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  license_number: z.string().min(1),
  status: z.nativeEnum(DriverStatus).optional(),
});

export const UpdateDriverSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  license_number: z.string().min(1).optional(),
  status: z.nativeEnum(DriverStatus).optional(),
});

export const CreateShipmentSchema = z.object({
  customer_id: z.number().int(),
  vehicle_id: z.number().int().optional(),
  driver_id: z.number().int().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  status: z.nativeEnum(ShipmentStatus).optional(),
});

export const UpdateShipmentSchema = z.object({
  customer_id: z.number().int().optional(),
  vehicle_id: z.number().int().optional().nullable(),
  driver_id: z.number().int().optional().nullable(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  status: z.nativeEnum(ShipmentStatus).optional(),
});

export const CreateComplianceSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.nativeEnum(ComplianceStatus).optional(),
  due_date: z.string().datetime().optional(),
});

export const UpdateComplianceSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(ComplianceStatus).optional(),
  due_date: z.string().datetime().optional(),
});

export const CreatePricingSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional(),
});

export const UpdatePricingSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
});

// Response types
export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface Vehicle {
  id: number;
  plate_number: string;
  model: string | null;
  year: number | null;
  status: VehicleStatus;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface Driver {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  license_number: string;
  status: DriverStatus;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface Shipment {
  id: number;
  customer_id: number;
  vehicle_id: number | null;
  driver_id: number | null;
  origin: string | null;
  destination: string | null;
  status: ShipmentStatus;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface Compliance {
  id: number;
  title: string;
  description: string | null;
  status: ComplianceStatus;
  due_date: Date | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface Pricing {
  id: number;
  name: string;
  amount: number;
  description: string | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: number;
  user_id: number;
  message: string;
  is_read: boolean;
  created_at: Date;
}

export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  resource_type: string;
  resource_id: number | null;
  before_state: string | null;
  after_state: string | null;
  created_at: Date;
}

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;
export type CreateVehicle = z.infer<typeof CreateVehicleSchema>;
export type UpdateVehicle = z.infer<typeof UpdateVehicleSchema>;
export type CreateDriver = z.infer<typeof CreateDriverSchema>;
export type UpdateDriver = z.infer<typeof UpdateDriverSchema>;
export type CreateShipment = z.infer<typeof CreateShipmentSchema>;
export type UpdateShipment = z.infer<typeof UpdateShipmentSchema>;
export type CreateCompliance = z.infer<typeof CreateComplianceSchema>;
export type UpdateCompliance = z.infer<typeof UpdateComplianceSchema>;
export type CreatePricing = z.infer<typeof CreatePricingSchema>;
export type UpdatePricing = z.infer<typeof UpdatePricingSchema>;
