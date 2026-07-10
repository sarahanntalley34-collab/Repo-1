import { createFileRoute, Link } from "@tanstack/react-router";
import { init } from "~/lib/server-fns";

export const Route = createFileRoute("/")({
  loader: () => init(),
  component: Home,
});

function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Nav */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              RetroAI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              AI-powered sprint retrospectives
            </span>
            <h1 className="mt-8 text-5xl font-bold tracking-tight sm:text-7xl">
              Ship faster with{" "}
              <span className="text-indigo-600 dark:text-indigo-400">
                data-driven
              </span>{" "}
              retros
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
              RetroAI automatically analyzes your team's GitHub data — PRs,
              commits, cycle time, bug churn, and rework — and generates
              actionable retrospective reports. No more wasted meetings.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                to="/signup"
                className="rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                Start for free
              </Link>
              <a
                href="#how-it-works"
                className="rounded-xl border border-gray-300 px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900 transition-colors"
              >
                See how it works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Three simple steps to better retrospectives.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Connect GitHub",
                description:
                  "Grant RetroAI read-only access to your repos. We analyze PRs, commits, and cycle times.",
              },
              {
                step: "2",
                title: "AI Analyzes",
                description:
                  "Our engine computes sprint metrics — cycle time, merge frequency, bug churn, rework rate, reviewer response time.",
              },
              {
                step: "3",
                title: "Get Actionable Reports",
                description:
                  "Receive a natural-language retro report with concrete insights and action items to improve sprint over sprint.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-gray-200 p-8 text-center dark:border-gray-800"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  {item.step}
                </span>
                <h3 className="mt-6 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Start free. Upgrade as you grow.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                desc: "1 retro/month, public repos, up to 10 members",
                features: ["1 automated retro/mo", "Public repos only", "Up to 10 team members"],
              },
              {
                name: "Pro",
                price: "$49",
                desc: "Unlimited retros, private repos, Slack",
                features: [
                  "Unlimited retros",
                  "Private repos",
                  "Slack integration",
                  "Multiple teams",
                ],
                popular: true,
              },
              {
                name: "Enterprise",
                price: "$149",
                desc: "Advanced analytics, custom templates, SSO",
                features: [
                  "Everything in Pro",
                  "Advanced analytics",
                  "Custom templates",
                  "Priority support",
                  "SSO",
                ],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 ${
                  plan.popular
                    ? "border-indigo-500 ring-2 ring-indigo-500"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >
                {plan.popular && (
                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    Most popular
                  </span>
                )}
                <h3 className="mt-4 text-xl font-semibold">{plan.name}</h3>
                <p className="mt-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-500">/month</span>
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {plan.desc}
                </p>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <svg
                        className="h-4 w-4 text-indigo-600 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={`mt-8 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${
                    plan.popular
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                  } transition-colors`}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} RetroAI. Built with cto.new
        </div>
      </footer>
    </div>
  );
}