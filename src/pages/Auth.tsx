import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("supabase.auth.") || key.includes("sb-")) {
        localStorage.removeItem(key);
      }
    });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clean up existing state
      cleanupAuthState();

      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: "global" });
      } catch (err) {
        // Continue even if this fails
      }

      if (isSignUp) {
        if (password !== confirmPassword) {
          toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
          return;
        }

        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) throw error;

        toast({
          title: "Sign up successful",
          description: "Please check your email to confirm your account",
        });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          // Force page reload for clean state
          window.location.href = "/";
        }
      }
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      cleanupAuthState();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message || "Google sign-in failed",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--ocean-deepest, #071612)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "2px solid transparent",
            borderTopColor: "#14b8a6",
            borderRightColor: "#06b6d4",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ocean-deepest, #071612)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: "16px",
      }}
    >
      {/* Background glows */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: [
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(13,148,136,0.18) 0%, transparent 60%)",
            "radial-gradient(ellipse 50% 40% at 80% 100%, rgba(6,182,212,0.1) 0%, transparent 55%)",
            "linear-gradient(180deg, transparent 0%, rgba(20,184,166,0.04) 100%)",
          ].join(", "),
        }}
      />

      {/* Card */}
      <div
        style={{
          width: 400,
          maxWidth: "100%",
          position: "relative",
          zIndex: 1,
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          boxShadow:
            "0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(20,184,166,0.06) inset",
          overflow: "hidden",
        }}
      >
        {/* Teal stripe */}
        <div
          style={{
            height: 3,
            background: "linear-gradient(90deg, #14b8a6, #06b6d4, #0891b2)",
          }}
        />

        {/* Card body */}
        <div style={{ padding: "36px 36px 32px" }}>
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "linear-gradient(135deg, #14b8a6, #06b6d4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              🌊
            </div>
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 800,
                fontSize: 15,
                color: "#fff",
                letterSpacing: "-0.01em",
              }}
            >
              TideLearn
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "Lora, Georgia, serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              margin: "0 0 6px",
              lineHeight: 1.2,
            }}
          >
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 13,
              color: "rgba(148,210,204,0.6)",
              margin: "0 0 24px",
              lineHeight: 1.4,
            }}
          >
            {isSignUp
              ? "Start building your first course."
              : "Sign in to access your courses."}
          </p>

          {/* Google OAuth button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 20,
              transition: "background 0.15s",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {/* Google SVG icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                flex: 1,
                height: 1,
                background: "rgba(148,210,204,0.15)",
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: "rgba(148,210,204,0.4)",
                whiteSpace: "nowrap",
                letterSpacing: "0.05em",
              }}
            >
              or email
            </span>
            <div
              style={{
                flex: 1,
                height: 1,
                background: "rgba(148,210,204,0.15)",
              }}
            />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(20,184,166,0.5)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(20,184,166,0.5)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              }}
            />
            {isSignUp && (
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(20,184,166,0.5)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }}
              />
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "11px 14px",
                background: "linear-gradient(135deg, #0d9488, #0891b2)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: 4,
                opacity: loading ? 0.7 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {loading
                ? "Signing in..."
                : isSignUp
                ? "Create account →"
                : "Sign in →"}
            </button>
          </form>
        </div>

        {/* Card footer */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.15)",
            padding: "16px 36px",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: 12, color: "rgba(148,210,204,0.4)" }}>
            {isSignUp ? "Already have an account? " : "No account? "}
          </span>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              background: "none",
              border: "none",
              color: "#5eead4",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
            }}
          >
            {isSignUp ? "Sign in" : "Create one free"}
          </button>
        </div>
      </div>

      <style>{`
        input::placeholder { color: rgba(148,210,204,0.3); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
