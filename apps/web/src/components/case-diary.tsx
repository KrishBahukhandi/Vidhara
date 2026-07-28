"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ACT_SLUG, parseSectionRef } from "@nexlex/shared";

import { track } from "@/lib/analytics";
import {
  daysUntil,
  rememberedEmail,
  setRememberedEmail,
  useCaseDiary,
  type DiaryCase,
  type NewCase,
} from "@/lib/case-diary";
import { requestReminder } from "@/lib/hearing-reminder";
import { fetchSection } from "@/lib/section-lookup";

const EMPTY: NewCase = { title: "", court: "", caseNumber: "", nextHearing: "", stage: "", notes: "" };

/** "Tomorrow" / "in 4 days" / "3 days overdue" — what an advocate scans for. */
function hearingLabel(iso: string): { text: string; tone: "danger" | "warn" | "muted" } {
  const d = daysUntil(iso);
  if (d === null) return { text: "No date set", tone: "muted" };
  if (d < 0) return { text: `${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} ago`, tone: "danger" };
  if (d === 0) return { text: "Today", tone: "danger" };
  if (d === 1) return { text: "Tomorrow", tone: "warn" };
  if (d <= 7) return { text: `In ${d} days`, tone: "warn" };
  return { text: new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), tone: "muted" };
}

const TONE = {
  danger: "text-danger",
  warn: "text-warning",
  muted: "text-text-muted",
} as const;

function CaseForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: NewCase;
  onSave: (c: NewCase) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<NewCase>(initial);
  const set = (k: keyof NewCase) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const field =
    "h-11 w-full rounded-md border border-border bg-bg px-3 text-body text-text placeholder:text-text-faint focus:border-brand focus:outline-none";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        onSave(form);
      }}
      className="rounded-lg border border-border bg-surface p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-small text-text-muted">Cause title *</span>
          <input className={field} value={form.title} onChange={set("title")} placeholder="State v. Kumar" required />
        </label>
        <label>
          <span className="text-small text-text-muted">Court</span>
          <input className={field} value={form.court} onChange={set("court")} placeholder="Sessions Court, Dehradun" />
        </label>
        <label>
          <span className="text-small text-text-muted">Case number</span>
          <input className={field} value={form.caseNumber} onChange={set("caseNumber")} placeholder="CC 412/2026" />
        </label>
        <label>
          <span className="text-small text-text-muted">Next hearing</span>
          <input type="date" className={field} value={form.nextHearing} onChange={set("nextHearing")} />
        </label>
        <label>
          <span className="text-small text-text-muted">Stage</span>
          <input className={field} value={form.stage} onChange={set("stage")} placeholder="Bail application" />
        </label>
        <label className="sm:col-span-2">
          <span className="text-small text-text-muted">Notes</span>
          <textarea
            className="min-h-20 w-full rounded-md border border-border bg-bg px-3 py-2 text-body text-text placeholder:text-text-faint focus:border-brand focus:outline-none"
            value={form.notes}
            onChange={set("notes")}
            placeholder="Next step, adjournment reason, documents to file…"
          />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="inline-flex h-10 items-center rounded-md bg-brand px-5 font-medium text-on-brand hover:opacity-90">
          Save
        </button>
        <button type="button" onClick={onCancel} className="inline-flex h-10 items-center rounded-md border border-border px-4 font-medium text-text-muted hover:text-text">
          Cancel
        </button>
      </div>
    </form>
  );
}

function AttachSection({ caseId, onAttach }: { caseId: string; onAttach: (id: string, s: NonNullable<Awaited<ReturnType<typeof fetchSection>>>) => void }) {
  const [q, setQ] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  const go = async () => {
    const ref = parseSectionRef(q.trim());
    if (!ref?.act) {
      setState("error");
      setMsg("Type an exact reference, e.g. “302 IPC” or “BNSS 480”.");
      return;
    }
    setState("loading");
    const found = await fetchSection(ACT_SLUG[ref.act], ref.section);
    if (!found) {
      setState("error");
      setMsg(`No section ${ref.section} in that act.`);
      return;
    }
    onAttach(caseId, found);
    track("diary_section_attached", { act: found.act });
    setQ("");
    setState("idle");
    setMsg("");
  };

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void go();
            }
          }}
          placeholder="Attach a section — 302 IPC, BNSS 480…"
          className="h-10 flex-1 rounded-md border border-border bg-bg px-3 font-mono text-small text-text placeholder:text-text-faint focus:border-brand focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void go()}
          disabled={state === "loading"}
          className="inline-flex h-10 items-center rounded-md border border-brand px-4 text-small font-medium text-brand hover:bg-bg disabled:opacity-60">
          {state === "loading" ? "…" : "Attach"}
        </button>
      </div>
      {state === "error" ? <p className="mt-1 text-small text-text-muted">{msg}</p> : null}
    </div>
  );
}

/**
 * The only place case data leaves the device — so the form says exactly what
 * is sent, and the label is editable precisely so a client's name need never
 * be uploaded.
 */
function ReminderForm({
  c,
  onDone,
}: {
  c: DiaryCase;
  onDone: (hearing: string) => void;
}) {
  const [email, setEmail] = useState(rememberedEmail());
  const [label, setLabel] = useState(c.title);
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [msg, setMsg] = useState("");

  const field =
    "h-10 w-full rounded-md border border-border bg-bg px-3 text-small text-text placeholder:text-text-faint focus:border-brand focus:outline-none";

  const submit = async () => {
    setState("sending");
    const res = await requestReminder({ email, label, hearingOn: c.nextHearing });
    if (!res.ok) {
      setMsg(res.error);
      setState("error");
      return;
    }
    setRememberedEmail(email.trim());
    track("reminder_requested", {});
    onDone(c.nextHearing);
  };

  return (
    <div className="mt-3 rounded-md border border-dashed border-border p-4">
      <p className="text-small font-medium text-text">Email me the evening before</p>
      <p className="mt-1 text-micro text-text-muted">
        Only these two lines and the date leave your device — your notes, case number, court and
        attached sections stay here. We&rsquo;ll send one confirmation email first.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          type="email"
          className={field}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <input
          className={field}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={120}
          placeholder="What to call it in the email"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={state === "sending"}
          className="inline-flex h-9 items-center rounded-md bg-brand px-4 text-small font-medium text-on-brand hover:opacity-90 disabled:opacity-60">
          {state === "sending" ? "Setting…" : "Set reminder"}
        </button>
        <button
          type="button"
          onClick={() => onDone("")}
          className="text-small text-text-muted hover:text-text">
          Cancel
        </button>
        {state === "error" ? <span className="text-small text-danger">{msg}</span> : null}
      </div>
    </div>
  );
}

function CaseCard({
  c,
  diary,
}: {
  c: DiaryCase;
  diary: ReturnType<typeof useCaseDiary>;
}) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [reminding, setReminding] = useState(false);
  const label = hearingLabel(c.nextHearing);
  // A reminder is stale if the hearing was moved after it was set.
  const reminderSet = Boolean(c.nextHearing) && c.remindedFor === c.nextHearing;

  if (editing) {
    return (
      <li>
        <CaseForm
          initial={c}
          onSave={(patch) => {
            diary.update(c.id, patch);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-h3 font-semibold text-text">{c.title}</h3>
          <p className="mt-0.5 text-small text-text-muted">
            {[c.court, c.caseNumber, c.stage].filter(Boolean).join(" · ") || "No details yet"}
          </p>
        </div>
        <span className={`shrink-0 text-small font-medium ${TONE[label.tone]}`}>{label.text}</span>
      </div>

      {c.sections.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {c.sections.map((s) => (
            <li
              key={`${s.slug}-${s.number}`}
              className="inline-flex items-center gap-2 rounded-md border border-border px-2.5 py-1">
              <Link
                href={`/acts/${s.slug}/${encodeURIComponent(s.number)}`}
                className="font-mono text-small font-medium text-brand hover:underline">
                {s.act} §{s.number}
              </Link>
              {s.counterpart ? (
                <span className="text-micro text-text-muted">{s.counterpart}</span>
              ) : null}
              <button
                type="button"
                aria-label={`Remove ${s.act} §${s.number}`}
                onClick={() => diary.detachSection(c.id, s.slug, s.number)}
                className="text-micro text-text-faint hover:text-danger">
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <>
          {c.notes ? (
            <p className="mt-3 whitespace-pre-wrap text-body text-text-muted">{c.notes}</p>
          ) : null}
          <AttachSection caseId={c.id} onAttach={diary.attachSection} />
        </>
      ) : null}

      {reminding ? (
        <ReminderForm
          c={c}
          onDone={(hearing) => {
            if (hearing) diary.update(c.id, { remindedFor: hearing });
            setReminding(false);
          }}
        />
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-small text-text-muted hover:text-text">
          {open ? "Hide" : "Open"}
        </button>
        {c.nextHearing ? (
          reminderSet ? (
            <span className="text-small text-success">✓ Reminder set</span>
          ) : (
            <button
              type="button"
              onClick={() => setReminding((r) => !r)}
              className="text-small text-text-muted hover:text-text">
              Remind me
            </button>
          )
        ) : null}
        <button type="button" onClick={() => setEditing(true)} className="text-small text-text-muted hover:text-text">
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete “${c.title}”? This can't be undone.`)) diary.remove(c.id);
          }}
          className="ml-auto text-small text-text-faint hover:text-danger">
          Delete
        </button>
      </div>
    </li>
  );
}

export function CaseDiary() {
  const diary = useCaseDiary();
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState("");

  const doExport = () => {
    const blob = new Blob([diary.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vidhara-case-diary-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    track("diary_exported", { cases: diary.cases.length });
  };

  const doImport = async (file: File) => {
    const result = diary.importJson(await file.text());
    setNotice(result.ok ? `Imported ${result.added} case${result.added === 1 ? "" : "s"}.` : (result.error ?? "Import failed."));
    setTimeout(() => setNotice(""), 4000);
  };

  const upcoming = diary.cases.filter((c) => {
    const d = daysUntil(c.nextHearing);
    return d !== null && d >= 0 && d <= 7;
  }).length;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setAdding((a) => !a)}
          className="inline-flex h-11 items-center rounded-md bg-brand px-5 font-medium text-on-brand hover:opacity-90">
          {adding ? "Close" : "+ Add case"}
        </button>
        {diary.cases.length > 0 ? (
          <>
            <button type="button" onClick={doExport} className="inline-flex h-11 items-center rounded-md border border-border px-4 text-small font-medium text-text-muted hover:text-text">
              Export
            </button>
            <span className="text-small text-text-muted">
              {diary.cases.length} case{diary.cases.length === 1 ? "" : "s"}
              {upcoming > 0 ? ` · ${upcoming} within 7 days` : ""}
            </span>
          </>
        ) : null}
        <button type="button" onClick={() => fileRef.current?.click()} className="ml-auto text-small text-text-faint hover:text-text-muted">
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
            e.target.value = "";
          }}
        />
      </div>

      {notice ? <p className="mt-3 text-small text-text-muted">{notice}</p> : null}

      {adding ? (
        <div className="mt-4">
          <CaseForm
            initial={EMPTY}
            onSave={(c) => {
              diary.add(c);
              track("diary_case_added", {});
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : null}

      {diary.cases.length === 0 && !adding ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-surface p-6">
          <p className="font-medium text-text">No cases yet.</p>
          <p className="mt-1 max-w-measure text-small text-text-muted">
            Add a matter with its next date, then attach the sections it turns on — each one shows
            its counterpart in the other code, so a stale citation doesn&rsquo;t reach your draft.
          </p>
        </div>
      ) : null}

      <ul className="mt-5 space-y-4">
        {diary.cases.map((c) => (
          <CaseCard key={c.id} c={c} diary={diary} />
        ))}
      </ul>
    </div>
  );
}
