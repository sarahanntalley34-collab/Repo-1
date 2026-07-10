import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";

// --- Server Functions ---

const getBusinessName = createServerFn({ method: "GET" }).handler(async () => {
  return "RetroAI";
});

const submitWaitlist = createServerFn({ method: "POST" }).handler(async ({ data }: { data: { email: string } }) => {
  // In production, this would write to a database
  // For now, we validate and return success
  const { email } = data;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please enter a valid email address" };
  }
  // TODO: Store in DB when connected
  return { success: true };
});

export const Route = createFileRoute("/")({
  loader: () => getBusinessName(),
  component: Home,
});

// --- Logo Component ---

function RetroAILogo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Retro icon */}
      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2" fill="none" className="text-indigo-400" />
      <path d="M14 20l4-4m0 0l4 4m-4-4v10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500" />
      <circle cx="20" cy="20" r="3" fill="currentColor" className="text-cyan-400" />
      {/* AI nodes */}
      <circle cx="10" cy="14" r="1.5" fill="currentColor" className="text-indigo-400/60" />
      <circle cx="30" cy="14" r="1.5" fill="currentColor" className="text-indigo-400/60" />
      <circle cx="10" cy="26" r="1.5" fill="currentColor" className="text-indigo-400/60" />
      <circle cx="30" cy="26" r="1.5" fill="currentColor" className="text-indigo-400/60" />
      {/* Wordmark */}
      <text x="44" y="27" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="20" fill="currentColor" className="text-gray-100">RetroAI</text>
    </svg>
  );
}

// --- Icon Components ---

function IconGitHub() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
    </svg>
  );
}

function IconBarChart() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function IconLightning() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function IconCode() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function IconSlack() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 6a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9 6.75A2.25 2.25 0 1111.25 9 2.25 2.25 0 019 6.75zM15 12a2.25 2.25 0 112.25 2.25A2.25 2.25 0 0115 12z" />
    </svg>
  );
}

// --- Feature Data ---

const features = [
  {
    icon: <IconGitHub />,
    title: "GitHub Native",
    description: "Connects directly to your GitHub repositories. Analyzes PRs, commits, cycle time, and review patterns — no manual data entry required.",
    gradient: "from-indigo-500/20 to-indigo-500/5",
  },
  {
    icon: <IconBarChart />,
    title: "Data-Driven Insights",
    description: "Tracks cycle time, bug churn, rework rate, PR throughput, and more. See trends over time with beautiful, actionable charts.",
    gradient: "from-cyan-500/20 to-cyan-500/5",
  },
  {
    icon: <IconLightning />,
    title: "AI-Generated Reports",
    description: "Each retro report includes AI-written insights, trend analysis, and concrete action items — ready to share with your team in seconds.",
    gradient: "from-violet-500/20 to-violet-500/5",
  },
  {
    icon: <IconSparkles />,
    title: "Actionable Recommendations",
    description: "Stop repeating the same retro conclusions. RetroAI identifies patterns, suggests improvements, and tracks whether action items actually move the needle.",
    gradient: "from-amber-500/20 to-amber-500/5",
  },
  {
    icon: <IconUsers />,
    title: "Team Dashboard",
    description: "See your team's velocity, quality metrics, and improvement trends at a glance. Perfect for engineering managers and tech leads.",
    gradient: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    icon: <IconSlack />,
    title: "Slack Integration",
    description: "Receive automated retro reports directly in Slack. Share insights with the team without leaving your workflow.",
    gradient: "from-rose-500/20 to-rose-500/5",
  },
];

// --- Pricing Data ---

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "For small teams getting started with data-driven retros.",
    features: [
      "1 automated retro / month",
      "Up to 10 team members",
      "Public repositories only",
      "Basic metrics dashboard",
      "Email support",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "For growing teams that want to improve every sprint.",
    features: [
      "Unlimited retros",
      "Private repository support",
      "Slack integration",
      "Multiple teams",
      "Priority email support",
      "Advanced analytics",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$149",
    period: "/month",
    description: "For organizations that need custom workflows and control.",
    features: [
      "Everything in Pro",
      "Custom retro templates",
      "SSO / SAML",
      "Dedicated account manager",
      "Custom integrations",
      "99.9% SLA",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

// --- Steps Data ---

const steps = [
  {
    step: "01",
    title: "Connect Your Repos",
    description: "Link your GitHub or GitLab account. RetroAI reads PRs, commits, and cycle time data automatically.",
    color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  },
  {
    step: "02",
    title: "AI Analyzes Your Sprint",
    description: "Our engine processes cycle time, churn, rework, throughput, and more — identifying patterns humans miss.",
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  },
  {
    step: "03",
    title: "Get Your Retro Report",
    description: "A beautifully formatted report with insights, trends, and concrete action items. Share it with the team in Slack or email.",
    color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
];

// --- Home Component ---

function Home() {
  const businessName = Route.useLoaderData();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
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
    <div className="relative min-h-screen overflow-hidden">
      {/* Background grid + glow */}
      <div className="pointer-events-none fixed inset-0 bg-grid" />
      <div className="pointer-events-none fixed inset-0 bg-glow" />

      {/* Navigation */}
      <nav className="relative z-50 border-b border-gray-800/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <RetroAILogo className="h-8 w-auto" />
          <div className="hidden items-center gap-8 text-sm font-medium text-gray-400 md:flex">
            <a href="#features" className="transition-colors hover:text-gray-100">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-gray-100">How it Works</a>
            <a href="#pricing" className="transition-colors hover:text-gray-100">Pricing</a>
          </div>
          <a
            href="#waitlist"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-400/30"
          >
            Join Waitlist
            <IconArrowRight />
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-24 sm:pt-32 lg:pt-40">
        <div className="mx-auto max-w-4xl text-center">
          {/* Pill badge */}
          <div className="animate-fade-in mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
            <IconSparkles />
            AI-powered sprint retrospectives
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in stagger-1 text-balance text-5xl font-extrabold tracking-tight text-gray-100 sm:text-6xl lg:text-7xl">
            Turn Sprint Data Into{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Actionable Insights
            </span>
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-in stagger-2 mx-auto mt-8 max-w-2xl text-balance text-lg leading-relaxed text-gray-400 sm:text-xl">
            RetroAI automatically analyzes your team's GitHub data — PRs, commits, cycle time, bug churn — and generates a data-driven retrospective report with concrete action items. No more hour-long retro meetings.
          </p>

          {/* CTA Buttons */}
          <div className="animate-fade-in stagger-3 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-400/30 hover:-translate-y-0.5"
            >
              Get Early Access
              <IconArrowRight />
            </a>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800/50 px-8 py-3.5 text-base font-medium text-gray-300 backdrop-blur-sm transition-all hover:border-gray-600 hover:bg-gray-800 hover:text-gray-100"
            >
              See Features
            </a>
          </div>

          {/* Stats row */}
          <div className="animate-fade-in stagger-4 mt-16 grid grid-cols-2 gap-8 border-t border-gray-800/50 pt-12 sm:grid-cols-4">
            {[
              { value: "< 5 min", label: "Setup time" },
              { value: "42%", label: "Faster retros" },
              { value: "87%", label: "Team satisfaction" },
              { value: "3.2×", label: "Action item follow-through" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-gray-100 sm:text-3xl">{stat.value}</div>
                <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
            How It Works
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
            Set up in minutes. Improve every sprint.
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Three simple steps to transform your sprint retrospectives from guesswork into data-driven improvement.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.step} className="group relative rounded-2xl border border-gray-800 bg-gray-900/60 p-8 backdrop-blur-sm transition-all hover:border-gray-700 hover:bg-gray-900/80">
              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-bold ${s.color}`}>
                {s.step}
              </div>
              <h3 className="text-lg font-semibold text-gray-100">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{s.description}</p>
            </div>
          ))}
        </div>

        {/* Arrow connectors on desktop */}
        <div className="hidden md:block">
          <svg className="mx-auto mt-4 h-8 w-full max-w-xl text-gray-700" fill="none" viewBox="0 0 300 24">
            <path d="M95 12h110M205 4l8 8-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-sm font-medium text-cyan-300">
            <IconSparkles />
            Features
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
            Everything you need for better retros
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            No more staring at a blank retro board. RetroAI surfaces what matters so your team can focus on improving.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/40 p-6 backdrop-blur-sm transition-all hover:border-gray-700 hover:bg-gray-900/60 hover:-translate-y-0.5"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity group-hover:opacity-100`} />
              <div className="relative">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-indigo-400">
                  {feature.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-100">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics / Dashboard Preview Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300">
              Data-Driven
            </span>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
              Metrics that matter
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              Every retro report tracks the metrics that engineering teams actually care about.
            </p>
          </div>

          {/* Metric cards */}
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Avg. Cycle Time", value: "2.4d", change: "-18%", positive: true },
              { label: "PR Throughput", value: "14/sprint", change: "+23%", positive: true },
              { label: "Bug Churn", value: "8.3%", change: "-12%", positive: true },
              { label: "Rework Rate", value: "5.1%", change: "-31%", positive: true },
            ].map((metric) => (
              <div key={metric.label} className="glass rounded-xl border border-gray-800/50 p-5 glass-hover">
                <div className="text-xs font-medium uppercase tracking-wider text-gray-500">{metric.label}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-100">{metric.value}</span>
                  <span className={`text-sm font-medium ${metric.positive ? "text-green-400" : "text-red-400"}`}>
                    {metric.change}
                  </span>
                </div>
                {/* Mini bar */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                    style={{ width: metric.positive ? "75%" : "35%" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Retro Report Preview */}
          <div className="glass mt-8 overflow-hidden rounded-xl border border-gray-800/50">
            <div className="flex items-center gap-3 border-b border-gray-800/50 px-5 py-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs font-medium text-gray-500">Sprint #24 — Retro Report</span>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-semibold text-gray-100">Sprint Retrospective</h4>
                  <p className="text-sm text-gray-500">Generated by RetroAI • Apr 7 – Apr 21, 2026</p>
                </div>
                <span className="rounded-lg bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400">Healthy sprint</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3 rounded-lg border border-gray-800/50 bg-gray-800/30 p-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-green-500/10 text-xs font-bold text-green-400">↑</div>
                  <div>
                    <div className="text-sm font-medium text-gray-200">Cycle time decreased 18%</div>
                    <div className="mt-0.5 text-xs text-gray-500">Average PR cycle time dropped from 2.9d to 2.4d. Smaller PR sizes and faster reviews contributed to this improvement.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-gray-800/50 bg-gray-800/30 p-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-xs font-bold text-amber-400">!</div>
                  <div>
                    <div className="text-sm font-medium text-gray-200">Bug churn increased mid-sprint</div>
                    <div className="mt-0.5 text-xs text-gray-500">A spike in bug-fix PRs on Day 8 suggests the auth refactor introduced regressions. Consider adding integration tests.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-gray-800/50 bg-gray-800/30 p-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-xs font-bold text-indigo-400">→</div>
                  <div>
                    <div className="text-sm font-medium text-gray-200">Action Item: Add integration tests for auth flows</div>
                    <div className="mt-0.5 text-xs text-gray-500">Owner: @frontend-team • Priority: High • Due: Next sprint</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
            Pricing
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Start free. Upgrade as your team grows. No hidden fees, no surprises.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3 lg:gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 transition-all ${
                plan.highlighted
                  ? "border-indigo-500/50 bg-gray-900 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/20"
                  : "border-gray-800 bg-gray-900/60 hover:border-gray-700"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white shadow-lg">
                  Most Popular
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-100">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-100">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                <p className="mt-3 text-sm text-gray-400">{plan.description}</p>
              </div>
              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-gray-300">
                    <IconCheck />
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href="#waitlist"
                className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 hover:shadow-indigo-400/30"
                    : "border border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600 hover:bg-gray-800 hover:text-gray-100"
                }`}
              >
                {plan.cta}
                <IconArrowRight />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Waitlist / CTA Section */}
      <section id="waitlist" className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl">
          <div className="glass relative overflow-hidden rounded-2xl border border-gray-800/50 p-8 sm:p-12">
            {/* Glow effect */}
            <div className="pointer-events-none absolute -inset-40 bg-gradient-radial from-indigo-500/10 via-transparent to-transparent" />

            <div className="relative text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
                <IconLightning />
                Early Access
              </span>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
                Get early access to RetroAI
              </h2>
              <p className="mt-4 text-lg text-gray-400">
                Join the waitlist. We're launching soon and will let you in first.
              </p>

              {/* Signup Form */}
              <div className="mt-8 mx-auto max-w-md">
                {status === "success" ? (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-6 py-4 text-green-400">
                    <p className="font-medium">You're on the list!</p>
                    <p className="mt-1 text-sm text-green-400/70">We'll notify you when RetroAI is ready.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      className="flex-1 rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 backdrop-blur-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {status === "loading" ? "Submitting..." : "Join Waitlist"}
                      <IconArrowRight />
                    </button>
                  </form>
                )}
                {status === "error" && (
                  <p className="mt-3 text-sm text-red-400">{errorMsg}</p>
                )}
                <p className="mt-4 text-xs text-gray-500">
                  No spam, ever. We'll only email you about RetroAI launch updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800/50">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <RetroAILogo className="h-6 w-auto" />
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span>Built for engineering teams</span>
              <span className="hidden sm:inline">·</span>
              <span>© {new Date().getFullYear()} RetroAI</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}