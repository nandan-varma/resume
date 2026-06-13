"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Check, Copy, Lightbulb, Sparkles } from "lucide-react";
import { useState } from "react";
import type { AnalysisResult } from "@/app/api/analyze/route";
import { ScoreRing } from "@/components/score-ring";
import { CountUp } from "@/components/count-up";

interface AnalysisResultsProps {
  result: AnalysisResult;
}

export function AnalysisResults({ result }: AnalysisResultsProps) {
  const [copied, setCopied] = useState(false);

  const copyResults = async () => {
    const text = [
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

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const scoreColor = (s: number) =>
    s >= 80 ? "text-success" : s >= 60 ? "text-warning" : "text-destructive";
  const scoreBg = (s: number) =>
    s >= 80
      ? "bg-success/8 border-success/20"
      : s >= 60
        ? "bg-warning/8 border-warning/20"
        : "bg-destructive/8 border-destructive/20";
  const scoreLabel = (s: number) =>
    s >= 80 ? "Strong match" : s >= 60 ? "Partial match" : "Weak match";

  return (
    <div className="space-y-5">

      {/* Header row */}
      <div className="flex items-center justify-between animate-enter">
        <h2 className="font-semibold text-foreground text-lg">Analysis Results</h2>
        <Button onClick={copyResults} size="sm" variant="outline">
          {copied ? (
            <><Check className="mr-1.5 size-3.5" />Copied</>
          ) : (
            <><Copy className="mr-1.5 size-3.5" />Copy</>
          )}
        </Button>
      </div>

      {/* Score card — centrepiece */}
      <Card className={`p-5 animate-enter-blur ${scoreBg(result.match_percentage)}`}>
        <div className="flex items-center gap-6">

          {/* Animated ring + number */}
          <div className="relative shrink-0">
            <ScoreRing
              score={result.match_percentage}
              colorClass={scoreColor(result.match_percentage)}
              size={84}
              strokeWidth={3}
            />
            {/* Number overlay — rotated back since the SVG itself is rotated -90° */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-lg font-bold tabular-nums leading-none ${scoreColor(result.match_percentage)}`}>
                <CountUp to={result.match_percentage} duration={1200} />
              </span>
              <span className={`text-[10px] font-medium leading-none mt-0.5 ${scoreColor(result.match_percentage)} opacity-70`}>
                %
              </span>
            </div>
          </div>

          {/* Summary text */}
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${scoreColor(result.match_percentage)} opacity-70`}>
              {scoreLabel(result.match_percentage)}
            </p>
            <p className="text-foreground text-sm leading-relaxed">{result.summary}</p>
          </div>
        </div>
      </Card>

      {/* Strengths + Keywords */}
      <div className="grid gap-4 md:grid-cols-2 animate-enter-up [animation-delay:100ms]">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-success" />
            <h3 className="font-medium text-foreground text-sm">Strengths</h3>
          </div>
          <ul className="space-y-2">
            {result.strengths.map((s, i) => (
              <li
                key={s}
                className="flex items-start gap-2 text-muted-foreground text-sm animate-enter-up"
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
            <h3 className="font-medium text-foreground text-sm">Missing Keywords</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.missing_keywords.map((kw, i) => (
              <span
                key={kw}
                className="inline-flex items-center border border-destructive/20 bg-destructive/8 px-2 py-0.5 font-medium text-destructive text-xs animate-enter"
                style={{ animationDelay: `${120 + i * 30}ms` }}
              >
                {kw}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Improvement suggestions */}
      <Card className="p-4 animate-enter-up [animation-delay:180ms]">
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="size-4 text-primary" />
          <h3 className="font-medium text-foreground text-sm">How to Improve</h3>
        </div>
        <ul className="space-y-2.5">
          {result.improvement_suggestions.map((s, idx) => (
            <li
              key={s}
              className="flex items-start gap-3 text-muted-foreground text-sm animate-enter-up"
              style={{ animationDelay: `${200 + idx * 45}ms` }}
            >
              <span className="inline-flex size-5 shrink-0 items-center justify-center bg-muted font-medium text-muted-foreground text-[11px] tabular-nums mt-0.5">
                {idx + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Additional insights */}
      {result.additional_insights && (
        <Card className="bg-muted/40 p-4 animate-enter-up [animation-delay:240ms]">
          <p className="text-muted-foreground text-sm leading-relaxed">
            <strong className="font-medium text-foreground">Pro tip — </strong>
            {result.additional_insights}
          </p>
        </Card>
      )}
    </div>
  );
}
