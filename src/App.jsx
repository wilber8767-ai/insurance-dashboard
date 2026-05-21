import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: fmtDate(mon), end: fmtDate(sun) };
}

function getMonthRange(date = new Date()) {
  const y = date.getFullYear(), m = date.getMonth();
  return { start: fmtDate(new Date(y, m, 1)), end: fmtDate(new Date(y, m + 1, 0)) };
}

function fmtDate(d) { return d.toISOString().split("T")[0]; }
function fmtMoney(n) { return Number(n || 0).toLocaleString("zh-TW"); }
function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }

const VISIT_TYPES = ["親訪", "跨售訪", "議題訪"];
const VISIT_COLORS = {
  "親訪":   { bg: "bg-sky-100",    text: "text-sky-700",    dot: "bg-sky-500"    },
  "跨售訪": { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  "議題訪": { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-500"  },
};
const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

function Spinner() {
  return <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>;
}

function Toast({ message, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const styles = type === "success" ? "bg-emerald-500/90 border-emerald-400/50 text-white" : "bg-red-500/90 border-red-400/50 text-white";
  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 ${styles} border backdrop-blur px-5 py-3 rounded-2xl shadow-2xl`}>
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
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="font-bold text-white text-base">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  const accents = {
    sky:     "from-sky-500/20 to-sky-600/5 border-sky-500/30 text-sky-400",
    violet:  "from-violet-500/20 to-violet-600/5 border-violet-500/30 text-violet-400",
    amber:   "from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400",
    emerald: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400",
    rose:    "from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-400",
  };
  const cls = accents[accent] || accents.sky;
  return (
    <div className={`bg-gradient-to-br ${cls} border rounded-2xl p-5`}>
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-bold ${cls.split(" ").find(c => c.startsWith("text-"))}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function inputCls() {
  return "w-full bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition";
}

// ── 共用行事曆元件（主管和業務員共用）──────────────────────
function TeamCalendar({ currentUser, allProfiles, onToast }) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [activities, setActivities] = useState([]);
  const [modalDate, setModalDate] = useState(null);
  const [aForm, setAForm] = useState({ client_name: "", visit_type: "親訪", topic: "" });
  const [aSaving, setASaving] = useState(false);

  const loadActivities = useCallback(async () => {
    const start = fmtDate(new Date(calYear, calMonth, 1));
    const end = fmtDate(new Date(calYear, calMonth + 1, 0));
    const { data } = await supabase.from("activities").select("*").gte("date", start).lte("date", end).order("date");
    setActivities(data || []);
  }, [calYear, calMonth]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  const actByDate = useMemo(() => {
    const map = {};
    activities.forEach(a => { if (!map[a.date]) map[a.date] = []; map[a.date].push(a); });
    return map;
  }, [activities]);

  async function handleAddActivity() {
    if (!aForm.client_name.trim()) { onToast("請填寫客戶姓名", "error"); return; }
    if (!aForm.topic.trim()) { onToast("請填寫議題", "error"); return; }
    setASaving(true);
    const { error } = await supabase.from("activities").insert({
      user_id: currentUser.id,
      date: modalDate,
      client_name: aForm.client_name,
      visit_type: aForm.visit_type,
      notes: aForm.topic,
    });
    setASaving(false);
    if (error) { onToast("新增失敗：" + error.message, "error"); return; }
    onToast("✓ 活動紀錄已新增");
    setAForm({ client_name: "", visit_type: "親訪", topic: "" });
    setModalDate(null);
    loadActivities();
  }

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const offset = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
  const weeks = ["一","二","三","四","五","六","日"];

  function getAgentName(userId) {
    return allProfiles.find(p => p.id === userId)?.name || "—";
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Month nav */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
        <button onClick={() => { if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-700 hover:text-white transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span className="font-bold text-white text-lg">{calYear} 年 {MONTH_NAMES[calMonth]}</span>
        <button onClick={() => { if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-700 hover:text-white transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>

      {/* Grid */}
      <div className="p-4">
        <div className="grid grid-cols-7 mb-2">
          {weeks.map(w => <div key={w} className="text-center text-xs font-semibold text-slate-500 py-1">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({length: offset}).map((_,i) => <div key={`e${i}`} />)}
          {Array.from({length: daysInMonth}).map((_, i) => {
            const day = i + 1;
            const dateStr = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const entries = actByDate[dateStr] || [];
            const isToday = fmtDate(today) === dateStr;
            return (
              <button key={day} onClick={() => setModalDate(dateStr)}
                className={`min-h-[80px] rounded-xl p-1.5 text-left border transition-all hover:border-sky-500/50 hover:bg-sky-500/5 ${isToday ? "border-sky-500/60 bg-sky-500/10" : "border-slate-700/50 bg-slate-800/30"}`}>
                <span className={`block text-xs font-bold mb-1 ${isToday ? "text-sky-400" : "text-slate-300"}`}>{day}</span>
                <div className="space-y-0.5">
                  {entries.slice(0,3).map(e => {
                    const c = VISIT_COLORS[e.visit_type] || VISIT_COLORS["親訪"];
                    const name = getAgentName(e.user_id);
                    return (
                      <div key={e.id} className={`text-[10px] ${c.bg} ${c.text} rounded px-1 py-0.5 truncate font-medium`}>
                        {name}｜{e.client_name}
                      </div>
                    );
                  })}
                  {entries.length > 3 && <div className="text-[10px] text-slate-500">+{entries.length-3}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 pb-4 flex gap-4 flex-wrap">
        {VISIT_TYPES.map(t => {
          const c = VISIT_COLORS[t];
          return <div key={t} className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${c.dot}`} /><span className="text-xs text-slate-400">{t}</span></div>;
        })}
      </div>

      {/* Modal */}
      {modalDate && (
        <Modal title={`${modalDate} 的行程`} onClose={() => setModalDate(null)}>
          <div className="space-y-4">
            {/* 當日所有人的行程 */}
            {(actByDate[modalDate]||[]).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">當日行程</p>
                {(actByDate[modalDate]||[]).map(e => {
                  const c = VISIT_COLORS[e.visit_type];
                  const name = getAgentName(e.user_id);
                  const isMe = e.user_id === currentUser.id;
                  return (
                    <div key={e.id} className={`${c.bg} rounded-xl px-3 py-2.5`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                        <span className={`text-xs font-bold ${c.text}`}>{name}{isMe ? "（我）" : ""}</span>
                        <span className={`text-xs ${c.text} opacity-70`}>{e.visit_type}</span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium pl-4">{e.client_name}</p>
                      {e.notes && <p className="text-xs text-slate-600 pl-4 mt-0.5">議題：{e.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 新增自己的行程 */}
            <div className="border-t border-slate-700 pt-4 space-y-3">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">新增我的拜訪</p>
              <Field label="客戶姓名 *">
                <input type="text" value={aForm.client_name} onChange={e => setAForm(p=>({...p,client_name:e.target.value}))}
                  placeholder="王小明" className={inputCls()} />
              </Field>
              <Field label="拜訪類型">
                <select value={aForm.visit_type} onChange={e => setAForm(p=>({...p,visit_type:e.target.value}))} className={inputCls()}>
                  {VISIT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="議題 *">
                <input type="text" value={aForm.topic} onChange={e => setAForm(p=>({...p,topic:e.target.value}))}
                  placeholder="例：壽險規劃、醫療保障檢視..." className={inputCls()} />
              </Field>
              <button onClick={handleAddActivity} disabled={aSaving}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-400 hover:to-violet-400 text-white font-semibold text-sm transition-all disabled:opacity-50">
                {aSaving ? <span className="flex items-center justify-center gap-2"><Spinner />儲存中...</span> : "確認新增"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── 業務員視窗 ──────────────────────────────────────────────
function AgentView({ user, allProfiles, onToast }) {
  const today = new Date();
  const [activeTab, setActiveTab] = useState("calendar");
  const [sForm, setSForm] = useState({ date: fmtDate(today), client_name: "", product_name: "", accepted_amount: "", confirmed_amount: "" });
  const [sSaving, setSSaving] = useState(false);

  async function handleAddSale(e) {
    e.preventDefault();
    if (!sForm.date || !sForm.client_name.trim()) { onToast("請填寫日期與客戶名稱", "error"); return; }
    if (sForm.accepted_amount === "" && sForm.confirmed_amount === "") { onToast("請填寫至少一筆業績金額", "error"); return; }
    setSSaving(true);
    const { error } = await supabase.from("sales").insert({
      user_id: user.id, date: sForm.date, client_name: sForm.client_name,
      product_name: sForm.product_name,
      accepted_amount: Number(sForm.accepted_amount) || 0,
      confirmed_amount: Number(sForm.confirmed_amount) || 0,
    });
    setSSaving(false);
    if (error) { onToast("送出失敗：" + error.message, "error"); return; }
    onToast("✓ 業績紀錄已送出");
    setSForm({ date: fmtDate(today), client_name: "", product_name: "", accepted_amount: "", confirmed_amount: "" });
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 bg-slate-800/50 rounded-2xl p-1 border border-slate-700/50">
        {[{id:"calendar",label:"📅 團隊行事曆"},{id:"sales",label:"💰 業績回報"}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab===t.id ? "bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "calendar" && (
        <TeamCalendar currentUser={user} allProfiles={allProfiles} onToast={onToast} />
      )}

      {activeTab === "sales" && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="font-bold text-white mb-5 flex items-center gap-2">
            <span className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-sky-500 rounded-lg flex items-center justify-center text-sm">💰</span>
            業績回報表單
          </h2>
          <form onSubmit={handleAddSale} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="日期 *"><input type="date" value={sForm.date} onChange={e => setSForm(p=>({...p,date:e.target.value}))} className={inputCls()} required /></Field>
              <Field label="客戶姓名 *"><input type="text" value={sForm.client_name} onChange={e => setSForm(p=>({...p,client_name:e.target.value}))} placeholder="王小明" className={inputCls()} /></Field>
            </div>
            <Field label="險種 / 備註"><input type="text" value={sForm.product_name} onChange={e => setSForm(p=>({...p,product_name:e.target.value}))} placeholder="終身壽險、醫療險..." className={inputCls()} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="受理業績 (元)"><input type="number" value={sForm.accepted_amount} onChange={e => setSForm(p=>({...p,accepted_amount:e.target.value}))} placeholder="0" min="0" className={inputCls()} /></Field>
              <Field label="核實業績 (元)"><input type="number" value={sForm.confirmed_amount} onChange={e => setSForm(p=>({...p,confirmed_amount:e.target.value}))} placeholder="0" min="0" className={inputCls()} /></Field>
            </div>
            <button type="submit" disabled={sSaving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 text-white font-semibold text-sm transition-all shadow-lg disabled:opacity-50">
              {sSaving ? <span className="flex items-center justify-center gap-2"><Spinner />送出中...</span> : "送出業績紀錄"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── 主管視窗 ────────────────────────────────────────────────
function ManagerView({ user, allProfiles, onToast }) {
  const [period, setPeriod] = useState("week");
  const [agentFilter, setAgentFilter] = useState("all");
  const [activities, setActivities] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const agents = allProfiles.filter(p => p.role === "agent");
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

  const totalAct = Object.values(actStats).reduce((a,b) => a+b, 0);

  const salesStats = useMemo(() => {
    const accepted  = sales.reduce((s, r) => s + Number(r.accepted_amount||0), 0);
    const confirmed = sales.reduce((s, r) => s + Number(r.confirmed_amount||0), 0);
    return { accepted, confirmed, gap: accepted - confirmed };
  }, [sales]);

  const agentBreakdown = useMemo(() => {
    const map = {};
    allProfiles.forEach(p => {
      map[p.id] = { name: p.name, acts: {親訪:0,跨售訪:0,議題訪:0}, accepted:0, confirmed:0 };
    });
    activities.forEach(r => { if(map[r.user_id]) map[r.user_id].acts[r.visit_type] = (map[r.user_id].acts[r.visit_type]||0)+1; });
    sales.forEach(r => { if(map[r.user_id]) { map[r.user_id].accepted += Number(r.accepted_amount||0); map[r.user_id].confirmed += Number(r.confirmed_amount||0); }});
    return Object.entries(map);
  }, [activities, sales, allProfiles]);

  const periodLabel = period === "week" ? `${range.start} ～ ${range.end}` : range.start.slice(0,7).replace("-","年") + "月";

  return (
    <div className="space-y-6">
      {/* Tab 切換 */}
      <div className="flex gap-2 bg-slate-800/50 rounded-2xl p-1 border border-slate-700/50">
        {[{id:"dashboard",label:"📊 管理看板"},{id:"calendar",label:"📅 團隊行事曆"},{id:"sales",label:"💰 業績回報"}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab===t.id ? "bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 管理看板 */}
      {activeTab === "dashboard" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2 bg-slate-800/50 rounded-2xl p-1 border border-slate-700/50 flex-1">
              {[{id:"week",label:"本週"},{id:"month",label:"本月"}].map(p => (
                <button key={p.id} onClick={()=>setPeriod(p.id)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${period===p.id ? "bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
              className="bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 min-w-[150px]">
              <option value="all">全團隊綜合</option>
              {allProfiles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-slate-500 font-medium">統計區間：{periodLabel}</p>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3 text-slate-400"><Spinner /><span className="text-sm">載入中...</span></div>
            </div>
          ) : (
            <>
              <section>
                <div className="flex items-center gap-2 mb-3"><span>📊</span><h2 className="font-bold text-slate-200 text-sm uppercase tracking-widest">活動量看板</h2></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="總活動量" value={totalAct} sub="次" accent="sky" />
                  <StatCard label="親訪" value={actStats["親訪"]} sub="次" accent="sky" />
                  <StatCard label="跨售訪" value={actStats["跨售訪"]} sub="次" accent="violet" />
                  <StatCard label="議題訪" value={actStats["議題訪"]} sub="次" accent="amber" />
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3"><span>💹</span><h2 className="font-bold text-slate-200 text-sm uppercase tracking-widest">業績看板</h2></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <StatCard label="受理業績" value={`$${fmtMoney(salesStats.accepted)}`} sub="元" accent="emerald" />
                  <StatCard label="核實業績" value={`$${fmtMoney(salesStats.confirmed)}`} sub="元" accent="sky" />
                  <StatCard label="業績落差" value={`$${fmtMoney(salesStats.gap)}`} sub="受理 - 核實" accent={salesStats.gap > 0 ? "rose" : "emerald"} />
                </div>
              </section>

              {agentFilter === "all" && (
                <section>
                  <div className="flex items-center gap-2 mb-3"><span>👥</span><h2 className="font-bold text-slate-200 text-sm uppercase tracking-widest">個人明細</h2></div>
                  <div className="space-y-3">
                    {agentBreakdown.map(([uid, data]) => (
                      <div key={uid} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm">{data.name[0]}</div>
                          <span className="font-bold text-white">{data.name}{uid === user.id ? "（我）" : ""}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {VISIT_TYPES.map(t => {
                            const c = VISIT_COLORS[t];
                            return <div key={t} className={`${c.bg} rounded-xl p-3 text-center`}><p className={`text-lg font-bold ${c.text}`}>{data.acts[t]}</p><p className={`text-xs ${c.text} opacity-80`}>{t}</p></div>;
                          })}
                        </div>
                        <div className="grid grid-cols-2 gap-2 bg-slate-700/30 rounded-xl p-3">
                          <div><span className="text-slate-500 text-xs">受理</span><p className="text-emerald-400 font-semibold">${fmtMoney(data.accepted)}</p></div>
                          <div><span className="text-slate-500 text-xs">核實</span><p className="text-sky-400 font-semibold">${fmtMoney(data.confirmed)}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activities.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3"><span>📋</span><h2 className="font-bold text-slate-200 text-sm uppercase tracking-widest">拜訪明細</h2></div>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                    <div className="divide-y divide-slate-700/50">
                      {activities.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(act => {
                        const c = VISIT_COLORS[act.visit_type];
                        const agentName = allProfiles.find(a=>a.id===act.user_id)?.name || "—";
                        return (
                          <div key={act.id} className="px-5 py-3.5 hover:bg-slate-700/30 transition">
                            <div className="flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white">{agentName} → {act.client_name}</p>
                                {act.notes && <p className="text-xs text-slate-400 mt-0.5">議題：{act.notes}</p>}
                                <p className="text-xs text-slate-500">{act.date}</p>
                              </div>
                              <span className={`text-xs font-semibold ${c.text} ${c.bg} px-2.5 py-1 rounded-lg flex-shrink-0`}>{act.visit_type}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}

      {/* 團隊行事曆 */}
      {activeTab === "calendar" && (
        <TeamCalendar currentUser={user} allProfiles={allProfiles} onToast={onToast} />
      )}

      {/* 業績回報 */}
      {activeTab === "sales" && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="font-bold text-white mb-5 flex items-center gap-2">
            <span className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-sky-500 rounded-lg flex items-center justify-center text-sm">💰</span>
            業績回報表單
          </h2>
          <ManagerSalesForm user={user} onToast={onToast} />
        </div>
      )}
    </div>
  );
}

function ManagerSalesForm({ user, onToast }) {
  const today = new Date();
  const [sForm, setSForm] = useState({ date: fmtDate(today), client_name: "", product_name: "", accepted_amount: "", confirmed_amount: "" });
  const [sSaving, setSSaving] = useState(false);

  async function handleAddSale(e) {
    e.preventDefault();
    if (!sForm.date || !sForm.client_name.trim()) { onToast("請填寫日期與客戶名稱", "error"); return; }
    if (sForm.accepted_amount === "" && sForm.confirmed_amount === "") { onToast("請填寫至少一筆業績金額", "error"); return; }
    setSSaving(true);
    const { error } = await supabase.from("sales").insert({
      user_id: user.id, date: sForm.date, client_name: sForm.client_name,
      product_name: sForm.product_name,
      accepted_amount: Number(sForm.accepted_amount) || 0,
      confirmed_amount: Number(sForm.confirmed_amount) || 0,
    });
    setSSaving(false);
    if (error) { onToast("送出失敗：" + error.message, "error"); return; }
    onToast("✓ 業績紀錄已送出");
    setSForm({ date: fmtDate(today), client_name: "", product_name: "", accepted_amount: "", confirmed_amount: "" });
  }

  return (
    <form onSubmit={handleAddSale} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="日期 *"><input type="date" value={sForm.date} onChange={e => setSForm(p=>({...p,date:e.target.value}))} className={inputCls()} required /></Field>
        <Field label="客戶姓名 *"><input type="text" value={sForm.client_name} onChange={e => setSForm(p=>({...p,client_name:e.target.value}))} placeholder="王小明" className={inputCls()} /></Field>
      </div>
      <Field label="險種 / 備註"><input type="text" value={sForm.product_name} onChange={e => setSForm(p=>({...p,product_name:e.target.value}))} placeholder="終身壽險、醫療險..." className={inputCls()} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="受理業績 (元)"><input type="number" value={sForm.accepted_amount} onChange={e => setSForm(p=>({...p,accepted_amount:e.target.value}))} placeholder="0" min="0" className={inputCls()} /></Field>
        <Field label="核實業績 (元)"><input type="number" value={sForm.confirmed_amount} onChange={e => setSForm(p=>({...p,confirmed_amount:e.target.value}))} placeholder="0" min="0" className={inputCls()} /></Field>
      </div>
      <button type="submit" disabled={sSaving}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 text-white font-semibold text-sm transition-all shadow-lg disabled:opacity-50">
        {sSaving ? <span className="flex items-center justify-center gap-2"><Spinner />送出中...</span> : "送出業績紀錄"}
      </button>
    </form>
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md mx-4">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 mb-4 shadow-lg shadow-sky-500/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">業績管理系統</h1>
          <p className="text-slate-400 mt-1 text-sm">Insurance Sales Management V1</p>
        </div>
        <form onSubmit={handleLogin} className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">電子郵件</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls()} placeholder="your@email.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">密碼</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls()} placeholder="••••••••" />
            </div>
          </div>
          {error && (
            <div className="mt-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading}
            className="mt-6 w-full bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-400 hover:to-violet-400 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg disabled:opacity-50">
            {loading ? <span className="flex items-center justify-center gap-2"><Spinner />登入中...</span> : "登入系統"}
          </button>
        </form>
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

  async function handleLogin(u) {
    setCurrentUser(u);
    await loadProfiles();
  }

  function showToast(msg, type = "success") { setToast({ msg, type, key: Date.now() }); }

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="flex items-center gap-3 text-slate-400"><Spinner /><span>載入中...</span></div>
    </div>
  );

  if (!currentUser) return <AuthPage onLogin={handleLogin} />;

  const isManager = currentUser.profile?.role === "manager";
  const agentName = currentUser.profile?.name || currentUser.email;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-sky-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">業績管理系統</p>
              <p className="text-slate-500 text-xs leading-tight">{isManager ? "🎯 主管視窗" : "📋 業務員視窗"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-semibold">{agentName}</p>
              <p className="text-slate-500 text-xs">{isManager ? "Manager" : "Agent"}</p>
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); setCurrentUser(null); }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium transition border border-slate-700">
              登出
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 relative">
        {isManager
          ? <ManagerView user={currentUser} allProfiles={allProfiles} onToast={showToast} />
          : <AgentView user={currentUser} allProfiles={allProfiles} onToast={showToast} />
        }
      </main>
      {toast && <Toast key={toast.key} message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
