"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertCircle,
  Check,
  Copy,
  Lightbulb,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import type { AnalysisResult } from "@/app/api/analyze/route";

interface AnalysisResultsProps {
  result: AnalysisResult;
}

export function AnalysisResults({ result }: AnalysisResultsProps) {
  const [copied, setCopied] = useState(false);

  const copyResults = () => {
    const text = `
Match Score: ${result.match_percentage}%

Summary: ${result.summary}

Strengths:
${result.strengths.map((s) => `• ${s}`).join("\n")}

Missing Keywords:
${result.missing_keywords.map((k) => `• ${k}`).join("\n")}

Improvement Suggestions:
${result.improvement_suggestions.map((s) => `• ${s}`).join("\n")}

${result.additional_insights ? `Additional Insights: ${result.additional_insights}` : ""}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) {
      return "text-success";
    }
    if (score >= 60) {
      return "text-warning";
    }
    return "text-destructive";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) {
      return "bg-success/10 border-success/20";
    }
    if (score >= 60) {
      return "bg-warning/10 border-warning/20";
    }
    return "bg-destructive/10 border-destructive/20";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground text-lg">
          Analysis Results
        </h2>
        <Button onClick={copyResults} size="sm" variant="outline">
          {copied ? (
            <>
              <Check className="mr-1.5 size-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-1.5 size-3.5" />
              Copy Results
            </>
          )}
        </Button>
      </div>

      {/* Match Score */}
      <Card className={`p-6 ${getScoreBg(result.match_percentage)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-muted-foreground text-sm">
              Match Score
            </p>
            <p
              className={`font-bold text-5xl ${getScoreColor(result.match_percentage)}`}
            >
              {result.match_percentage}%
            </p>
          </div>
          <div className="flex size-16 items-center justify-center rounded-full bg-background">
            <TrendingUp
              className={`size-8 ${getScoreColor(result.match_percentage)}`}
            />
          </div>
        </div>
        <p className="mt-4 text-foreground text-sm">{result.summary}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Strengths */}
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-success" />
            <h3 className="font-medium text-foreground">Your Strengths</h3>
          </div>
          <ul className="space-y-2">
            {result.strengths.map((strength) => (
              <li
                className="flex items-start gap-2 text-muted-foreground text-sm"
                key={strength}
              >
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Missing Keywords */}
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="size-4 text-destructive" />
            <h3 className="font-medium text-foreground">Missing Keywords</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.missing_keywords.map((keyword) => (
              <span
                className="inline-flex items-center rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-0.5 font-medium text-destructive text-xs"
                key={keyword}
              >
                {keyword}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Improvement Suggestions */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="size-4 text-primary" />
          <h3 className="font-medium text-foreground">How to Improve</h3>
        </div>
        <ul className="space-y-2">
          {result.improvement_suggestions.map((suggestion, idx) => (
            <li
              className="flex items-start gap-2 text-muted-foreground text-sm"
              key={suggestion}
            >
              <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-xs">
                {idx + 1}
              </span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Additional Insights */}
      {result.additional_insights && (
        <Card className="bg-muted/50 p-4">
          <p className="text-muted-foreground text-sm">
            <strong className="text-foreground">Pro tip:</strong>{" "}
            {result.additional_insights}
          </p>
        </Card>
      )}
    </div>
  );
}
