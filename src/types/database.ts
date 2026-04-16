export type AppRole = "admin" | "student";
export type RegistrationStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  register_number: string | null;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  user_id: string;
  event_id: string;
  status: RegistrationStatus;
  created_at: string;
  updated_at: string;
}
