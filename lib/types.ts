export type Role = "boss" | "secretary";
export type TripStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled";
export type ActionState = { error?: string; success?: string };
export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  role: Role;
};

export type Driver = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  license_number: string;
  license_expiry: string | null;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  employment_status: "active" | "inactive";
  notes: string;
};

export type Vehicle = {
  id: string;
  label: string;
  make_model: string;
  plate_number: string;
  capacity: number;
  service_status: "available" | "maintenance" | "out_of_service";
  notes: string;
};

export type Trip = {
  id: string;
  client_name: string;
  client_phone: string;
  pickup_location: string;
  destination: string;
  starts_at: string;
  estimated_return_at: string;
  passenger_count: number;
  vehicle_id: string;
  status: TripStatus;
  notes: string;
  special_requirements: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  vehicle?: Pick<Vehicle, "id" | "label" | "plate_number" | "capacity" | "service_status"> | null;
  drivers?: Array<Pick<Driver, "id" | "full_name" | "phone">>;
  creator?: Pick<Profile, "display_name" | "email"> | null;
  editor?: Pick<Profile, "display_name" | "email"> | null;
};

export type DriverAvailability = {
  id: string;
  driver_id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
  driver?: Pick<Driver, "full_name"> | null;
};

export type TripHistory = {
  id: number;
  trip_id: string;
  action: "created" | "updated";
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown>;
  created_at: string;
  actor?: Pick<Profile, "display_name" | "email"> | null;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  trip_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  billing_address: string;
  description: string;
  issued_on: string;
  due_on: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  notes: string;
  paid_at: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};
