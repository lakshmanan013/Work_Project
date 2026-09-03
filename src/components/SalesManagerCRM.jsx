import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchList, createRecord } from "../api.js";
import logo from "../assets/zenve-zippy-logo.png";
import "./SalesCRM.css";

function formatINR(n) {
  return "₹" + Math.round(n || 0).toLocaleString("en-IN");
}

export default function SalesManagerCRM({ onExit }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [executives, setExecutives] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [products, setProducts] = useState([]);

  const [selectedRegion, setSelectedRegion] = useState(null);
  const [subTab, setSubTab] = useState("team");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskPincode, setTaskPincode] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDue, setTaskDue] = useState("");
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchList("sales_executives"), fetchList("pincode_coverage"), fetchList("executive_tasks"), fetchList("doctors"), fetchList("products")])
      .then(([execs, cov, tsk, docs, prods]) => {
        setExecutives(execs);
        setCoverage(cov);
        setTasks(tsk);
        setDoctors(docs);
        setProducts(prods);
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

  const regionTasks = useMemo(
    () => tasks.filter((t) => !t.pincode || regionPincodes.includes(t.pincode)),
    [tasks, regionPincodes]
  );

  const regionDoctors = useMemo(
    () => doctors.filter((d) => regionPincodes.includes(d.pincode)),
    [doctors, regionPincodes]
  );
  const regionProducts = useMemo(
    () => products.filter((p) => regionPincodes.includes(p.pincode)),
    [products, regionPincodes]
  );

  const openTasksCount = regionTasks.filter((t) => t.status !== "done").length;
  const doneTasksCount = regionTasks.filter((t) => t.status === "done").length;
  const teamOverallPct = regionTasks.length > 0 ? Math.round((doneTasksCount / regionTasks.length) * 100) : null;

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
          <div className="sales-crm-logo"><img src={logo} /></div>
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

      <div className="sales-crm-stats">
        <div className="sales-stat-card">
          <p className="sales-stat-label">Executives in region</p>
          <p className="sales-stat-value">{execsInRegion.length}</p>
        </div>
        <div className="sales-stat-card">
          <p className="sales-stat-label">Open tasks</p>
          <p className="sales-stat-value">{openTasksCount}</p>
        </div>
        <div className="sales-stat-card">
          <p className="sales-stat-label">Completed tasks</p>
          <p className="sales-stat-value">{doneTasksCount}</p>
        </div>
        <div className="sales-stat-card">
          <p className="sales-stat-label">Team completion</p>
          <p className="sales-stat-value">{teamOverallPct === null ? "—" : `${teamOverallPct}%`}</p>
        </div>
      </div>

      <div className="sales-crm-tabs">
        {["team", "coverage"].map((t) => (
          <button key={t} className={"sales-crm-tab" + (subTab === t ? " active" : "")} onClick={() => setSubTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button className="sales-crm-tab">Monthly Plan</button>
        <button className="sales-crm-tab">Standard Plan</button>
        <button className="sales-crm-tab">Daily Plan</button>
      </div>

      {subTab === "team" && (
        <>
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
              A task is matched to whichever executive covers the pin code you pick — there's no direct assignee field on tasks in
              the current schema, so pin code is what determines who sees it.
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
        </>
      )}

      {subTab === "coverage" && (
        <>
          <div className="sales-coverage-grid">
            <div className="sales-crm-card">
              <h3>Pin codes in region — {selectedRegion || "—"}</h3>
              <div className="sales-pincode-pills">
                {regionPincodes.length === 0 ? (
                  <p className="zzc-muted zzc-small">No pin codes covered yet.</p>
                ) : (
                  regionPincodes.map((pc) => (
                    <span className="sales-status-pill" key={pc}>
                      {pc}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="sales-crm-card">
              <h3>Doctors in my area</h3>
              <div className="sales-task-list">
                {regionDoctors.length === 0 ? (
                  <p className="zzc-muted zzc-small">No doctors in this region's covered pin codes yet.</p>
                ) : (
                  regionDoctors.map((d) => (
                    <div className="sales-task-row" key={d.id}>
                      <div>
                        <p className="sales-task-title">{d.name}</p>
                        <p className="zzc-muted zzc-small">
                          {d.specializations || "—"} · pin {d.pincode}
                        </p>
                      </div>
                      <span className="zzc-muted zzc-small">★ {d.rating ?? "—"}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="sales-crm-card">
            <h3>Medicines, pet food &amp; accessories in my area</h3>
            <table className="zzc-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Pin</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Rx</th>
                </tr>
              </thead>
              <tbody>
                {regionProducts.length === 0 ? (
                  <tr className="zzc-empty-row">
                    <td colSpan={5}>No products in this region's covered pin codes yet</td>
                  </tr>
                ) : (
                  regionProducts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.pincode}</td>
                      <td>{formatINR(p.price)}</td>
                      <td>{p.stock_quantity}</td>
                      <td>{p.is_prescription_required === true || p.is_prescription_required === "Yes" ? "Yes" : "No"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
