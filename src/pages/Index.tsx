import hero from "@/assets/hero-rise.jpg";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthContext";

const Index = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-hero">
      <header className="container mx-auto py-6 flex items-center justify-between">
        <a href="/" className="text-lg font-semibold text-gradient">Rise-like Builder</a>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/courses" className="hover:underline">Course Manager</a>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">Welcome, {user.email}</span>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          ) : (
            <a href="/auth">
              <Button variant="outline" size="sm">Sign In</Button>
            </a>
          )}
        </nav>
      </header>

      <main className="container mx-auto grid gap-10 lg:grid-cols-2 items-center py-10">
        <section>
          <h1 className="text-4xl font-bold leading-tight mb-4">Rapid E-learning Authoring Tool</h1>
          <p className="text-lg text-muted-foreground mb-6">Create responsive, beautiful courses in minutes. Publish a shareable URL you can embed on Google Sites.</p>
          <div className="flex gap-3">
            <a href="/courses"><Button variant="hero" className="animate-float">Start authoring</Button></a>
            <a href="#features"><Button variant="outline">See features</Button></a>
          </div>
        </section>
        <section>
          <img src={hero} alt="Rapid e-learning authoring interface preview" loading="lazy" className="w-full rounded-xl border shadow-[var(--shadow-elevated)]" />
        </section>
      </main>

      <section id="features" className="container mx-auto py-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "Block-based editing", desc: "Compose lessons from headings, text, images, and quizzes." },
          { title: "Instant publish", desc: "One click to get a URL you can embed on Google Sites." },
          { title: "Responsive by default", desc: "Looks great on desktop, tablet, and phone." },
        ].map((f) => (
          <article key={f.title} className="card-surface p-5">
            <h3 className="font-semibold mb-1">{f.title}</h3>
            <p className="text-muted-foreground">{f.desc}</p>
          </article>
        ))}
      </section>

      <footer className="container mx-auto py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Rise-like Builder
      </footer>
    </div>
  );
};

export default Index;
