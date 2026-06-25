"use client";

import {
  AlertCircle,
  Check,
  Copy,
  Download,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import type { AnalysisResult } from "@/app/api/analyze/route";
import { CountUp } from "@/components/count-up";
import { ScoreRing } from "@/components/score-ring";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AnalysisResultsProps {
  result: AnalysisResult;
}

export function AnalysisResults({ result }: AnalysisResultsProps) {
  const [copied, setCopied] = useState(false);

  function buildText() {
    return [
      `Match Score: ${result.match_percentage}%`,
      "",
      `Summary: ${result.summary}`,
      "",
      "Strengths:",
      ...result.strengths.map((s) => `• ${s}`),
      "",
      "Missing Keywords:",
      ...result.missing_keywords.map((k) => `• ${k}`),
      "",
      "Improvement Suggestions:",
      ...result.improvement_suggestions.map((s) => `• ${s}`),
      ...(result.additional_insights
        ? ["", `Additional Insights: ${result.additional_insights}`]
        : []),
    ].join("\n");
  }

  const copyResults = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const downloadResults = () => {
    const blob = new Blob([buildText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume-analysis.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const pct = result.match_percentage;
  let scoreColor: string;
  let scoreBg: string;
  let scoreLabel: string;
  if (pct >= 80) {
    scoreColor = "text-success";
    scoreBg = "bg-success/8 border-success/20";
    scoreLabel = "Strong match";
  } else if (pct >= 60) {
    scoreColor = "text-warning";
    scoreBg = "bg-warning/8 border-warning/20";
    scoreLabel = "Partial match";
  } else {
    scoreColor = "text-destructive";
    scoreBg = "bg-destructive/8 border-destructive/20";
    scoreLabel = "Weak match";
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex animate-enter items-center justify-between">
        <h2 className="font-semibold text-foreground text-lg">
          Analysis Results
        </h2>
        <div className="flex gap-2">
          <Button onClick={downloadResults} size="sm" variant="outline">
            <Download className="mr-1.5 size-3.5" />
            Download
          </Button>
          <Button onClick={copyResults} size="sm" variant="outline">
            {copied ? (
              <>
                <Check className="mr-1.5 size-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1.5 size-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Score card — centrepiece */}
      <Card className={`animate-enter-blur p-5 ${scoreBg}`}>
        <div className="flex items-center gap-6">
          {/* Animated ring + number */}
          <div className="relative shrink-0">
            <ScoreRing
              colorClass={scoreColor}
              score={result.match_percentage}
              size={84}
              strokeWidth={3}
            />
            {/* Number overlay — rotated back since the SVG itself is rotated -90° */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`font-bold text-lg tabular-nums leading-none ${scoreColor}`}
              >
                <CountUp duration={1200} to={result.match_percentage} />
              </span>
              <span
                className={`mt-0.5 font-medium text-[10px] leading-none ${scoreColor} opacity-70`}
              >
                %
              </span>
            </div>
          </div>

          {/* Summary text */}
          <div className="min-w-0 flex-1">
            <p
              className={`mb-1 font-semibold text-xs uppercase tracking-widest ${scoreColor} opacity-70`}
            >
              {scoreLabel}
            </p>
            <p className="text-foreground text-sm leading-relaxed">
              {result.summary}
            </p>
          </div>
        </div>
      </Card>

      {/* Strengths + Keywords */}
      <div className="grid animate-enter-up gap-4 [animation-delay:100ms] md:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-success" />
            <h3 className="font-medium text-foreground text-sm">Strengths</h3>
          </div>
          <ul className="space-y-2">
            {result.strengths.map((s, i) => (
              <li
                className="flex animate-enter-up items-start gap-2 text-muted-foreground text-sm"
                key={s}
                style={{ animationDelay: `${120 + i * 40}ms` }}
              >
                <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="size-4 text-destructive" />
            <h3 className="font-medium text-foreground text-sm">
              Missing Keywords
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.missing_keywords.map((kw, i) => (
              <span
                className="inline-flex animate-enter items-center rounded-full border border-destructive/20 bg-destructive/8 px-2.5 py-0.5 font-medium text-destructive text-xs"
                key={kw}
                style={{ animationDelay: `${120 + i * 30}ms` }}
              >
                {kw}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Improvement suggestions */}
      <Card className="animate-enter-up p-4 [animation-delay:180ms]">
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="size-4 text-primary" />
          <h3 className="font-medium text-foreground text-sm">
            How to Improve
          </h3>
        </div>
        <ul className="space-y-2.5">
          {result.improvement_suggestions.map((s, idx) => (
            <li
              className="flex animate-enter-up items-start gap-3 text-muted-foreground text-sm"
              key={s}
              style={{ animationDelay: `${200 + idx * 45}ms` }}
            >
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-[11px] text-muted-foreground tabular-nums">
                {idx + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Additional insights */}
      {result.additional_insights && (
        <Card className="animate-enter-up bg-muted/40 p-4 [animation-delay:240ms]">
          <p className="text-muted-foreground text-sm leading-relaxed">
            <strong className="font-medium text-foreground">Pro tip — </strong>
            {result.additional_insights}
          </p>
        </Card>
      )}
    </div>
  );
}
