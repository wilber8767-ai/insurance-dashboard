import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function localDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: localDate(mon), end: localDate(sun) };
}

function getMonthRange(date = new Date()) {
  const y = date.getFullYear(), m = date.getMonth();
  return { start: localDate(new Date(y, m, 1)), end: localDate(new Date(y, m + 1, 0)) };
}

function fmtMoney(n) { return Number(n || 0).toLocaleString("zh-TW"); }
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

const VISIT_TYPES = ["親訪", "跨售訪", "議題訪"];

const VISIT_ICON = {
  "親訪":   "👁",
  "跨售訪": "🤝",
  "議題訪": "💡",
};

const VISIT_COLORS = {
  "親訪":   { bg: "bg-sky-100",    text: "text-sky-700",    dot: "bg-sky-400",    card: "bg-sky-50 border-sky-200"       },
  "跨售訪": { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-400", card: "bg-violet-50 border-violet-200" },
  "議題訪": { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-400",  card: "bg-amber-50 border-amber-200"   },
};

// 每個人專屬主色（深色背景 + 白字）
const PERSON_THEMES = [
  { bg: "bg-orange-500",  text: "text-white", dot: "bg-orange-500",  name: "text-orange-600", card: "border-l-orange-500"  },
  { bg: "bg-sky-600",     text: "text-white", dot: "bg-sky-600",     name: "text-sky-600",    card: "border-l-sky-600"     },
  { bg: "bg-emerald-600", text: "text-white", dot: "bg-emerald-600", name: "text-emerald-600",card: "border-l-emerald-600" },
  { bg: "bg-violet-600",  text: "text-white", dot: "bg-violet-600",  name: "text-violet-600", card: "border-l-violet-600"  },
];

const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

function Spinner() {
  return <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>;
}

function Toast({ message, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 ${type === "success" ? "bg-emerald-500" : "bg-red-500"} text-white px-5 py-3 rounded-2xl shadow-2xl`}>
      {type === "success"
        ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
        : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
      }
      <span className="font-medium text-sm">{message}</span>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
          <h2 className="font-bold text-stone-800 text-base">{title}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-stone-200">
        <p className="text-stone-700 font-medium text-center mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-600 font-semibold text-sm hover:bg-stone-200 transition">取消</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-400 transition">確認刪除</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  const accents = {
    sky:     "bg-sky-50 border-sky-200 text-sky-600",
    violet:  "bg-violet-50 border-violet-200 text-violet-600",
    amber:   "bg-amber-50 border-amber-200 text-amber-600",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-600",
    rose:    "bg-rose-50 border-rose-200 text-rose-600",
    orange:  "bg-orange-50 border-orange-200 text-orange-600",
  };
  const cls = accents[accent] || accents.sky;
  return (
    <div className={`${cls} border rounded-2xl p-5 shadow-sm`}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-2 opacity-60">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-50">{sub}</p>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-stone-500 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function inputCls() {
  return "w-full bg-white border border-stone-200 text-stone-800 placeholder-stone-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition shadow-sm";
}

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-base">{icon}</span>
      <h2 className="font-bold text-stone-600 text-sm uppercase tracking-widest">{title}</h2>
    </div>
  );
}

// ── 行事曆 ──────────────────────────────────────────────────
function TeamCalendar({ currentUser, allProfiles, onToast }) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [activities, setActivities] = useState([]);
  const [modalDate, setModalDate] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [aForm, setAForm] = useState({ client_name: "", visit_type: "親訪", topic: "" });
  const [aSaving, setASaving] = useState(false);

  const loadActivities = useCallback(async () => {
    const start = localDate(new Date(calYear, calMonth, 1));
    const end = localDate(new Date(calYear, calMonth + 1, 0));
    const { data } = await supabase.from("activities").select("*").gte("date", start).lte("date", end).order("date");
    setActivities(data || []);
  }, [calYear, calMonth]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  const actByDate = useMemo(() => {
    const map = {};
    activities.forEach(a => { if (!map[a.date]) map[a.date] = []; map[a.date].push(a); });
    return map;
  }, [activities]);

  function getPersonTheme(uid) {
    const idx = allProfiles.findIndex(p => p.id === uid);
    return PERSON_THEMES[idx % PERSON_THEMES.length] || PERSON_THEMES[0];
  }

  function getAgentName(uid) {
    return allProfiles.find(p => p.id === uid)?.name || "—";
  }

  async function handleAdd() {
    if (!aForm.client_name.trim()) { onToast("請填寫客戶姓名", "error"); return; }
    if (!aForm.topic.trim()) { onToast("請填寫議題", "error"); return; }
    setASaving(true);
    const { error } = await supabase.from("activities").insert({
      user_id: currentUser.id, date: modalDate,
      client_name: aForm.client_name, visit_type: aForm.visit_type, notes: aForm.topic,
    });
    setASaving(false);
    if (error) { onToast("新增失敗", "error"); return; }
    onToast("✓ 已新增");
    setAForm({ client_name: "", visit_type: "親訪", topic: "" });
    loadActivities();
  }

  async function handleSaveEdit() {
    if (!editingEntry.client_name.trim() || !editingEntry.topic.trim()) { onToast("請填寫完整", "error"); return; }
    setASaving(true);
    const { error } = await supabase.from("activities").update({
      client_name: editingEntry.client_name, visit_type: editingEntry.visit_type, notes: editingEntry.topic,
    }).eq("id", editingEntry.id);
    setASaving(false);
    if (error) { onToast("儲存失敗", "error"); return; }
    onToast("✓ 已更新");
    setEditingEntry(null);
    loadActivities();
  }

  async function handleDelete() {
    await supabase.from("activities").delete().eq("id", confirmDelete.id);
    onToast("✓ 已刪除");
    setConfirmDelete(null);
    loadActivities();
  }

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const offset = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;

  return (
    <>
      <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
        {/* 月份導航 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
          <button onClick={() => { if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span className="font-bold text-stone-700 text-lg">{calYear} 年 {MONTH_NAMES[calMonth]}</span>
          <button onClick={() => { if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>

        {/* 日曆格 */}
        <div className="p-3">
          <div className="grid grid-cols-7 mb-2">
            {["一","二","三","四","五","六","日"].map(w => (
              <div key={w} className="text-center text-xs font-semibold text-stone-400 py-1">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({length: offset}).map((_,i) => <div key={`e${i}`} />)}
            {Array.from({length: daysInMonth}).map((_, i) => {
              const day = i + 1;
              const ds = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const entries = actByDate[ds] || [];
              const isToday = localDate(today) === ds;
              return (
                <button key={day} onClick={() => setModalDate(ds)}
                  className={`min-h-[76px] rounded-2xl p-1.5 text-left border transition-all hover:border-amber-300 hover:bg-amber-50/50 ${isToday ? "border-amber-400 bg-amber-50" : "border-stone-100 bg-white"}`}>
                  <span className={`block text-xs font-bold mb-1 ${isToday ? "text-amber-600" : "text-stone-400"}`}>{day}</span>
                  <div className="space-y-0.5">
                    {entries.slice(0,2).map(e => {
                      const theme = getPersonTheme(e.user_id);
                      const icon = VISIT_ICON[e.visit_type] || "📋";
                      return (
                        <div key={e.id} className={`text-[10px] ${theme.bg} ${theme.text} rounded-lg px-1.5 py-0.5 truncate font-semibold flex items-center gap-0.5`}>
                          <span>{icon}</span>
                          <span className="truncate">{e.client_name}</span>
                        </div>
                      );
                    })}
                    {entries.length > 2 && (
                      <div className="text-[10px] text-stone-400 font-medium pl-1">+{entries.length-2} 更多</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 圖例 */}
        <div className="px-5 pb-4 border-t border-stone-100 pt-3 space-y-2.5">
          {/* 人員圖例 */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest w-8">人員</span>
            {allProfiles.map((p, idx) => {
              const theme = PERSON_THEMES[idx % PERSON_THEMES.length];
              return (
                <div key={p.id} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded ${theme.bg}`}/>
                  <span className={`text-xs font-semibold ${theme.name}`}>{p.name}</span>
                </div>
              );
            })}
          </div>
          {/* 訪種圖例 */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest w-8">訪種</span>
            {VISIT_TYPES.map(t => (
              <div key={t} className="flex items-center gap-1">
                <span className="text-sm">{VISIT_ICON[t]}</span>
                <span className="text-xs text-stone-500">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 日期 Modal */}
      {modalDate && (
        <Modal title={`${modalDate} 的行程`} onClose={() => { setModalDate(null); setEditingEntry(null); setAForm({ client_name: "", visit_type: "親訪", topic: "" }); }}>
          <div className="space-y-4">
            {(actByDate[modalDate]||[]).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-stone-400 font-semibold uppercase tracking-widest">當日行程</p>
                {(actByDate[modalDate]||[]).map(e => {
                  const theme = getPersonTheme(e.user_id);
                  const vc = VISIT_COLORS[e.visit_type];
                  const isMe = e.user_id === currentUser.id;
                  const isEditing = editingEntry?.id === e.id;
                  return (
                    <div key={e.id} className={`rounded-2xl overflow-hidden border ${vc.card}`}>
                      {/* 人員色條 header */}
                      <div className={`${theme.bg} px-4 py-2 flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">{getAgentName(e.user_id)}{isMe ? "（我）" : ""}</span>
                          <span className="text-white/80 text-xs">{VISIT_ICON[e.visit_type]} {e.visit_type}</span>
                        </div>
                        {isMe && !isEditing && (
                          <div className="flex gap-1">
                            <button onClick={() => setEditingEntry({...e, topic: e.notes||""})}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/40 text-white transition">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button onClick={() => setConfirmDelete(e)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-red-400/60 text-white transition">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          </div>
                        )}
                      </div>
                      {/* 內容 */}
                      <div className="px-4 py-3">
                        {isEditing ? (
                          <div className="space-y-3">
                            <Field label="客戶姓名"><input type="text" value={editingEntry.client_name} onChange={ev => setEditingEntry(p=>({...p,client_name:ev.target.value}))} className={inputCls()} /></Field>
                            <Field label="拜訪類型"><select value={editingEntry.visit_type} onChange={ev => setEditingEntry(p=>({...p,visit_type:ev.target.value}))} className={inputCls()}>{VISIT_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
                            <Field label="議題"><input type="text" value={editingEntry.topic} onChange={ev => setEditingEntry(p=>({...p,topic:ev.target.value}))} className={inputCls()} /></Field>
                            <div className="flex gap-2">
                              <button onClick={() => setEditingEntry(null)} className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-600 font-semibold text-sm">取消</button>
                              <button onClick={handleSaveEdit} disabled={aSaving} className="flex-1 py-2.5 rounded-xl bg-amber-400 text-white font-semibold text-sm disabled:opacity-50">
                                {aSaving ? <span className="flex items-center justify-center gap-1"><Spinner/>儲存中</span> : "儲存"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-base font-bold text-stone-800">{e.client_name}</p>
                            {e.notes && <p className="text-sm text-stone-500 mt-0.5">議題：{e.notes}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 新增 */}
            <div className="border-t border-stone-100 pt-4 space-y-3">
              <p className="text-xs text-stone-400 font-semibold uppercase tracking-widest">新增我的拜訪</p>
              <Field label="客戶姓名 *"><input type="text" value={aForm.client_name} onChange={e=>setAForm(p=>({...p,client_name:e.target.value}))} placeholder="王小明" className={inputCls()} /></Field>
              <Field label="拜訪類型"><select value={aForm.visit_type} onChange={e=>setAForm(p=>({...p,visit_type:e.target.value}))} className={inputCls()}>{VISIT_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
              <Field label="議題 *"><input type="text" value={aForm.topic} onChange={e=>setAForm(p=>({...p,topic:e.target.value}))} placeholder="壽險規劃、醫療保障..." className={inputCls()} /></Field>
              <button onClick={handleAdd} disabled={aSaving} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold transition disabled:opacity-50">
                {aSaving ? <span className="flex items-center justify-center gap-2"><Spinner/>儲存中...</span> : "確認新增"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && <ConfirmDialog message={`確定刪除「${confirmDelete.client_name}」的拜訪？`} onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />}
    </>
  );
}

// ── 業績模組 ─────────────────────────────────────────────────
function SalesModule({ user, allProfiles, isManager, onToast }) {
  const today = new Date();
  const [sales, setSales] = useState([]);
  const [activeTab, setActiveTab] = useState("add");
  const [form, setForm] = useState({ date: localDate(today), client_name: "", product_name: "", accepted_amount: "" });
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmAmount, setConfirmAmount] = useState("");
  const [confirming, setConfirming] = useState(false);

  const loadSales = useCallback(async () => {
    let q = supabase.from("sales").select("*").order("date", { ascending: false });
    if (!isManager) q = q.eq("user_id", user.id);
    const { data } = await q;
    setSales(data || []);
  }, [user.id, isManager]);

  useEffect(() => { loadSales(); }, [loadSales]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.date || !form.client_name.trim()) { onToast("請填寫日期與客戶名稱", "error"); return; }
    if (!form.accepted_amount) { onToast("請填寫受理業績金額", "error"); return; }
    setSaving(true);
    const { error } = await supabase.from("sales").insert({
      user_id: user.id, date: form.date, client_name: form.client_name,
      product_name: form.product_name,
      accepted_amount: Number(form.accepted_amount),
      confirmed_amount: 0, status: "pending",
    });
    setSaving(false);
    if (error) { onToast("送出失敗：" + error.message, "error"); return; }
    onToast("✓ 受理業績已新增");
    setForm({ date: localDate(today), client_name: "", product_name: "", accepted_amount: "" });
    loadSales();
    setActiveTab("pending");
  }

  async function handleConfirm() {
    if (!confirmAmount || isNaN(Number(confirmAmount))) { onToast("請填寫有效金額", "error"); return; }
    setConfirming(true);
    const { error } = await supabase.from("sales").update({
      confirmed_amount: Number(confirmAmount), status: "confirmed",
    }).eq("id", confirmModal.id);
    setConfirming(false);
    if (error) { onToast("核實失敗：" + error.message, "error"); return; }
    onToast("✓ 已核實");
    setConfirmModal(null);
    setConfirmAmount("");
    loadSales();
  }

  const pending = sales.filter(s => s.status === "pending");

  function getPersonTheme(uid) {
    const idx = allProfiles.findIndex(p => p.id === uid);
    return PERSON_THEMES[idx % PERSON_THEMES.length] || PERSON_THEMES[0];
  }

  function agentName(uid) { return allProfiles.find(p => p.id === uid)?.name || "—"; }

  const statusBadge = (s) => s.status === "confirmed"
    ? <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700">已核實</span>
    : <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700">待核實</span>;

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 bg-stone-100 rounded-2xl p-1">
        {[
          {id:"add", label:"➕ 新增受理"},
          {id:"pending", label:`⏳ 待核實${pending.length > 0 ? ` (${pending.length})` : ""}`},
          {id:"all", label:"📋 全部紀錄"},
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab===t.id ? "bg-white text-stone-800 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "add" && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-sm">📝</span>
            新增受理業績
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="日期 *"><input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} className={inputCls()} required /></Field>
              <Field label="客戶姓名 *"><input type="text" value={form.client_name} onChange={e=>setForm(p=>({...p,client_name:e.target.value}))} placeholder="王小明" className={inputCls()} /></Field>
            </div>
            <Field label="險種"><input type="text" value={form.product_name} onChange={e=>setForm(p=>({...p,product_name:e.target.value}))} placeholder="終身壽險、醫療險..." className={inputCls()} /></Field>
            <Field label="受理業績 (元) *"><input type="number" value={form.accepted_amount} onChange={e=>setForm(p=>({...p,accepted_amount:e.target.value}))} placeholder="0" min="0" className={inputCls()} /></Field>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              送出後自動設為「待核實」，至待核實清單可轉換。
            </div>
            <button type="submit" disabled={saving}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-base shadow-md disabled:opacity-50">
              {saving ? <span className="flex items-center justify-center gap-2"><Spinner/>送出中...</span> : "送出受理業績"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "pending" && (
        <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
            <h3 className="font-bold text-stone-700 flex items-center gap-2"><span>⏳</span> 待核實清單</h3>
            <span className="text-sm text-amber-600 font-semibold">{pending.length} 筆</span>
          </div>
          {pending.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-sm">目前沒有待核實的案件 🎉</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {pending.map(s => {
                const theme = getPersonTheme(s.user_id);
                return (
                  <div key={s.id} className="p-4 hover:bg-stone-50 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className={`${theme.bg} ${theme.text} text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0`}>
                          {agentName(s.user_id)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-stone-800">{s.client_name}</p>
                          {s.product_name && <p className="text-xs text-stone-400">{s.product_name}</p>}
                          <p className="text-xs text-stone-400 mt-0.5">{s.date}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-bold text-amber-600">${fmtMoney(s.accepted_amount)}</p>
                        <button onClick={() => { setConfirmModal(s); setConfirmAmount(String(s.accepted_amount)); }}
                          className="mt-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm transition shadow-sm">
                          核實 ✓
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "all" && (
        <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
            <h3 className="font-bold text-stone-700 flex items-center gap-2"><span>📋</span> 全部業績紀錄</h3>
            <span className="text-sm text-stone-400">{sales.length} 筆</span>
          </div>
          {sales.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-sm">尚無業績紀錄</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {sales.map(s => {
                const theme = getPersonTheme(s.user_id);
                return (
                  <div key={s.id} className="p-4 hover:bg-stone-50 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className={`${theme.bg} ${theme.text} text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0`}>
                          {agentName(s.user_id)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-stone-800">{s.client_name}</p>
                          {s.product_name && <p className="text-xs text-stone-400">{s.product_name}</p>}
                          <p className="text-xs text-stone-400 mt-0.5">{s.date}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        <p className="text-sm font-bold text-amber-600">受 ${fmtMoney(s.accepted_amount)}</p>
                        {s.status === "confirmed" && <p className="text-sm font-bold text-emerald-600">核 ${fmtMoney(s.confirmed_amount)}</p>}
                        {statusBadge(s)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {confirmModal && (
        <Modal title="輸入核實業績" onClose={() => { setConfirmModal(null); setConfirmAmount(""); }}>
          <div className="space-y-4">
            <div className="bg-stone-50 rounded-2xl p-4 space-y-1">
              <p className="text-sm text-stone-500">客戶：<span className="font-semibold text-stone-700">{confirmModal.client_name}</span></p>
              <p className="text-sm text-stone-500">受理金額：<span className="font-bold text-amber-600">${fmtMoney(confirmModal.accepted_amount)}</span></p>
            </div>
            <Field label="核實業績金額 (元) *">
              <input type="number" value={confirmAmount} onChange={e => setConfirmAmount(e.target.value)}
                placeholder="輸入實際核實金額" min="0" className={inputCls()} autoFocus />
            </Field>
            <div className="flex gap-3">
              <button onClick={() => { setConfirmModal(null); setConfirmAmount(""); }}
                className="flex-1 py-3.5 rounded-xl bg-stone-100 text-stone-600 font-semibold hover:bg-stone-200 transition">取消</button>
              <button onClick={handleConfirm} disabled={confirming}
                className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition shadow-md disabled:opacity-50">
                {confirming ? <span className="flex items-center justify-center gap-2"><Spinner/>處理中...</span> : "確認核實 ✓"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── 主管看板 ─────────────────────────────────────────────────
function Dashboard({ allProfiles, onToast }) {
  const [period, setPeriod] = useState("week");
  const [agentFilter, setAgentFilter] = useState("all");
  const [activities, setActivities] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => period === "week" ? getWeekRange() : getMonthRange(), [period]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let aq = supabase.from("activities").select("*").gte("date", range.start).lte("date", range.end);
      let sq = supabase.from("sales").select("*").gte("date", range.start).lte("date", range.end);
      if (agentFilter !== "all") { aq = aq.eq("user_id", agentFilter); sq = sq.eq("user_id", agentFilter); }
      const [{ data: ad }, { data: sd }] = await Promise.all([aq, sq]);
      setActivities(ad || []); setSales(sd || []);
      setLoading(false);
    }
    load();
  }, [range, agentFilter]);

  const actStats = useMemo(() => {
    const counts = { "親訪": 0, "跨售訪": 0, "議題訪": 0 };
    activities.forEach(a => { if(counts[a.visit_type]!==undefined) counts[a.visit_type]++; });
    return counts;
  }, [activities]);

  const salesStats = useMemo(() => {
    const accepted = sales.reduce((s,r) => s + Number(r.accepted_amount||0), 0);
    const confirmed = sales.filter(r => r.status === "confirmed").reduce((s,r) => s + Number(r.confirmed_amount||0), 0);
    return { accepted, confirmed, gap: accepted - confirmed };
  }, [sales]);

  const agentBreakdown = useMemo(() => {
    const map = {};
    allProfiles.forEach(p => { map[p.id] = { name: p.name, acts: {親訪:0,跨售訪:0,議題訪:0}, accepted:0, confirmed:0 }; });
    activities.forEach(r => { if(map[r.user_id]) map[r.user_id].acts[r.visit_type] = (map[r.user_id].acts[r.visit_type]||0)+1; });
    sales.forEach(r => {
      if(map[r.user_id]) {
        map[r.user_id].accepted += Number(r.accepted_amount||0);
        if(r.status === "confirmed") map[r.user_id].confirmed += Number(r.confirmed_amount||0);
      }
    });
    return Object.entries(map);
  }, [activities, sales, allProfiles]);

  const periodLabel = period === "week"
    ? `${range.start} ～ ${range.end}`
    : `${range.start.slice(0,4)}年${new Date(range.start+"T00:00:00").getMonth()+1}月`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 bg-stone-100 rounded-2xl p-1 flex-1">
          {[{id:"week",label:"本週"},{id:"month",label:"本月"}].map(p => (
            <button key={p.id} onClick={()=>setPeriod(p.id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${period===p.id ? "bg-white text-stone-800 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}>
              {p.label}
            </button>
          ))}
        </div>
        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
          className="bg-white border border-stone-200 text-stone-600 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm min-w-[140px]">
          <option value="all">全團隊綜合</option>
          {allProfiles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <p className="text-sm text-stone-400">統計區間：{periodLabel}</p>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-stone-400"><Spinner/><span className="ml-2 text-sm">載入中...</span></div>
      ) : (
        <>
          <section>
            <SectionTitle icon="📊" title="活動量看板" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="總活動量" value={Object.values(actStats).reduce((a,b)=>a+b,0)} sub="次" accent="amber" />
              <StatCard label="親訪 👁" value={actStats["親訪"]} sub="次" accent="sky" />
              <StatCard label="跨售訪 🤝" value={actStats["跨售訪"]} sub="次" accent="violet" />
              <StatCard label="議題訪 💡" value={actStats["議題訪"]} sub="次" accent="amber" />
            </div>
          </section>

          <section>
            <SectionTitle icon="💹" title="業績看板" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard label="受理業績總額" value={`$${fmtMoney(salesStats.accepted)}`} sub="含待核實與已核實" accent="orange" />
              <StatCard label="核實業績總額" value={`$${fmtMoney(salesStats.confirmed)}`} sub="僅計 confirmed" accent="emerald" />
              <StatCard label="尚未核實金額" value={`$${fmtMoney(salesStats.gap)}`} sub="受理 - 核實" accent={salesStats.gap > 0 ? "rose" : "emerald"} />
            </div>
          </section>

          {agentFilter === "all" && (
            <section>
              <SectionTitle icon="👥" title="個人明細" />
              <div className="space-y-3">
                {agentBreakdown.map(([uid, data], idx) => {
                  const theme = PERSON_THEMES[idx % PERSON_THEMES.length];
                  return (
                    <div key={uid} className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
                      <div className={`${theme.bg} px-5 py-3 flex items-center gap-3`}>
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-sm">{data.name[0]}</div>
                        <span className="font-bold text-white text-base">{data.name}</span>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {VISIT_TYPES.map(t => {
                            const vc = VISIT_COLORS[t];
                            return (
                              <div key={t} className={`${vc.bg} rounded-xl p-3 text-center`}>
                                <p className="text-lg">{VISIT_ICON[t]}</p>
                                <p className={`text-xl font-bold ${vc.text}`}>{data.acts[t]}</p>
                                <p className={`text-xs ${vc.text} opacity-70`}>{t}</p>
                              </div>
                            );
                          })}
                        </div>
                        <div className="grid grid-cols-2 gap-2 bg-stone-50 rounded-xl p-3">
                          <div><span className="text-stone-400 text-xs">受理</span><p className="text-amber-600 font-bold text-base">${fmtMoney(data.accepted)}</p></div>
                          <div><span className="text-stone-400 text-xs">核實</span><p className="text-emerald-600 font-bold text-base">${fmtMoney(data.confirmed)}</p></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ── 業務員視窗 ──────────────────────────────────────────────
function AgentView({ user, allProfiles, onToast }) {
  const [activeTab, setActiveTab] = useState("calendar");
  return (
    <div className="space-y-5">
      <div className="flex gap-2 bg-stone-100 rounded-2xl p-1">
        {[{id:"calendar",label:"📅 行事曆"},{id:"sales",label:"💰 業績"}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab===t.id ? "bg-white text-stone-800 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {activeTab === "calendar" && <TeamCalendar currentUser={user} allProfiles={allProfiles} onToast={onToast} />}
      {activeTab === "sales" && <SalesModule user={user} allProfiles={allProfiles} isManager={false} onToast={onToast} />}
    </div>
  );
}

// ── 主管視窗 ────────────────────────────────────────────────
function ManagerView({ user, allProfiles, onToast }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 bg-stone-100 rounded-2xl p-1">
        {[{id:"dashboard",label:"📊 看板"},{id:"calendar",label:"📅 行事曆"},{id:"sales",label:"💰 業績"}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab===t.id ? "bg-white text-stone-800 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {activeTab === "dashboard" && <Dashboard allProfiles={allProfiles} onToast={onToast} />}
      {activeTab === "calendar" && <TeamCalendar currentUser={user} allProfiles={allProfiles} onToast={onToast} />}
      {activeTab === "sales" && <SalesModule user={user} allProfiles={allProfiles} isManager={true} onToast={onToast} />}
    </div>
  );
}

// ── 登入頁 ──────────────────────────────────────────────────
function AuthPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) { setError("請填寫帳號與密碼"); return; }
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    onLogin({ ...data.user, profile });
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md mx-4">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 mb-4 shadow-lg shadow-amber-300/50">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight">業績管理系統</h1>
          <p className="text-stone-400 mt-1 text-sm">Insurance Sales Management V2</p>
        </div>
        <div className="bg-white/80 backdrop-blur border border-stone-200 rounded-3xl p-8 shadow-xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="電子郵件"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className={inputCls()} placeholder="your@email.com" /></Field>
            <Field label="密碼"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className={inputCls()} placeholder="••••••••" /></Field>
            {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold py-3.5 rounded-xl transition shadow-lg disabled:opacity-50">
              {loading ? <span className="flex items-center justify-center gap-2"><Spinner/>登入中...</span> : "登入系統"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── App Root ────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  async function loadProfiles() {
    const { data } = await supabase.from("profiles").select("*");
    setAllProfiles(data || []);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        setCurrentUser({ ...session.user, profile });
        await loadProfiles();
      }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") { setCurrentUser(null); setAllProfiles([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogin(u) { setCurrentUser(u); await loadProfiles(); }
  function showToast(msg, type = "success") { setToast({ msg, type, key: Date.now() }); }

  if (loading) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-stone-400"><Spinner/><span>載入中...</span></div>
    </div>
  );

  if (!currentUser) return <AuthPage onLogin={handleLogin} />;

  const isManager = currentUser.profile?.role === "manager";
  const agentName = currentUser.profile?.name || currentUser.email;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50 text-stone-800">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-stone-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <div>
              <p className="text-stone-800 font-bold text-sm leading-tight">業績管理系統 V2</p>
              <p className="text-stone-400 text-xs leading-tight">{isManager ? "🎯 主管視窗" : "📋 業務員視窗"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-stone-700 text-sm font-semibold">{agentName}</p>
              <p className="text-stone-400 text-xs">{isManager ? "Manager" : "Agent"}</p>
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); setCurrentUser(null); }}
              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-500 text-xs font-medium transition border border-stone-200">
              登出
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        {isManager
          ? <ManagerView user={currentUser} allProfiles={allProfiles} onToast={showToast} />
          : <AgentView user={currentUser} allProfiles={allProfiles} onToast={showToast} />
        }
      </main>
      {toast && <Toast key={toast.key} message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
