import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { init } from "~/lib/server-fns";
import { useState } from "react";

export const Route = createFileRoute("/")({
  loader: () => init(),
  component: Home,
});

const submitWaitlist = createServerFn({ method: "POST" })
  .validator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const { randomUUID } = await import("node:crypto");
    const { initSchema, addWaitlistSignup } = await import("~/lib/retroai-db");
    await initSchema();
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return { success: false, error: "Please enter a valid email address" };
    }
    const ok = await addWaitlistSignup(randomUUID(), data.email);
    if (!ok) return { success: false, error: "This email is already on the waitlist!" };
    return { success: true };
  });

function RetroAILogo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 40" fill="none" className={className}>
      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2" fill="none" className="text-indigo-400" />
      <path d="M14 20l4-4m0 0l4 4m-4-4v10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500" />
      <circle cx="20" cy="20" r="3" fill="currentColor" className="text-cyan-400" />
      <circle cx="10" cy="14" r="1.5" fill="currentColor" className="text-indigo-400/60" />
      <circle cx="30" cy="14" r="1.5" fill="currentColor" className="text-indigo-400/60" />
      <circle cx="10" cy="26" r="1.5" fill="currentColor" className="text-indigo-400/60" />
      <circle cx="30" cy="26" r="1.5" fill="currentColor" className="text-indigo-400/60" />
      <text x="44" y="27" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="20" fill="currentColor">RetroAI</text>
    </svg>
  );
}

function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const result = await submitWaitlist({ data: { email } });
      if (result.success) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
        setErrorMsg(result.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Nav */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <RetroAILogo className="h-8 w-auto text-gray-900 dark:text-gray-100" />
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">Log in</Link>
            <Link to="/signup" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-400/30 hover:-translate-y-0.5">
              Get started free
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-4xl text-center">
            <span className="animate-fade-in inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300 dark:text-indigo-300">
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>
              AI-powered sprint retrospectives
            </span>
            <h1 className="animate-fade-in stagger-1 mt-8 text-5xl font-extrabold tracking-tight sm:text-7xl text-gray-900 dark:text-gray-100">
              Ship faster with{" "}
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                data-driven
              </span>{" "}
              retros
            </h1>
            <p className="animate-fade-in stagger-2 mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              RetroAI automatically analyzes your team's GitHub data — PRs, commits, cycle time, bug churn, and rework — and generates actionable retrospective reports. No more wasted meetings.
            </p>
            <div className="animate-fade-in stagger-3 mt-10 flex items-center justify-center gap-4">
              <Link to="/signup" className="rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-400/30 hover:-translate-y-0.5">
                Start for free
              </Link>
              <a href="#waitlist" className="rounded-xl border border-gray-300 dark:border-gray-700 px-8 py-3.5 text-base font-semibold text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-900 hover:-translate-y-0.5">
                Join the waitlist
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">How It Works</span>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">Set up in minutes. Improve every sprint.</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Three simple steps to transform your sprint retrospectives from guesswork into data-driven improvement.</p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { step: "01", title: "Connect GitHub", desc: "Grant RetroAI read-only access to your repos. We analyze PRs, commits, and cycle times automatically.", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
              { step: "02", title: "AI Analyzes", desc: "Our engine computes sprint metrics — cycle time, merge frequency, bug churn, rework rate, reviewer response time.", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
              { step: "03", title: "Get Actionable Reports", desc: "Receive a natural-language retro report with concrete insights and action items to improve sprint over sprint.", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
            ].map((item) => (
              <div key={item.step} className="group relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-8 text-center transition-all hover:border-gray-300 dark:hover:border-gray-700 hover:-translate-y-1">
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-bold ${item.color}`}>{item.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">Pricing</span>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Start free. Upgrade as you grow. No hidden fees, no surprises.</p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { name: "Free", price: "$0", desc: "1 retro/month, public repos, up to 10 members", features: ["1 automated retro/mo", "Public repos only", "Up to 10 team members", "Email support"], cta: "Get Started", popular: false },
              { name: "Pro", price: "$49", desc: "Unlimited retros, private repos, Slack integration", features: ["Unlimited retros", "Private repos", "Slack integration", "Multiple teams", "Priority support", "Advanced analytics"], cta: "Start Free Trial", popular: true },
              { name: "Enterprise", price: "$149", desc: "Custom templates, SSO, dedicated support", features: ["Everything in Pro", "Custom retro templates", "SSO / SAML", "Dedicated account manager", "Custom integrations", "99.9% SLA"], cta: "Contact Sales", popular: false },
            ].map((plan) => (
              <div key={plan.name} className={`relative rounded-2xl border p-8 transition-all ${
                plan.popular
                  ? "border-indigo-500/50 bg-gray-900 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/20"
                  : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 hover:border-gray-300 dark:hover:border-gray-700"
              }`}>
                {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white shadow-lg">Most Popular</div>}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                <p className="mt-4"><span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">{plan.price}</span><span className="text-gray-500">/month</span></p>
                <p className="mt-2 text-sm text-gray-500">{plan.desc}</p>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <svg className="h-4 w-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                  plan.popular
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500"
                    : "border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}>
                  {plan.cta}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section id="waitlist" className="border-t border-gray-200 dark:border-gray-800 bg-indigo-500/5 dark:bg-indigo-500/5">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl">
            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gray-900/70 backdrop-blur-xl p-8 sm:p-12">
              <div className="pointer-events-none absolute -inset-40" style={{ background: "radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
              <div className="relative text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                  Early Access
                </span>
                <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">Get early access to RetroAI</h2>
                <p className="mt-4 text-lg text-gray-400">Join the waitlist. We're launching soon and will let you in first.</p>
                <div className="mt-8 mx-auto max-w-md">
                  {status === "success" ? (
                    <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-6 py-4 text-green-400">
                      <p className="font-medium">You're on the list! 🎉</p>
                      <p className="mt-1 text-sm text-green-400/70">We'll notify you when RetroAI is ready.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleWaitlist} className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com" required
                        className="flex-1 rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button type="submit" disabled={status === "loading"}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-400/30 disabled:opacity-50 disabled:cursor-not-allowed">
                        {status === "loading" ? "Submitting..." : "Join Waitlist"}
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                      </button>
                    </form>
                  )}
                  {status === "error" && <p className="mt-3 text-sm text-red-400">{errorMsg}</p>}
                  <p className="mt-4 text-xs text-gray-500">No spam, ever. We'll only email you about RetroAI launch updates.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center gap-2 mb-4">
            <RetroAILogo className="h-6 w-auto text-gray-400" />
          </div>
          <p>&copy; {new Date().getFullYear()} RetroAI. Built for engineering teams.</p>
        </div>
      </footer>
    </div>
  );
}