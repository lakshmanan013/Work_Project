import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchList, createRecord } from "../api.js";
import "./SalesCRM.css";

const ALL_REGIONS = "__all__";

export default function RegionalManagerCRM({ onExit }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [executives, setExecutives] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [selectedRegion, setSelectedRegion] = useState(ALL_REGIONS);

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
      })
      .catch((err) => setError(err.message || "Failed to load Regional Manager data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const regions = useMemo(() => [...new Set(executives.map((e) => e.region).filter(Boolean))], [executives]);

  const execsInScope = useMemo(
    () => (selectedRegion === ALL_REGIONS ? executives : executives.filter((e) => e.region === selectedRegion)),
    [executives, selectedRegion]
  );

  // Same schema limitation as the Sales Manager view: tasks only carry a
  // pin code, not an assignee, so completion is attributed via
  // pincode_coverage. There is also no Sales Manager entity in the backend
  // at all yet (no /sales-managers data), so a manager-tier breakdown isn't
  // possible — this rolls everything up to Sales Executive, region-wide.
  const execStats = useMemo(() => {
    return execsInScope.map((exec) => {
      const myPincodes = new Set(coverage.filter((c) => c.executive_id === exec.id).map((c) => c.pincode));
      const myTasks = tasks.filter((t) => t.pincode && myPincodes.has(t.pincode));
      const done = myTasks.filter((t) => t.status === "done").length;
      const pct = myTasks.length > 0 ? Math.round((done / myTasks.length) * 100) : null;
      return { exec, taskCount: myTasks.length, done, pct };
    });
  }, [execsInScope, coverage, tasks]);

  const totalAssigned = execStats.reduce((s, r) => s + r.taskCount, 0);
  const totalDone = execStats.reduce((s, r) => s + r.done, 0);
  const overallPct = totalAssigned > 0 ? Math.round((totalDone / totalAssigned) * 100) : null;

  const scopePincodes = useMemo(
    () => [...new Set(coverage.filter((c) => execsInScope.some((e) => e.id === c.executive_id)).map((c) => c.pincode))],
    [coverage, execsInScope]
  );

  function addTask() {
    if (!taskTitle.trim()) return;
    setBusy(true);
    createRecord("executive_tasks", {
      title: taskTitle.trim(),
      task_type: "regional_assigned",
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
        <p className="zzc-muted">Loading Regional Manager view…</p>
      </div>
    );
  }

  return (
    <div className="sales-crm-page">
      <header className="sales-crm-header">
        <div className="sales-crm-brand">
          <div className="sales-crm-logo" />
          <div>
            <h1>Regional Manager · Team CRM</h1>
            <p className="zzc-muted zzc-small">Assign tasks across your region and track completion for the whole team.</p>
          </div>
        </div>
        <div className="sales-crm-actions">
          <select className="sales-crm-select" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
            <option value={ALL_REGIONS}>All regions</option>
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

      <div className="sales-crm-stats">
        <div className="sales-stat-card">
          <p className="sales-stat-label">Executives in scope</p>
          <p className="sales-stat-value">{execsInScope.length}</p>
        </div>
        <div className="sales-stat-card">
          <p className="sales-stat-label">Tasks assigned</p>
          <p className="sales-stat-value">{totalAssigned}</p>
        </div>
        <div className="sales-stat-card">
          <p className="sales-stat-label">Tasks completed</p>
          <p className="sales-stat-value">{totalDone}</p>
        </div>
        <div className="sales-stat-card">
          <p className="sales-stat-label">Overall completion</p>
          <p className="sales-stat-value">{overallPct === null ? "—" : `${overallPct}%`}</p>
        </div>
      </div>

      <div className="sales-crm-card">
        <h3>Assign a task</h3>
        <div className="sales-task-form">
          <input
            className="sales-task-title-input"
            placeholder="Task title"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
          />
          <select value={taskPincode} onChange={(e) => setTaskPincode(e.target.value)}>
            <option value="">Pin code</option>
            {scopePincodes.map((pc) => (
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
          Tasks are matched to whichever executive covers the chosen pin code — the schema has no Sales Manager records yet and
          no direct assignee field on tasks, so this rolls up to Sales Executive level, region-wide, rather than by manager.
        </p>
      </div>

      <div className="sales-crm-card">
        <h3>Completion by executive {selectedRegion !== ALL_REGIONS && `— ${selectedRegion}`}</h3>
        <div className="sales-task-list">
          {execStats.length === 0 ? (
            <p className="zzc-muted zzc-small">No executives in scope yet.</p>
          ) : (
            execStats.map(({ exec, taskCount, done, pct }) => (
              <div className="sales-task-row" key={exec.id}>
                <div>
                  <p className="sales-task-title">
                    {exec.name} <span className="zzc-muted zzc-small">· {exec.region || "—"}</span>
                  </p>
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
