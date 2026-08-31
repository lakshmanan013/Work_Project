import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchList, createRecord, updateRecord } from "../api.js";
import logo from "../assets/zenve-zippy-logo.png";
import "./SalesCRM.css";

function formatINR(n) {
  return "₹" + Math.round(n || 0).toLocaleString("en-IN");
}

const STATUSES = [
  { value: "open", label: "open" },
  { value: "in progress", label: "in progress" },
  { value: "done", label: "done" },
];

export default function SalesCRM({ onExit }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [executives, setExecutives] = useState([]);
  const [coverage, setCoverage] = useState([]); // ALL pincode_coverage rows
  const [tasks, setTasks] = useState([]); // ALL executive_tasks rows
  const [alerts, setAlerts] = useState([]); // ALL executive_alerts rows
  const [doctors, setDoctors] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);

  const [selectedExecId, setSelectedExecId] = useState(null);
  const [subTab, setSubTab] = useState("tasks");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskPincode, setTaskPincode] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDue, setTaskDue] = useState("");
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchList("sales_executives"),
      fetchList("pincode_coverage"),
      fetchList("executive_tasks"),
      fetchList("executive_alerts"),
      fetchList("doctors"),
      fetchList("products"),
      fetchList("inventory"),
    ])
      .then(([execs, cov, tsk, alr, docs, prods, inv]) => {
        setExecutives(execs);
        setCoverage(cov);
        setTasks(tsk);
        setAlerts(alr);
        setDoctors(docs);
        setProducts(prods);
        setInventory(inv);
        setSelectedExecId((prev) => prev ?? execs[0]?.id ?? null);
      })
      .catch((err) => setError(err.message || "Failed to load Sales CRM data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const selectedExec = executives.find((e) => e.id === selectedExecId) || null;

  const myCoverage = useMemo(
    () => coverage.filter((c) => c.executive_id === selectedExecId),
    [coverage, selectedExecId]
  );
  const coveredPincodes = useMemo(() => new Set(myCoverage.map((c) => c.pincode)), [myCoverage]);

  // Tasks/alerts have no direct executive_id field in the schema — a task is
  // "mine" if it's tagged with one of my covered pin codes, or has no pin
  // code at all (a general task visible to every executive).
  const myTasks = useMemo(
    () => tasks.filter((t) => !t.pincode || coveredPincodes.has(t.pincode)),
    [tasks, coveredPincodes]
  );
  const myAlerts = useMemo(
    () => alerts.filter((a) => !a.pincode || coveredPincodes.has(a.pincode)),
    [alerts, coveredPincodes]
  );

  const areaDoctors = useMemo(() => doctors.filter((d) => coveredPincodes.has(d.pincode)),[doctors, coveredPincodes]);
  const areaProducts = useMemo(() => products.filter((p) => coveredPincodes.has(p.pincode)), [products, coveredPincodes]);
  const openTasksCount = myTasks.filter((t) => t.status !== "done").length;
  const unreadAlertsCount = myAlerts.filter((a) => !a.is_read).length;
  const doctorsInArea = areaDoctors.length;
  const skusInArea = areaProducts.length;
  const lowStockRows = inventory.filter(
    (i) => coveredPincodes.has(i.pincode) && (Number(i.available_quantity) || 0) <= (Number(i.reorder_level) || 0)
  ).length;

  function addTask() {
    if (!taskTitle.trim()) return;
    setBusy(true);
    createRecord("executive_tasks", {
      title: taskTitle.trim(),
      task_type: "field_task",
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

  function setTaskStatus(task, status) {
  console.log("Updating task:", task);
  console.log("New status:", status);

  // Spread all existing task fields and override just the status
  const updatedPayload = {
    ...task,
    status: status
  };

  updateRecord("executive_tasks", task.id, updatedPayload)
    .then((updated) => {
      console.log("Update successful:", updated);

      setTasks((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
    })
    .catch((err) => {
      console.error("STATUS UPDATE ERROR:", err);
      console.error("Error message:", err?.message);

      setError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        JSON.stringify(err)
      );
    });
}

  // function setTaskStatus(task, status) {
  //   updateRecord("executive_tasks", task.id, { status })
  //     .then((updated) => setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t))))
  //     .catch((err) => setError(err.message));
  // }

  function markAlertRead(alert) {
    updateRecord("executive_alerts", alert.id, { is_read: true })
      .then((updated) => setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a))))
      .catch((err) => setError(err.message));
  }

  if (loading) {
    return (
      <div className="sales-crm-page">
        <p className="zzc-muted">Loading Sales CRM…</p>
      </div>
    );
  }

  return (
    <div className="sales-crm-page">
      <header className="sales-crm-header">
        <div className="sales-crm-brand">
          <div className="sales-crm-logo"><img src={logo} /></div>
          <div>
            <h1>{selectedExec ? `${selectedExec.name} · Sales Executive CRM` : "Sales Executive CRM"}</h1>
            <p className="zzc-muted zzc-small">
              {selectedExec
                ? `${selectedExec.region || selectedExec.city || "—"} · ${myCoverage.length} pin codes · target ${formatINR(
                    selectedExec.monthly_target
                  )}/mo · no sign-in required`
                : "No sales executives found"}
            </p>
          </div>
        </div>
        <div className="sales-crm-actions">
          <select
            className="sales-crm-select"
            value={selectedExecId ?? ""}
            onChange={(e) => setSelectedExecId(Number(e.target.value))}
          >
            {executives.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.region || e.city || "—"}
              </option>
            ))}
          </select>
          <button className="zzc-btn zzc-btn-outline" onClick={loadAll} disabled={busy}>
            Scan my area
          </button>
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
          <p className="sales-stat-label">Open tasks</p>
          <p className="sales-stat-value">{openTasksCount}</p>
        </div>
        <div className="sales-stat-card">
          <p className="sales-stat-label">Unread alerts</p>
          <p className="sales-stat-value">{unreadAlertsCount}</p>
        </div>
        <div className="sales-stat-card">
          <p className="sales-stat-label">Doctors in area</p>
          <p className="sales-stat-value">{doctorsInArea}</p>
        </div>
        <div className="sales-stat-card">
          <p className="sales-stat-label">SKUs in area</p>
          <p className="sales-stat-value">{skusInArea}</p>
        </div>
        <div className="sales-stat-card">
          <p className="sales-stat-label">Low stock rows</p>
          <p className="sales-stat-value">{lowStockRows}</p>
        </div>
      </div>

      <div className="sales-crm-tabs">
        {["tasks", "alerts", "coverage"].map((t) => (
          <button key={t} className={"sales-crm-tab" + (subTab === t ? " active" : "")} onClick={() => setSubTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {subTab === "tasks" && (
        <>
          {/* <div className="sales-crm-card">
            <h3>Add a field task</h3>
            <div className="sales-task-form">
              <input
                className="sales-task-title-input"
                placeholder="Task title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
              <select value={taskPincode} onChange={(e) => setTaskPincode(e.target.value)}>
                <option value="">Pin code</option>
                {myCoverage.map((c) => (
                  <option key={c.pincode} value={c.pincode}>
                    {c.pincode}
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
          </div> */}

          <div className="sales-crm-card">
            <h3>My tasks</h3>
            <div className="sales-task-list">
              {myTasks.length === 0 ? (
                <p className="zzc-muted zzc-small">No tasks yet.</p>
              ) : (
                myTasks.map((t) => (
                  <div className="sales-task-row" key={t.id}>
                    <div>
                      <p className="sales-task-title">{t.title}</p>
                      <p className="zzc-muted zzc-small">
                        {t.task_type} · {t.entity_type} · pin {t.pincode || "—"} · due {t.due_date || "—"} ·{" "}
                        {String(t.priority || "").toUpperCase()}
                      </p>
                    </div>
                    <div className="sales-task-status-pills">
                      {STATUSES.map((s) => (
                        <button
                          key={s.value}
                          className={"sales-status-pill" + (t.status === s.value ? " active" : "")}
                          onClick={() => setTaskStatus(t, s.value)}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {subTab === "alerts" && (
        <div className="sales-crm-card">
          <h3>My alerts</h3>
          <div className="sales-task-list">
            {myAlerts.length === 0 ? (
              <p className="zzc-muted zzc-small">Nothing yet — hit “Scan my area”.</p>
            ) : (
              myAlerts.map((a) => (
                <div className="sales-task-row" key={a.id}>
                  <div>
                    <p className="sales-task-title">{a.title}</p>
                    <p className="zzc-muted zzc-small">
                      {a.severity} · {a.entity_type} · pin {a.pincode || "—"}
                    </p>
                  </div>
                  {a.is_read ? (
                    <span className="sales-status-pill active">read</span>
                  ) : (
                    <button className="sales-status-pill" onClick={() => markAlertRead(a)}>
                      mark read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {subTab === "coverage" && (
        <>
          <div className="sales-coverage-grid">
            <div className="sales-crm-card">
              <h3>My pin codes</h3>
              <div className="sales-pincode-pills">
                {myCoverage.length === 0 ? (
                  <p className="zzc-muted zzc-small">No pin codes assigned yet.</p>
                ) : (
                  myCoverage.map((c) => (
                    <span className="sales-status-pill" key={c.id}>
                      {c.pincode}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="sales-crm-card">
              <h3>Doctors in my area</h3>
              <div className="sales-task-list">
                {areaDoctors.length === 0 ? (
                  <p className="zzc-muted zzc-small">No doctors in your covered pin codes yet.</p>
                ) : (
                  areaDoctors.map((d) => (
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
                {areaProducts.length === 0 ? (
                  <tr className="zzc-empty-row">
                    <td colSpan={5}>No products in your covered pin codes yet</td>
                  </tr>
                ) : (
                  areaProducts.map((p) => (
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