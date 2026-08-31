import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchList, createRecord } from "../api.js";
import "./SalesCRM.css";

export default function SalesManagerCRM({ onExit }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [executives, setExecutives] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [selectedRegion, setSelectedRegion] = useState(null);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskPincode, setTaskPincode] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDue, setTaskDue] = useState("");
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchList("sales_executives"), fetchList("pincode_coverage"), fetchList("executive_tasks")])
      .then(([execs, cov, tsk]) => {
        setExecutives(execs);
        setCoverage(cov);
        setTasks(tsk);
        setSelectedRegion((prev) => prev ?? execs[0]?.region ?? null);
      })
      .catch((err) => setError(err.message || "Failed to load Sales Manager data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const regions = useMemo(
    () => [...new Set(executives.map((e) => e.region).filter(Boolean))],
    [executives]
  );

  const execsInRegion = useMemo(
    () => executives.filter((e) => e.region === selectedRegion),
    [executives, selectedRegion]
  );

  // executive_tasks has no field linking a task to a specific executive —
  // only a pincode. So a task is attributed to whichever executive covers
  // that pincode (via pincode_coverage). A task with no pincode is a
  // general task and isn't attributable to any one executive, so it's
  // excluded from per-executive completion tracking below.
  const execStats = useMemo(() => {
    return execsInRegion.map((exec) => {
      const myPincodes = new Set(coverage.filter((c) => c.executive_id === exec.id).map((c) => c.pincode));
      const myTasks = tasks.filter((t) => t.pincode && myPincodes.has(t.pincode));
      const done = myTasks.filter((t) => t.status === "done").length;
      const pct = myTasks.length > 0 ? Math.round((done / myTasks.length) * 100) : null;
      return { exec, pincodes: myPincodes, taskCount: myTasks.length, done, pct };
    });
  }, [execsInRegion, coverage, tasks]);

  const regionPincodes = useMemo(
    () => [...new Set(coverage.filter((c) => execsInRegion.some((e) => e.id === c.executive_id)).map((c) => c.pincode))],
    [coverage, execsInRegion]
  );

  function addTask() {
    if (!taskTitle.trim()) return;
    setBusy(true);
    createRecord("executive_tasks", {
      title: taskTitle.trim(),
      task_type: "manager_assigned",
      entity_type: "general",
      pincode: taskPincode.trim() || null,
      priority: taskPriority,
      status: "open",
      due_date: taskDue || null,
    })
      .then((created) => {
        setTasks((prev) => [...prev, created]);
        setTaskTitle("");
        setTaskPincode("");
        setTaskDue("");
        setTaskPriority("medium");
      })
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  }

  if (loading) {
    return (
      <div className="sales-crm-page">
        <p className="zzc-muted">Loading Sales Manager view…</p>
      </div>
    );
  }

  return (
    <div className="sales-crm-page">
      <header className="sales-crm-header">
        <div className="sales-crm-brand">
          <div className="sales-crm-logo" />
          <div>
            <h1>Sales Manager · Team CRM</h1>
            <p className="zzc-muted zzc-small">Assign field tasks to your sales executives and track completion by region.</p>
          </div>
        </div>
        <div className="sales-crm-actions">
          <select className="sales-crm-select" value={selectedRegion ?? ""} onChange={(e) => setSelectedRegion(e.target.value)}>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button className="zzc-btn zzc-btn-outline" onClick={loadAll} disabled={busy}>
            Reload
          </button>
          <button className="zzc-btn zzc-btn-outline" onClick={onExit}>
            Admin CRM
          </button>
        </div>
      </header>

      {error && <div className="dash-error sales-crm-error">{error}</div>}

      <div className="sales-crm-card">
        <h3>Assign a task to your team</h3>
        <div className="sales-task-form">
          <input
            className="sales-task-title-input"
            placeholder="Task title"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
          />
          <select value={taskPincode} onChange={(e) => setTaskPincode(e.target.value)}>
            <option value="">Pin code</option>
            {regionPincodes.map((pc) => (
              <option key={pc} value={pc}>
                {pc}
              </option>
            ))}
          </select>
          <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
          <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
          <button className="zzc-btn zzc-btn-primary" onClick={addTask} disabled={busy || !taskTitle.trim()}>
            Add task
          </button>
        </div>
        <p className="zzc-muted zzc-small" style={{ marginTop: 10 }}>
          A task is matched to whichever executive covers the pin code you pick — there's no direct assignee field on tasks in the
          current schema, so pin code is what determines who sees it.
        </p>
      </div>

      <div className="sales-crm-card">
        <h3>Task completion by executive — {selectedRegion || "—"}</h3>
        <div className="sales-task-list">
          {execStats.length === 0 ? (
            <p className="zzc-muted zzc-small">No executives in this region yet.</p>
          ) : (
            execStats.map(({ exec, taskCount, done, pct }) => (
              <div className="sales-task-row" key={exec.id}>
                <div>
                  <p className="sales-task-title">{exec.name}</p>
                  <p className="zzc-muted zzc-small">
                    {taskCount} task{taskCount === 1 ? "" : "s"} assigned · {done} completed
                  </p>
                </div>
                <span className="sales-status-pill active">{pct === null ? "no tasks yet" : `${pct}% complete`}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
