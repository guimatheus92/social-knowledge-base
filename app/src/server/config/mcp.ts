/** Reads/writes the LLM reading config: Whisper env in .mcp.json + analyze_video options. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MANIFESTS, MCP_CONFIG } from "@/server/paths";
import { DEFAULT_NOTE_LANG } from "@/lib/languages";
import type { AnalysisConfig } from "@/lib/types";

export const ANALYSIS_DEFAULTS: AnalysisConfig = {
  whisperModel: "small",
  whisperLanguage: "pt",
  detail: "standard",
  maxFrames: 20,
  threshold: 0.3,
  ocrLanguage: "por+eng",
  noteLanguage: DEFAULT_NOTE_LANG,
};

const OPTS_FILE = join(MANIFESTS, "analysis-config.json");

/* eslint-disable @typescript-eslint/no-explicit-any */
function readMcp(): any {
  try {
    return JSON.parse(readFileSync(MCP_CONFIG, "utf-8"));
  } catch {
    return null;
  }
}

export function getAnalysisConfig(): AnalysisConfig {
  const env = readMcp()?.mcpServers?.["video-analyzer"]?.env ?? {};
  let opts: Partial<AnalysisConfig> = {};
  if (existsSync(OPTS_FILE)) {
    try {
      opts = JSON.parse(readFileSync(OPTS_FILE, "utf-8"));
    } catch {
      /* ignore */
    }
  }
  return {
    ...ANALYSIS_DEFAULTS,
    ...opts,
    whisperModel: env.WHISPER_MODEL ?? ANALYSIS_DEFAULTS.whisperModel,
    whisperLanguage: env.WHISPER_LANGUAGE ?? ANALYSIS_DEFAULTS.whisperLanguage,
  };
}

export function setAnalysisConfig(cfg: AnalysisConfig): void {
  // 1) Whisper env in .mcp.json (the MCP must be restarted for it to take effect)
  const mcp = readMcp();
  if (mcp?.mcpServers?.["video-analyzer"]) {
    const srv = mcp.mcpServers["video-analyzer"];
    srv.env = {
      ...(srv.env ?? {}),
      WHISPER_MODEL: cfg.whisperModel,
      WHISPER_LANGUAGE: cfg.whisperLanguage,
    };
    writeFileSync(MCP_CONFIG, `${JSON.stringify(mcp, null, 2)}\n`, "utf-8");
  }
  // 2) analyze_video options + note language (the notes phase reads this file)
  const opts = {
    detail: cfg.detail,
    maxFrames: cfg.maxFrames,
    threshold: cfg.threshold,
    ocrLanguage: cfg.ocrLanguage,
    noteLanguage: cfg.noteLanguage,
  };
  writeFileSync(OPTS_FILE, `${JSON.stringify(opts, null, 2)}\n`, "utf-8");
}
