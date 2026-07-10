/**
 * LLM Service — Wraps OpenAI API calls for generating retro report narratives.
 *
 * Uses process.env.OPENAI_API_KEY. If the key is not set, falls back to a
 * deterministic template-based report generator so the app still works during
 * development and demo.
 *
 * SERVER-ONLY: Do not import from client code.
 */

// --- Types ---

export interface SprintMetrics {
  teamName: string;
  sprintName: string;
  periodStart: string;
  periodEnd: string;
  cycleTime: number; // average PR cycle time in days
  cycleTimeChange: number | null; // % change vs previous sprint (positive = slower)
  prThroughput: number; // total PRs merged
  prThroughputChange: number | null; // % change vs previous sprint
  bugChurnPercent: number; // % of PRs that are bug fixes
  bugChurnChange: number | null; // % change vs previous sprint
  reworkRatePercent: number; // % of PRs that are rework
  reworkRateChange: number | null; // % change vs previous sprint
  avgPrSize: number; // average lines changed per PR
  avgReviewTime: number; // average time to first review in hours
  totalCommits: number;
  contributors: number;
  topContributors: string[]; // usernames
  previousMetrics?: Partial<SprintMetrics>; // previous sprint for comparison
  prsByDay?: { day: string; count: number }[]; // PRs merged per day
  failureRate?: number; // % of deployment failures
}

export interface RetroReport {
  title: string;
  summary: string;
  status: "healthy" | "needs-attention" | "critical";
  insights: {
    type: "positive" | "warning" | "action";
    title: string;
    description: string;
  }[];
  actionItems: {
    title: string;
    owner: string;
    priority: "High" | "Medium" | "Low";
    due: string;
  }[];
  metrics: {
    cycleTime: string;
    prThroughput: number;
    bugChurn: string;
    reworkRate: string;
  };
}

// --- Prompt Engineering ---

const SYSTEM_PROMPT = `You are a senior engineering lead with years of experience running agile retrospectives. 
Your job is to analyze sprint metrics data and write a data-driven retrospective report.

Write in a clear, direct, helpful tone — like a thoughtful engineering lead giving honest feedback.
Be specific and data-backed. Don't just say "cycle time improved" — say "cycle time dropped from 3.2d to 2.4d, a 25% improvement."
When something needs improvement, say it plainly but constructively.

Structure your output as VALID JSON with the following schema — no markdown, no code fences, just raw JSON:

{
  "title": "Sprint #N — Retrospective",
  "summary": "A 2-3 sentence narrative summary of the sprint. What happened, how the team did, the key takeaway.",
  "status": "healthy" | "needs-attention" | "critical",
  "insights": [
    {
      "type": "positive" | "warning" | "action",
      "title": "Short, punchy insight title",
      "description": "1-2 sentence explanation with data"
    }
  ],
  "actionItems": [
    {
      "title": "Specific, actionable todo",
      "owner": "@team or @person",
      "priority": "High" | "Medium" | "Low",
      "due": "Next sprint" | "Immediately" | "Sprint N" | "Ongoing"
    }
  ]
}

Guidelines:
- Include 3-6 insights, mixing positives, warnings, and action items.
- Include 3-5 action items with clear owners.
- Status determination:
  - "healthy": most metrics are stable or improving, no major concerns
  - "needs-attention": one or two metrics are trending poorly
  - "critical": multiple metrics are significantly worse than target
- A good sprint has cycle time < 3d, bug churn < 10%, rework rate < 8%.
- Use the data provided. Never invent metrics or make claims not supported by the data.`;

function buildMetricsPrompt(metrics: SprintMetrics): string {
  const lines: string[] = [];
  lines.push(`Team: ${metrics.teamName}`);
  lines.push(`Sprint: ${metrics.sprintName}`);
  lines.push(`Period: ${metrics.periodStart} → ${metrics.periodEnd}`);
  lines.push("");
  lines.push("--- Sprint Metrics ---");
  lines.push(`Average Cycle Time: ${metrics.cycleTime.toFixed(1)} days${metrics.cycleTimeChange !== null ? ` (${metrics.cycleTimeChange >= 0 ? "+" : ""}${metrics.cycleTimeChange.toFixed(1)}% vs previous sprint)` : ""}`);
  lines.push(`PR Throughput: ${metrics.prThroughput} PRs merged${metrics.prThroughputChange !== null ? ` (${metrics.prThroughputChange >= 0 ? "+" : ""}${metrics.prThroughputChange.toFixed(1)}% vs previous sprint)` : ""}`);
  lines.push(`Bug Churn: ${metrics.bugChurnPercent.toFixed(1)}% of PRs are bug fixes${metrics.bugChurnChange !== null ? ` (${metrics.bugChurnChange >= 0 ? "+" : ""}${metrics.bugChurnChange.toFixed(1)}% vs previous sprint)` : ""}`);
  lines.push(`Rework Rate: ${metrics.reworkRatePercent.toFixed(1)}% of PRs are rework${metrics.reworkRateChange !== null ? ` (${metrics.reworkRateChange >= 0 ? "+" : ""}${metrics.reworkRateChange.toFixed(1)}% vs previous sprint)` : ""}`);
  lines.push(`Average PR Size: ${metrics.avgPrSize} lines changed`);
  lines.push(`Average Review Time: ${metrics.avgReviewTime.toFixed(1)} hours to first review`);
  lines.push(`Total Commits: ${metrics.totalCommits}`);
  lines.push(`Contributors: ${metrics.contributors}`);
  if (metrics.topContributors.length > 0) {
    lines.push(`Top Contributors: ${metrics.topContributors.join(", ")}`);
  }
  if (metrics.failureRate !== undefined) {
    lines.push(`Deployment Failure Rate: ${metrics.failureRate.toFixed(1)}%`);
  }
  lines.push("");
  lines.push("Generate a retrospective report based on this data. Return ONLY the JSON object.");

  return lines.join("\n");
}

// --- Template-based fallback (used when no API key) ---

function generateTemplateReport(metrics: SprintMetrics): RetroReport {
  const status: "healthy" | "needs-attention" | "critical" =
    metrics.cycleTime < 3 && metrics.bugChurnPercent < 10 && metrics.reworkRatePercent < 8
      ? "healthy"
      : metrics.cycleTime < 4.5 && metrics.bugChurnPercent < 15 && metrics.reworkRatePercent < 12
        ? "needs-attention"
        : "critical";

  const insights: RetroReport["insights"] = [];
  const actionItems: RetroReport["actionItems"] = [];

  // Cycle time insight
  if (metrics.cycleTimeChange !== null && metrics.cycleTimeChange < -5) {
    insights.push({
      type: "positive",
      title: `Cycle time improved ${Math.abs(metrics.cycleTimeChange).toFixed(0)}%`,
      description: `Average PR cycle time dropped to ${metrics.cycleTime.toFixed(1)}d, down from ${(metrics.cycleTime / (1 + metrics.cycleTimeChange / 100)).toFixed(1)}d in the previous sprint.`,
    });
  } else if (metrics.cycleTimeChange !== null && metrics.cycleTimeChange > 5) {
    insights.push({
      type: "warning",
      title: `Cycle time increased ${metrics.cycleTimeChange.toFixed(0)}%`,
      description: `Average PR cycle time rose to ${metrics.cycleTime.toFixed(1)}d. Consider breaking PRs into smaller chunks.`,
    });
    actionItems.push({
      title: "Reduce average PR size to < 200 lines to improve cycle time",
      owner: "@all",
      priority: "High",
      due: "Next sprint",
    });
  }

  // PR throughput insight
  if (metrics.prThroughputChange !== null && metrics.prThroughputChange > 10) {
    insights.push({
      type: "positive",
      title: `PR throughput up ${metrics.prThroughputChange.toFixed(0)}%`,
      description: `The team merged ${metrics.prThroughput} PRs this sprint — a strong increase in output.`,
    });
  } else if (metrics.prThroughputChange !== null && metrics.prThroughputChange < -10) {
    insights.push({
      type: "warning",
      title: "PR throughput declined",
      description: `Only ${metrics.prThroughput} PRs merged this sprint, down ${Math.abs(metrics.prThroughputChange).toFixed(0)}% from previous.`,
    });
  }

  // Bug churn insight
  if (metrics.bugChurnPercent < 8) {
    insights.push({
      type: "positive",
      title: "Low bug churn",
      description: `Only ${metrics.bugChurnPercent.toFixed(1)}% of PRs were bug fixes — well below the 10% threshold.`,
    });
  } else if (metrics.bugChurnPercent > 12) {
    insights.push({
      type: "warning",
      title: `Bug churn elevated at ${metrics.bugChurnPercent.toFixed(1)}%`,
      description: `Bug-fix PRs make up ${metrics.bugChurnPercent.toFixed(1)}% of all PRs. Consider adding more test coverage.`,
    });
    actionItems.push({
      title: `Add integration tests for areas with highest bug density`,
      owner: "@qa",
      priority: "High",
      due: "Next sprint",
    });
  }

  // Rework rate insight
  if (metrics.reworkRatePercent < 5) {
    insights.push({
      type: "positive",
      title: "Low rework rate",
      description: `Only ${metrics.reworkRatePercent.toFixed(1)}% of PRs required rework — indicating strong up-front design and code review quality.`,
    });
  } else if (metrics.reworkRatePercent > 10) {
    insights.push({
      type: "warning",
      title: `Rework rate at ${metrics.reworkRatePercent.toFixed(1)}%`,
      description: `${metrics.reworkRatePercent.toFixed(1)}% of PRs were rework. Consider investing more time in design review before coding.`,
    });
    actionItems.push({
      title: "Schedule design review sessions before starting implementation",
      owner: "@tech-lead",
      priority: "Medium",
      due: "Ongoing",
    });
  }

  // Review time insight
  if (metrics.avgReviewTime > 24) {
    insights.push({
      type: "action",
      title: `Review time averaging ${metrics.avgReviewTime.toFixed(0)} hours`,
      description: `PRs wait ${metrics.avgReviewTime.toFixed(0)} hours on average for first review. Set a 4-hour SLA for reviews.`,
    });
    actionItems.push({
      title: "Set a 4-hour SLA for PR reviews during business hours",
      owner: "@all",
      priority: "Medium",
      due: "Immediately",
    });
  } else if (metrics.avgReviewTime < 4) {
    insights.push({
      type: "positive",
      title: "Fast review turnaround",
      description: `Average time to first review is ${metrics.avgReviewTime.toFixed(1)}h — the team is prioritizing reviews well.`,
    });
  }

  // PR size insight
  if (metrics.avgPrSize > 300) {
    insights.push({
      type: "action",
      title: `PRs averaging ${metrics.avgPrSize} lines`,
      description: `Large PRs slow down reviews and increase risk. Target PRs under 200 lines.`,
    });
    actionItems.push({
      title: "Break large features into smaller, incremental PRs (< 200 lines)",
      owner: "@all",
      priority: "High",
      due: "Next sprint",
    });
  }

  // Ensure we always have at least a summary insight
  if (insights.length === 0) {
    insights.push({
      type: "positive",
      title: "Steady sprint",
      description: `All metrics are within acceptable ranges. Keep up the good work.`,
    });
  }

  // Ensure we always have at least 2 action items
  if (actionItems.length < 2) {
    if (!actionItems.find(a => a.title.includes("tests"))) {
      actionItems.push({
        title: "Continue improving test coverage in the codebase",
        owner: "@all",
        priority: "Medium",
        due: "Ongoing",
      });
    }
    actionItems.push({
      title: "Document sprint retrospective findings and share with the team",
      owner: "@tech-lead",
      priority: "Low",
      due: "End of sprint",
    });
  }

  const summaryParts: string[] = [];
  if (metrics.cycleTime < 3) {
    summaryParts.push(`Cycle time was a healthy ${metrics.cycleTime.toFixed(1)}d`);
  } else {
    summaryParts.push(`Cycle time was ${metrics.cycleTime.toFixed(1)}d`);
  }
  summaryParts.push(`${metrics.prThroughput} PRs were merged`);
  if (metrics.bugChurnPercent < 10) {
    summaryParts.push(`bug churn was low at ${metrics.bugChurnPercent.toFixed(1)}%`);
  } else {
    summaryParts.push(`bug churn was ${metrics.bugChurnPercent.toFixed(1)}%`);
  }

  const summary = `Sprint ${metrics.sprintName}: ${summaryParts.join(", ")}. ${status === "healthy" ? "The team is performing well with all key metrics in target range." : status === "needs-attention" ? "Some metrics need attention — focus on the action items below." : "Several metrics are concerning — the team should prioritize the action items below."}`;

  return {
    title: `${metrics.sprintName} — Retrospective`,
    summary,
    status,
    insights,
    actionItems,
    metrics: {
      cycleTime: `${metrics.cycleTime.toFixed(1)}d`,
      prThroughput: metrics.prThroughput,
      bugChurn: `${metrics.bugChurnPercent.toFixed(1)}%`,
      reworkRate: `${metrics.reworkRatePercent.toFixed(1)}%`,
    },
  };
}

// --- Main generation function ---

/**
 * Generate a retro report from sprint metrics.
 * Uses OpenAI if OPENAI_API_KEY is set, otherwise falls back to template-based generation.
 */
export async function generateRetroReport(metrics: SprintMetrics): Promise<RetroReport> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.log("LLM: No OPENAI_API_KEY set, using template-based fallback");
    return generateTemplateReport(metrics);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildMetricsPrompt(metrics) },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LLM API error (${response.status}): ${errorText}`);
      // Fall back to template on API error
      return generateTemplateReport(metrics);
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("LLM: Empty response from OpenAI");
      return generateTemplateReport(metrics);
    }

    // Parse the JSON from the response
    // Strip any markdown code fences if present
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const report = JSON.parse(cleaned) as Omit<RetroReport, "metrics">;
      // Add computed metrics to the report
      return {
        ...report,
        metrics: {
          cycleTime: `${metrics.cycleTime.toFixed(1)}d`,
          prThroughput: metrics.prThroughput,
          bugChurn: `${metrics.bugChurnPercent.toFixed(1)}%`,
          reworkRate: `${metrics.reworkRatePercent.toFixed(1)}%`,
        },
      };
    } catch (parseError) {
      console.error("LLM: Failed to parse JSON response:", parseError);
      console.error("Raw content:", content);
      return generateTemplateReport(metrics);
    }
  } catch (error) {
    console.error("LLM: Network error calling OpenAI:", error);
    return generateTemplateReport(metrics);
  }
}