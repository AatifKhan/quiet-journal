import { type CSSProperties, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { ArchiveIcon, ArrowLeftIcon, CheckIcon, ChevronRightIcon, DotFilledIcon, GearIcon, HomeIcon, PlusIcon } from "@radix-ui/react-icons";
import { BottomSheet, KeyboardInput, MobileScroll, useKeyboard } from "./mobile";

type GoalStatus = "active" | "paused";
type UpdateChoice = "Made progress" | "Held steady" | "Paused for now";
type Checkpoint = { id: string; title: string; complete: boolean };
type Goal = { id: string; title: string; note: string; progress: number; status: GoalStatus; checkpoints: Checkpoint[]; updates: { label: string; date: string }[] };
type Toast = { message: string; undoGoal?: Goal };

const startingGoals: Goal[] = [
  { id: "portfolio", title: "Creative portfolio", note: "Updated 4 days ago", progress: 64, status: "active", checkpoints: [{ id: "case-study", title: "Write the first case study", complete: false }, { id: "layout", title: "Choose a simpler layout", complete: true }], updates: [{ label: "Added two case studies", date: "Oct 15" }, { label: "Decided on a simpler layout", date: "Oct 9" }, { label: "Portfolio goal created", date: "Sep 28" }] },
  { id: "strength", title: "Strength & energy", note: "Moving at your own pace", progress: 40, status: "active", checkpoints: [{ id: "walk", title: "Take two gentle walks", complete: false }], updates: [{ label: "Went for a gentle walk", date: "Oct 16" }] },
  { id: "spanish", title: "Learn Spanish", note: "Paused on Aug 20 · 8 updates saved", progress: 32, status: "paused", checkpoints: [{ id: "conversation", title: "Have a five-minute conversation", complete: false }], updates: [{ label: "Practiced a conversation", date: "Aug 20" }] },
];

const journalStore = {
  key: "quiet-journal:v1",
  load(): Goal[] {
    if (typeof window === "undefined") return startingGoals;
    try {
      const stored = window.localStorage.getItem(this.key);
      if (!stored) return startingGoals;
      const snapshot = JSON.parse(stored);
      return isJournalSnapshot(snapshot) ? snapshot.goals : startingGoals;
    } catch {
      return startingGoals;
    }
  },
  save(goals: Goal[]) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(this.key, JSON.stringify({ version: 1, goals }));
    } catch {
      // The journal remains usable for this session if browser storage is unavailable.
    }
  },
};

function isJournalSnapshot(value: unknown): value is { version: 1; goals: Goal[] } {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as { version?: unknown; goals?: unknown };
  return snapshot.version === 1 && Array.isArray(snapshot.goals) && snapshot.goals.every((goal) => (
    goal && typeof goal === "object" && typeof (goal as Goal).id === "string" && typeof (goal as Goal).title === "string" && Array.isArray((goal as Goal).checkpoints) && Array.isArray((goal as Goal).updates)
  ));
}

export default function Prototype() {
  const keyboard = useKeyboard();
  const [goals, setGoals] = useState(() => journalStore.load());
  const [screen, setScreen] = useState<"home" | "detail" | "past" | "settings" | "setup">("home");
  const [selectedId, setSelectedId] = useState("portfolio");
  const [updateOpen, setUpdateOpen] = useState(false);
  const [goalComposerOpen, setGoalComposerOpen] = useState(false);
  const [checkpointComposerOpen, setCheckpointComposerOpen] = useState(false);
  const [updateChoice, setUpdateChoice] = useState<UpdateChoice>("Made progress");
  const [newGoalName, setNewGoalName] = useState("");
  const [newCheckpointName, setNewCheckpointName] = useState("");
  const [draftGoalName, setDraftGoalName] = useState("");
  const [milestoneCount, setMilestoneCount] = useState<0 | 1 | 2 | 3 | 4>(3);
  const [draftCheckpoints, setDraftCheckpoints] = useState(["", "", ""]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [justSavedGoalId, setJustSavedGoalId] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const successTimer = useRef<number | null>(null);
  const selectedGoal = goals.find((goal) => goal.id === selectedId) ?? goals[0];
  const activeGoals = goals.filter((goal) => goal.status === "active");
  const restingGoals = goals.filter((goal) => goal.status === "paused");
  useEffect(() => { journalStore.save(goals); }, [goals]);
  const showToast = (message: string, undoGoal?: Goal) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ message, undoGoal });
    toastTimer.current = window.setTimeout(() => setToast(null), undoGoal ? 5000 : 2400);
  };
  const showProgressSuccess = (goalId: string) => {
    if (successTimer.current) window.clearTimeout(successTimer.current);
    setJustSavedGoalId(goalId);
    successTimer.current = window.setTimeout(() => setJustSavedGoalId(null), 720);
  };
  const openGoal = (goalId: string) => { setSelectedId(goalId); setScreen("detail"); };

  const updateGoal = (goalId: string, choice: UpdateChoice = "Made progress") => {
    const previousGoal = goals.find((goal) => goal.id === goalId);
    const date = choice === "Made progress" ? "Today" : "Checked in today";
    setGoals((current) => current.map((goal) => {
      if (goal.id !== goalId) return goal;
      if (choice === "Paused for now") return { ...goal, note: "Resting for now · your story is saved", status: "paused", updates: [{ label: "Paused this goal for now", date }, ...goal.updates] };
      return { ...goal, progress: choice === "Made progress" ? Math.min(100, goal.progress + 4) : goal.progress, note: choice === "Made progress" ? "Updated just now" : "Checked in just now", updates: [{ label: choice, date }, ...goal.updates] };
    }));
    setUpdateOpen(false);
    if (choice === "Paused for now") { setScreen("past"); showToast("This can rest here. Nothing is lost."); }
    else if (choice === "Made progress") { showProgressSuccess(goalId); showToast("Progress saved.", previousGoal); }
    else showToast("Check-in saved.");
  };

  const toggleCheckpoint = (checkpointId: string) => {
    setGoals((current) => current.map((goal) => goal.id === selectedGoal.id ? { ...goal, checkpoints: goal.checkpoints.map((checkpoint) => checkpoint.id === checkpointId ? { ...checkpoint, complete: !checkpoint.complete } : checkpoint) } : goal));
  };
  const addCheckpoint = () => {
    const name = newCheckpointName.trim(); if (!name) return;
    setGoals((current) => current.map((goal) => goal.id === selectedGoal.id ? { ...goal, checkpoints: [...goal.checkpoints, { id: `checkpoint-${Date.now()}`, title: name, complete: false }] } : goal));
    keyboard.hide(); setNewCheckpointName(""); setCheckpointComposerOpen(false); showToast("Checkpoint added to this goal.");
  };
  const undoProgress = () => {
    if (!toast?.undoGoal) return;
    const previousGoal = toast.undoGoal;
    setGoals((current) => current.map((goal) => goal.id === previousGoal.id ? previousGoal : goal));
    showToast("Progress returned to where it was.");
  };
  const exportJournal = () => {
    const file = new Blob([JSON.stringify({ version: 1, goals }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "quiet-journal-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Backup saved to your device.");
  };
  const importJournal = async (file: File | null) => {
    if (!file) return;
    try {
      const snapshot = JSON.parse(await file.text());
      if (!isJournalSnapshot(snapshot)) throw new Error("Invalid journal backup");
      setGoals(snapshot.goals);
      setScreen("home");
      showToast("Journal restored on this device.");
    } catch {
      showToast("That backup could not be read.");
    }
  };
  const restoreGoal = (goalId: string) => { setGoals((current) => current.map((goal) => goal.id === goalId ? { ...goal, status: "active", note: "Back when you’re ready", updates: [{ label: "Brought this goal back", date: "Today" }, ...goal.updates] } : goal)); setScreen("home"); showToast("Welcome back."); };
  const startGoalSetup = () => { const name = newGoalName.trim(); if (!name) return; keyboard.hide(); setDraftGoalName(name); setNewGoalName(""); setGoalComposerOpen(false); setMilestoneCount(3); setDraftCheckpoints(["", "", ""]); setScreen("setup"); };
  const finishGoalSetup = () => {
    const name = draftGoalName.trim();
    const visibleCheckpoints = draftCheckpoints.slice(0, milestoneCount);
    const checkpoints = milestoneCount === 0 ? [] : visibleCheckpoints.map((title, index) => ({ id: `checkpoint-${Date.now()}-${index}`, title: title.trim(), complete: false })).filter((checkpoint) => checkpoint.title);
    if (!name || (milestoneCount > 0 && checkpoints.length !== visibleCheckpoints.length)) return;
    setGoals((current) => [...current, { id: `goal-${Date.now()}`, title: name, note: "A new place to begin", progress: 0, status: "active", checkpoints, updates: [{ label: "Goal created", date: "Today" }] }]);
    keyboard.hide(); setDraftGoalName(""); setScreen("home"); showToast(checkpoints.length ? "Goal and checkpoints added." : "New goal added.");
  };

  return <div className="journal-app" aria-label="Quiet Journal goal tracker">
    {screen !== "setup" ? <header className="journal-header">{screen === "home" ? <><div><p className="journal-eyebrow">Your goals</p><h1>Small moves, held in view.</h1></div><button className="header-action" type="button" onClick={() => setGoalComposerOpen(true)} aria-label="Add a goal"><PlusIcon /></button></> : <><button className="back-action" type="button" onClick={() => setScreen("home")}><ArrowLeftIcon />Goals</button><span className="header-space" aria-hidden="true" /></>}</header> : null}
    <MobileScroll className="journal-scroll"><main className={screen === "setup" ? "journal-content setup-content" : "journal-content"}>
      {screen === "home" ? <HomeScreen activeGoals={activeGoals} openGoal={openGoal} updateGoal={updateGoal} justSavedGoalId={justSavedGoalId} goToPast={() => setScreen("past")} goalComposerOpen={goalComposerOpen} openGoalComposer={() => setGoalComposerOpen(true)} closeGoalComposer={() => { keyboard.hide(); setNewGoalName(""); setGoalComposerOpen(false); }} newGoalName={newGoalName} setNewGoalName={setNewGoalName} createGoal={startGoalSetup} /> : null}
      {screen === "detail" ? <DetailScreen goal={selectedGoal} justSaved={justSavedGoalId === selectedGoal.id} makeProgress={() => updateGoal(selectedGoal.id)} openDetailedUpdate={() => setUpdateOpen(true)} checkpointComposerOpen={checkpointComposerOpen} openCheckpointComposer={() => setCheckpointComposerOpen(true)} closeCheckpointComposer={() => { keyboard.hide(); setNewCheckpointName(""); setCheckpointComposerOpen(false); }} newCheckpointName={newCheckpointName} setNewCheckpointName={setNewCheckpointName} addCheckpoint={addCheckpoint} toggleCheckpoint={toggleCheckpoint} pauseGoal={() => updateGoal(selectedGoal.id, "Paused for now")} /> : null}
      {screen === "past" ? <PastScreen goals={restingGoals} restoreGoal={restoreGoal} /> : null}
      {screen === "settings" ? <SettingsScreen exportJournal={exportJournal} importJournal={importJournal} /> : null}
      {screen === "setup" ? <GoalSetupScreen milestoneCount={milestoneCount} setMilestoneCount={setMilestoneCount} checkpoints={draftCheckpoints} setCheckpoints={setDraftCheckpoints} finish={finishGoalSetup} /> : null}
    </main></MobileScroll>
    {screen !== "setup" ? <JournalDock screen={screen} goHome={() => setScreen("home")} goPast={() => setScreen("past")} openSettings={() => setScreen("settings")} /> : null}
    <BottomSheet open={updateOpen} onOpenChange={setUpdateOpen} title="How did it go?" description="Pick the closest answer. A note can come later." snap={0.58}><div className="update-options">{(["Made progress", "Held steady", "Paused for now"] as UpdateChoice[]).map((choice) => <button key={choice} className={updateChoice === choice ? "update-option selected" : "update-option"} type="button" onClick={() => setUpdateChoice(choice)}><span className="choice-ring" aria-hidden="true">{updateChoice === choice ? <CheckIcon /> : null}</span>{choice}</button>)}<button className="sheet-primary" type="button" onClick={() => updateGoal(selectedGoal.id, updateChoice)}>Save update</button></div></BottomSheet>
    {toast ? <div className="journal-toast" role="status" aria-live="polite"><span>{toast.message}</span>{toast.undoGoal ? <button type="button" onClick={undoProgress}>Undo</button> : null}</div> : null}
  </div>;
}

function HomeScreen({ activeGoals, openGoal, updateGoal, justSavedGoalId, goToPast, goalComposerOpen, openGoalComposer, closeGoalComposer, newGoalName, setNewGoalName, createGoal }: { activeGoals: Goal[]; openGoal: (id: string) => void; updateGoal: (id: string) => void; justSavedGoalId: string | null; goToPast: () => void; goalComposerOpen: boolean; openGoalComposer: () => void; closeGoalComposer: () => void; newGoalName: string; setNewGoalName: (value: string) => void; createGoal: () => void }) {
  return <>{goalComposerOpen ? <GoalComposer value={newGoalName} onChange={setNewGoalName} onSave={createGoal} onCancel={closeGoalComposer} /> : null}<section className="goal-list" aria-label="Active goals">{activeGoals.map((goal) => <GoalCard key={goal.id} goal={goal} justSaved={goal.id === justSavedGoalId} openGoal={() => openGoal(goal.id)} updateGoal={() => updateGoal(goal.id)} />)}</section>{!goalComposerOpen ? <button className="goal-add-row" type="button" onClick={openGoalComposer}><PlusIcon /><span>Add a goal</span></button> : null}<button className="past-link" type="button" onClick={goToPast}>View paused goals<ChevronRightIcon /></button></>;
}

function GoalComposer({ value, onChange, onSave, onCancel }: { value: string; onChange: (value: string) => void; onSave: () => void; onCancel: () => void }) {
  return <div className="goal-composer"><div className="goal-composer-heading"><span><PlusIcon aria-hidden="true" />Add a goal</span><button type="button" onClick={onCancel}>Cancel</button></div><label htmlFor="goal-name">What would you like to make room for?</label><KeyboardInput id="goal-name" value={value} onChange={(event) => onChange(event.target.value)} placeholder="e.g. Learn to draw" autoFocus onKeyDown={(event) => { if (event.key === "Enter" && value.trim()) onSave(); }} /><button className="goal-save" type="button" onClick={onSave} disabled={!value.trim()}><PlusIcon />Add goal</button></div>;
}

function GoalSetupScreen({ milestoneCount, setMilestoneCount, checkpoints, setCheckpoints, finish }: { milestoneCount: 0 | 1 | 2 | 3 | 4; setMilestoneCount: (count: 0 | 1 | 2 | 3 | 4) => void; checkpoints: string[]; setCheckpoints: (checkpoints: string[]) => void; finish: () => void }) {
  const visibleCheckpoints = milestoneCount === 4 ? checkpoints : checkpoints.slice(0, milestoneCount);
  const chooseCount = (count: 0 | 1 | 2 | 3 | 4) => { setMilestoneCount(count); if (checkpoints.length < count) setCheckpoints([...checkpoints, ...Array.from({ length: count - checkpoints.length }, () => "")]); };
  const updateCheckpoint = (index: number, value: string) => setCheckpoints(checkpoints.map((checkpoint, checkpointIndex) => checkpointIndex === index ? value : checkpoint));
  const disabled = milestoneCount > 0 && visibleCheckpoints.some((checkpoint) => !checkpoint.trim());
  return <section className="goal-setup" aria-label="Set up checkpoints"><p className="setup-step">2 of 2 <span>·</span> Checkpoints</p><h2>Add a little shape</h2><p className="setup-prompt">Would checkpoints help this feel clearer?</p><div className="setup-counts" role="group" aria-label="How many checkpoints would help"><button className={milestoneCount === 0 ? "setup-count selected none" : "setup-count none"} type="button" aria-pressed={milestoneCount === 0} onClick={() => chooseCount(0)}>None for now</button>{([1, 2, 3, 4] as const).map((count) => <button className={milestoneCount === count ? "setup-count selected" : "setup-count"} type="button" key={count} aria-pressed={milestoneCount === count} onClick={() => chooseCount(count)}>{count === 4 ? "4+" : count}</button>)}</div>{visibleCheckpoints.length ? <div className="setup-checkpoints">{visibleCheckpoints.map((checkpoint, index) => <div className="setup-checkpoint" key={index}><span>{index + 1}</span><KeyboardInput id={`setup-checkpoint-${index}`} aria-label={`Checkpoint ${index + 1}`} value={checkpoint} onChange={(event) => updateCheckpoint(index, event.target.value)} placeholder={index === 0 ? "e.g. Share the first case study" : index === 1 ? "e.g. Publish the portfolio" : index === 2 ? "e.g. Ask for feedback" : "Name this checkpoint"} /></div>)}{milestoneCount === 4 ? <button className="setup-add-another" type="button" onClick={() => setCheckpoints([...checkpoints, ""])}><PlusIcon />Add another checkpoint</button> : null}</div> : null}<div className="setup-actions">{milestoneCount > 0 ? <button className="setup-skip" type="button" onClick={() => chooseCount(0)}>Skip for now</button> : null}<button className="setup-save" type="button" onClick={finish} disabled={disabled}>{milestoneCount === 0 ? "Add this goal" : `Save ${visibleCheckpoints.length} checkpoint${visibleCheckpoints.length === 1 ? "" : "s"}`}</button></div></section>;
}

function GoalCard({ goal, justSaved, openGoal, updateGoal }: { goal: Goal; justSaved: boolean; openGoal: () => void; updateGoal: () => void }) {
  const nextCheckpoint = goal.checkpoints.find((checkpoint) => !checkpoint.complete);
  return <article className="goal-card"><button className="goal-summary" type="button" onClick={openGoal}><span><strong>{goal.title}</strong><small>{goal.note}</small></span><b>{goal.progress}%</b></button><div className="progress-track" role="progressbar" aria-label={`${goal.title} progress`} aria-valuenow={goal.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${goal.progress}%` }} /></div><div className="checkpoint-row"><button className="checkpoint-copy" type="button" onClick={openGoal}><span>Checkpoint</span><strong>{nextCheckpoint?.title ?? "Add a checkpoint"}</strong></button><button className={justSaved ? "quick-progress is-saved" : "quick-progress"} type="button" onClick={updateGoal} aria-label={`Log progress for ${goal.title}`}>{justSaved ? <CheckIcon /> : <PlusIcon />}</button></div></article>;
}

function DetailScreen({ goal, justSaved, makeProgress, openDetailedUpdate, checkpointComposerOpen, openCheckpointComposer, closeCheckpointComposer, newCheckpointName, setNewCheckpointName, addCheckpoint, toggleCheckpoint, pauseGoal }: { goal: Goal; justSaved: boolean; makeProgress: () => void; openDetailedUpdate: () => void; checkpointComposerOpen: boolean; openCheckpointComposer: () => void; closeCheckpointComposer: () => void; newCheckpointName: string; setNewCheckpointName: (value: string) => void; addCheckpoint: () => void; toggleCheckpoint: (id: string) => void; pauseGoal: () => void }) {
  return <><section className="detail-intro"><p className="journal-eyebrow">Progress story</p><div className="detail-title-row"><h2>{goal.title}</h2><button className={justSaved ? "quick-progress large is-saved" : "quick-progress large"} type="button" onClick={makeProgress} aria-label={`Log progress for ${goal.title}`}>{justSaved ? <CheckIcon /> : <PlusIcon />}</button></div><div className="progress-hero"><strong>{goal.progress}% complete</strong><p>{goal.note}. This can be uneven and still count.</p></div><button className="subtle-action" type="button" onClick={openDetailedUpdate}>Log a different update<ChevronRightIcon /></button></section><section className="checkpoint-section" aria-label="Checkpoints"><div className="section-heading"><h3>Checkpoints</h3></div>{goal.checkpoints.map((checkpoint) => <button className={checkpoint.complete ? "checkpoint-item done" : "checkpoint-item"} type="button" key={checkpoint.id} onClick={() => toggleCheckpoint(checkpoint.id)}><span className="checkpoint-indicator">{checkpoint.complete ? <CheckIcon /> : null}</span><span className="checkpoint-title">{checkpoint.title}</span></button>)}{checkpointComposerOpen ? <CheckpointComposer value={newCheckpointName} onChange={setNewCheckpointName} onSave={addCheckpoint} onCancel={closeCheckpointComposer} /> : <button className="checkpoint-add-row" type="button" onClick={openCheckpointComposer}><PlusIcon /><span>{goal.checkpoints.length ? "Add a checkpoint" : "Add your first checkpoint"}</span></button>}</section><section className="timeline" aria-label="Progress updates"><h3>Recent updates</h3>{goal.updates.slice(0, 4).map((update, index) => <div className="timeline-entry" key={`${update.label}-${index}`}><span aria-hidden="true" /><div>{update.label}<small>{update.date}</small></div></div>)}</section><button className="pause-action" type="button" onClick={pauseGoal}>Pause this goal</button></>;
}

function CheckpointComposer({ value, onChange, onSave, onCancel }: { value: string; onChange: (value: string) => void; onSave: () => void; onCancel: () => void }) {
  return <div className="checkpoint-composer"><div className="checkpoint-composer-heading"><span><PlusIcon aria-hidden="true" />Add a checkpoint</span><button type="button" onClick={onCancel}>Cancel</button></div><label htmlFor="checkpoint-name">What would you like to remember?</label><KeyboardInput id="checkpoint-name" value={value} onChange={(event) => onChange(event.target.value)} placeholder="e.g. Share the first case study" autoFocus onKeyDown={(event) => { if (event.key === "Enter" && value.trim()) onSave(); }} /><button className="checkpoint-save" type="button" onClick={onSave} disabled={!value.trim()}><PlusIcon />Add checkpoint</button></div>;
}

function PastScreen({ goals, restoreGoal }: { goals: Goal[]; restoreGoal: (id: string) => void }) { return <section className="past-screen"><p className="journal-eyebrow">Past goals</p><h2>Nothing has disappeared.</h2>{goals.length ? goals.map((goal) => <article className="past-card" key={goal.id}><strong>{goal.title}</strong><p>{goal.note}</p><button type="button" onClick={() => restoreGoal(goal.id)}>Bring back</button></article>) : <p className="empty-state">There is nothing resting here right now.</p>}</section>; }

function SettingsScreen({ exportJournal, importJournal }: { exportJournal: () => void; importJournal: (file: File | null) => void }) {
  return <section className="settings-screen"><p className="journal-eyebrow">Settings</p><h2>Your journal stays here.</h2><p className="settings-intro">It lives only in this browser on this device. Nothing is sent anywhere.</p><div className="settings-card"><div><strong>Backup your journal</strong><p>Keep a private copy whenever you like.</p></div><button className="settings-action" type="button" onClick={exportJournal}>Export backup</button></div><div className="settings-card"><div><strong>Restore a backup</strong><p>Bring back a journal you exported earlier.</p></div><label className="settings-action" htmlFor="journal-import">Import backup<input id="journal-import" type="file" accept="application/json,.json" onChange={(event) => { importJournal(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} /></label></div><p className="settings-footnote">If you clear this site’s browser data, use a backup to bring your journal back.</p></section>;
}

function JournalDock({ screen, goHome, goPast, openSettings }: { screen: "home" | "detail" | "past" | "settings"; goHome: () => void; goPast: () => void; openSettings: () => void }) {
  const [magnification, setMagnification] = useState([0, 0, 0]);
  const items = [
    { label: "Goals", Icon: HomeIcon, active: screen === "home" || screen === "detail", onClick: goHome },
    { label: "Past", Icon: ArchiveIcon, active: screen === "past", onClick: goPast },
    { label: "Settings", Icon: GearIcon, active: screen === "settings", onClick: openSettings },
  ];
  const resetMagnification = () => setMagnification([0, 0, 0]);
  const updateMagnification = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
    const next = buttons.map((button) => {
      const bounds = button.getBoundingClientRect();
      const distance = Math.abs(event.clientX - (bounds.left + bounds.width / 2));
      return Math.max(0, 1 - distance / 92);
    });
    setMagnification(next);
  };

  return <nav className="journal-nav" aria-label="Primary navigation" onPointerMove={updateMagnification} onPointerLeave={resetMagnification}>
    {items.map(({ label, Icon, active, onClick }, index) => {
      const intensity = magnification[index] ?? 0;
      const style = { "--dock-scale": 1 + intensity * .24, "--dock-lift": `${intensity * 8}px` } as CSSProperties;
      return <button className={active ? "dock-item active" : "dock-item"} type="button" key={label} onClick={() => { resetMagnification(); onClick(); }} aria-label={label} style={style}><Icon />{active ? <DotFilledIcon className="dock-active-dot" aria-hidden="true" /> : null}</button>;
    })}
  </nav>;
}
