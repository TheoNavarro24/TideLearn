import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

export default function SignIn() {
  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <main className="container mx-auto py-10 flex flex-col items-center gap-4">
      <h1 className="text-3xl font-bold">Sign In</h1>
      <Button onClick={signIn}>Sign in with Google</Button>
    </main>
  );
}
