import { useId, useState } from "react";
import type { StratLink } from "../lib/types";
import {
  MAX_STRAT_STEPS,
  STRAT_TEMPLATES,
  applyTemplate,
  emptyStep,
  type StratBuild,
  type StratStep,
  type StratTemplateId,
} from "../lib/stratSteps";
import { nadeChipClass, nadeTypeFromLink, utilTagFromTask } from "../lib/nadeType";
import { shortLinkLabel } from "../lib/taskLinks";
import { LineupChip } from "./LineupChip";
import { Plus } from "./icons";

function StepMoveIcons({ dir }: { dir: "up" | "down" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      {dir === "up" ? <path d="m18 15-6-6-6 6" /> : <path d="m6 9 6 6 6-6" />}
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/**
 * Build-order style strat editor: ordered steps with optional lineup attach.
 * Persists via parent as tasks[] + links[] through stratSteps helpers.
 */
export function StratStepEditor({
  build,
  onChange,
  side,
  suggestedLinks = [],
  showTemplates = true,
}: {
  build: StratBuild;
  onChange: (next: StratBuild) => void;
  side: "T" | "CT";
  suggestedLinks?: StratLink[];
  showTemplates?: boolean;
}) {
  const labelId = useId();
  const [focusStep, setFocusStep] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [manualLabel, setManualLabel] = useState("");

  const steps = build.steps.length ? build.steps : [emptyStep()];
  const canAdd = steps.length < MAX_STRAT_STEPS;

  function setSteps(next: StratStep[]) {
    onChange({ ...build, steps: next.length ? next : [emptyStep()] });
  }

  function updateStep(id: string, patch: Partial<StratStep>) {
    setSteps(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function moveStep(id: string, delta: number) {
    const i = steps.findIndex((s) => s.id === id);
    if (i < 0) return;
    const j = i + delta;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    const [row] = next.splice(i, 1);
    next.splice(j, 0, row);
    setSteps(next);
  }

  function removeStep(id: string) {
    const removed = steps.find((s) => s.id === id);
    const next = steps.filter((s) => s.id !== id);
    const extras = [...build.extraLinks];
    if (removed?.link && !extras.some((l) => l.url === removed.link!.url)) {
      extras.push(removed.link);
    }
    onChange({ steps: next.length ? next : [emptyStep()], extraLinks: extras });
  }

  function addStep() {
    if (!canAdd) return;
    const step = emptyStep();
    setSteps([...steps, step]);
    setFocusStep(step.id);
  }

  function applyTpl(id: StratTemplateId) {
    onChange(applyTemplate(id, side));
    setFocusStep(null);
  }

  function attachLink(link: StratLink, stepId?: string | null) {
    const targetId = stepId || focusStep || steps[steps.length - 1]?.id;
    if (!targetId) {
      if (!build.extraLinks.some((l) => l.url === link.url)) {
        onChange({ ...build, extraLinks: [...build.extraLinks, link] });
      }
      return;
    }
    // Detach from other steps / extras if already present
    const cleanedExtras = build.extraLinks.filter((l) => l.url !== link.url);
    const nextSteps = steps.map((s) => {
      if (s.id === targetId) return { ...s, link };
      if (s.link?.url === link.url) return { ...s, link: null };
      return s;
    });
    onChange({ steps: nextSteps, extraLinks: cleanedExtras });
    setFocusStep(targetId);
  }

  function detachStepLink(stepId: string) {
    const step = steps.find((s) => s.id === stepId);
    if (!step?.link) return;
    const extras = build.extraLinks.some((l) => l.url === step.link!.url)
      ? build.extraLinks
      : [...build.extraLinks, step.link];
    onChange({
      steps: steps.map((s) => (s.id === stepId ? { ...s, link: null } : s)),
      extraLinks: extras,
    });
  }

  function removeExtra(url: string) {
    onChange({ ...build, extraLinks: build.extraLinks.filter((l) => l.url !== url) });
  }

  function addManualLink() {
    const url = manualUrl.trim();
    if (!/^https?:\/\//i.test(url)) return;
    const label = manualLabel.trim() || "Lineup";
    attachLink({ label: label.slice(0, 80), url });
    setManualUrl("");
    setManualLabel("");
  }

  const attachedUrls = new Set(
    steps.map((s) => s.link?.url).filter(Boolean) as string[]
  );
  const seenSuggest = new Set<string>();
  const unusedSuggested = suggestedLinks.filter((l) => {
    if (!l.url || attachedUrls.has(l.url) || build.extraLinks.some((e) => e.url === l.url)) return false;
    if (seenSuggest.has(l.url)) return false;
    seenSuggest.add(l.url);
    return true;
  });

  return (
    <div className="strat-builder">
      <div className="strat-builder-head">
        <p className="eyebrow" id={labelId}>
          Build steps
        </p>
        <span className="muted" style={{ fontSize: 11 }}>
          {steps.filter((s) => s.text.trim()).length}/{MAX_STRAT_STEPS}
        </span>
      </div>

      {showTemplates && (
        <div className="strat-templates" role="group" aria-label="Start from template">
          {STRAT_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="strat-template-chip"
              title={t.hint}
              onClick={() => applyTpl(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <ol className="strat-steps" aria-labelledby={labelId}>
        {steps.map((step, index) => {
          const util = utilTagFromTask(step.text);
          const focused = focusStep === step.id;
          return (
            <li
              key={step.id}
              className={`strat-step ${focused ? "focused" : ""}`}
              onFocusCapture={() => setFocusStep(step.id)}
            >
              <div className="strat-step-index" aria-hidden>
                {index + 1}
              </div>
              <div className="strat-step-body">
                <div className="strat-step-row">
                  <input
                    className="input strat-step-input"
                    placeholder={
                      index === 0
                        ? side === "T"
                          ? "Smoke ticket…"
                          : "2 ramp / tetris…"
                        : "Next instruction…"
                    }
                    value={step.text}
                    onChange={(e) => updateStep(step.id, { text: e.target.value })}
                    onFocus={() => setFocusStep(step.id)}
                    aria-label={`Step ${index + 1}`}
                  />
                  <div className="strat-step-actions">
                    <button
                      type="button"
                      className="strat-icon-btn"
                      aria-label="Move up"
                      disabled={index === 0}
                      onClick={() => moveStep(step.id, -1)}
                    >
                      <StepMoveIcons dir="up" />
                    </button>
                    <button
                      type="button"
                      className="strat-icon-btn"
                      aria-label="Move down"
                      disabled={index === steps.length - 1}
                      onClick={() => moveStep(step.id, 1)}
                    >
                      <StepMoveIcons dir="down" />
                    </button>
                    <button
                      type="button"
                      className="strat-icon-btn"
                      aria-label="Remove step"
                      onClick={() => removeStep(step.id)}
                    >
                      <RemoveIcon />
                    </button>
                  </div>
                </div>
                <div className="strat-step-meta">
                  {util && <span className={`task-util ${nadeChipClass(util.kind)}`}>{util.label}</span>}
                  {step.link ? (
                    <span className="strat-step-link">
                      <LineupChip label={shortLinkLabel(step.link.label)} url={step.link.url} compact />
                      <button
                        type="button"
                        className="strat-icon-btn"
                        aria-label="Detach lineup"
                        onClick={() => detachStepLink(step.id)}
                      >
                        <RemoveIcon />
                      </button>
                    </span>
                  ) : (
                    <span className="muted" style={{ fontSize: 11 }}>
                      {focused ? "Pick a lineup below →" : "Optional lineup"}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {canAdd && (
        <button type="button" className="btn-ghost strat-add-step" onClick={addStep}>
          <Plus size={14} /> Add step
        </button>
      )}

      {(unusedSuggested.length > 0 || build.extraLinks.length > 0) && (
        <div className="strat-lineups">
          <p className="eyebrow">Lineups</p>
          {unusedSuggested.length > 0 && (
            <div className="strat-suggest-row">
              <span className="muted" style={{ fontSize: 11, width: "100%" }}>
                Suggested — tap to attach to the focused step
              </span>
              {unusedSuggested.map((l) => {
                const kind = nadeTypeFromLink(l);
                return (
                  <button
                    key={l.url}
                    type="button"
                    className={`strat-suggest-chip ${nadeChipClass(kind)}`}
                    onClick={() => attachLink(l)}
                    title={`Attach ${l.label}`}
                  >
                    + {shortLinkLabel(l.label)}
                  </button>
                );
              })}
            </div>
          )}
          {build.extraLinks.length > 0 && (
            <div className="strat-suggest-row">
              <span className="muted" style={{ fontSize: 11, width: "100%" }}>
                Extra lineups (not on a step)
              </span>
              {build.extraLinks.map((l) => (
                <span key={l.url} className="strat-step-link">
                  <LineupChip label={shortLinkLabel(l.label)} url={l.url} compact />
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "2px 6px", fontSize: 11 }}
                    onClick={() => attachLink(l)}
                  >
                    Attach
                  </button>
                  <button
                    type="button"
                    className="strat-icon-btn"
                    aria-label={`Remove ${l.label}`}
                    onClick={() => removeExtra(l.url)}
                  >
                    <RemoveIcon />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <details className="strat-manual-link">
        <summary>Add lineup URL</summary>
        <div className="row" style={{ marginTop: 8, gap: 6 }}>
          <input
            className="input"
            style={{ marginBottom: 0, flex: 1 }}
            placeholder="Label"
            value={manualLabel}
            onChange={(e) => setManualLabel(e.target.value)}
          />
          <input
            className="input"
            style={{ marginBottom: 0, flex: 2 }}
            placeholder="https://csnades.gg/…"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
          />
          <button type="button" className="btn-ghost" onClick={addManualLink}>
            Add
          </button>
        </div>
      </details>
    </div>
  );
}
