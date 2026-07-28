import React, { useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext, type AuthContextType } from "./auth-context";
import type { AppRole } from "@/types/database";


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    const [{ data: roles }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("full_name, register_number, department").eq("user_id", userId).single(),
    ]);

    const resolvedRole =
      roles?.find((roleItem) => roleItem.role === "admin")?.role ||
      (roles?.[0]?.role as AppRole) ||
      "student";

    setRole(resolvedRole);
    setProfile(prof ?? null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setRole(null);
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, registerNumber?: string, department?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          register_number: registerNumber || null,
          department: department || null,
        },
      },
    });

    if (error) {
      if (error.status === 429 || /rate limit/i.test(error.message)) {
        throw new Error(
          "Too many signup email requests. Email rate limit exceeded — please wait a short while before retrying."
        );
      }
      throw error;
    }

    let newUser = data.user ?? data.session?.user ?? null;
    if (!newUser) {
      const sessionResult = await supabase.auth.getSession();
      if (sessionResult.error) throw sessionResult.error;
      newUser = sessionResult.data.session?.user ?? null;
    }

    if (newUser) {
      await supabase.from("profiles").upsert({
        user_id: newUser.id,
        full_name: fullName,
        register_number: registerNumber || null,
        department: department || null,
      }, { onConflict: "user_id" });
      await fetchUserData(newUser.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

