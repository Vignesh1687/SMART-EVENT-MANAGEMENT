import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { AppRole } from "@/types/database";

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: { full_name: string; register_number: string | null; department: string | null } | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, registerNumber?: string, department?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
