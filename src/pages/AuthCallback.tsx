import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handle = async () => {
      await supabase.auth.exchangeCodeForSession(window.location.href);
      navigate("/courses");
    };
    handle();
  }, [navigate]);

  return <p className="p-4">Signing in...</p>;
}
