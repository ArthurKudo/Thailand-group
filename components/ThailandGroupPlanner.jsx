'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapPin, Plus, Trash2, Star, Users, Wallet, Route, Calendar,
  ChevronUp, ChevronDown, ChevronRight, ChevronLeft, X, Link as LinkIcon,
  Loader2, RefreshCw, List, CheckCircle2, AlertTriangle
} from 'lucide-react';

const INK = '#1C2A27';
const JADE = '#0B6E55';
const JADE_DARK = '#08503E';
const JADE_TINT = '#E7F4EF';
const CORAL = '#D9542F';
const CORAL_TINT = '#FBEAE3';
const GOLD = '#B9832A';
const SAND = '#F6FAF8';
const LINE = '#E2E8E4';

const PHASE_LABEL = { ferias: 'Férias', workation: 'Workation' };
const PHASE_COLOR = {
  ferias: { bg: JADE_TINT, text: JADE_DARK, border: '#BFE3D5' },
  workation: { bg: '#FCF3E3', text: '#8A5A12', border: '#F0DBAE' },
};

const CITY_PALETTE = [
  { bg: '#E7F4EF', text: '#08503E', border: '#BFE3D5' },
  { bg: '#E9EEFB', text: '#2C4A8A', border: '#C7D3F3' },
  { bg: '#FBEAE3', text: '#8A3418', border: '#F3C7B4' },
  { bg: '#F3E8FB', text: '#6B2C8A', border: '#DDBFF3' },
  { bg: '#FCF3E3', text: '#8A5A12', border: '#F0DBAE' },
  { bg: '#E8FBF0', text: '#1F7A45', border: '#BFF0D3' },
  { bg: '#FBE8F0', text: '#8A1F55', border: '#F3BFD8' },
  { bg: '#EAF6FB', text: '#1B6A8A', border: '#BFE3F0' },
];

const TRIP_START = new Date(2027, 1, 8); // 08/02/2027
const FERIAS_DEADLINE = new Date(2027, 2, 2); // 02/03/2027

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_FULL_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const DEFAULT_ITINERARY = [
  { id: 'i1', city: 'Bangkok', days: 3, phase: 'ferias' },
  { id: 'i2', city: 'Chiang Mai', days: 5, phase: 'ferias' },
  { id: 'i3', city: 'Phuket', days: 3, phase: 'ferias' },
  { id: 'i4', city: 'Phi Phi Islands', days: 7, phase: 'ferias' },
  { id: 'i5', city: 'Krabi', days: 3, phase: 'ferias' },
  { id: 'i6', city: 'Koh Samui', days: 31, phase: 'workation' },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function brl(n) {
  return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_PT[d.getMonth()]}`;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function buildMonthWeeks(year, month) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}
function monthsInRange(start, end) {
  const months = [];
  let y = start.getFullYear();
  let m = start.getMonth();
  while (y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth())) {
    months.push({ year: y, month: m });
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  return months;
}
function stopForDate(date, scheduled) {
  return scheduled.find((s) => date >= s.start && date <= s.end);
}
function buildCityColors(stops) {
  const map = {};
  let i = 0;
  stops.forEach((s) => {
    if (!(s.city in map)) {
      map[s.city] = CITY_PALETTE[i % CITY_PALETTE.length];
      i += 1;
    }
  });
  return map;
}
function cityAbbrev(city) {
  const words = (city || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return (words[0] || '').slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join('').toUpperCase().slice(0, 4);
}

async function loadShared(key, fallback) {
  try {
    const res = await fetch(`/api/state/${key}`);
    if (!res.ok) return fallback;
    const data = await res.json();
    return data.value ?? fallback;
  } catch {
    return fallback;
  }
}
async function saveShared(key, value) {
  try {
    await fetch(`/api/state/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
  } catch (e) {
    console.error('Falha ao salvar', key, e);
  }
}

export default function ThailandGroupPlanner() {
  const [booting, setBooting] = useState(true);
  const [myName, setMyName] = useState('');
  const [nameInput, setNameInput] = useState('');

  const [tab, setTab] = useState('roteiro');
  const [members, setMembers] = useState([]);
  const [itinerary, setItinerary] = useState(DEFAULT_ITINERARY);
  const [accommodations, setAccommodations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const personal = window.localStorage.getItem('my-name');
        if (personal) setMyName(personal);
      } catch {}
      const [m, it, ac, at, ex] = await Promise.all([
        loadShared('members', []),
        loadShared('itinerary', DEFAULT_ITINERARY),
        loadShared('accommodations', []),
        loadShared('activities', []),
        loadShared('expenses', []),
      ]);
      setMembers(m);
      setItinerary(it);
      setAccommodations(ac);
      setActivities(at);
      setExpenses(ex);
      setBooting(false);
    })();
  }, []);

  const refreshShared = useCallback(async () => {
    setSyncing(true);
    const [m, it, ac, at, ex] = await Promise.all([
      loadShared('members', []),
      loadShared('itinerary', DEFAULT_ITINERARY),
      loadShared('accommodations', []),
      loadShared('activities', []),
      loadShared('expenses', []),
    ]);
    setMembers(m);
    setItinerary(it);
    setAccommodations(ac);
    setActivities(at);
    setExpenses(ex);
    setSyncing(false);
  }, []);

  async function handleJoin() {
    const name = nameInput.trim();
    if (!name) return;
    setMyName(name);
    try { window.localStorage.setItem('my-name', name); } catch (e) { console.error(e); }
    const current = await loadShared('members', []);
    if (!current.includes(name)) {
      const next = [...current, name];
      setMembers(next);
      await saveShared('members', next);
    } else {
      setMembers(current);
    }
  }

  async function updateItinerary(next) {
    setItinerary(next);
    await saveShared('itinerary', next);
  }
  function addStop() {
    updateItinerary([...itinerary, { id: uid(), city: 'Nova cidade', days: 1, phase: 'ferias' }]);
  }
  function editStop(id, patch) {
    updateItinerary(itinerary.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function removeStop(id) {
    updateItinerary(itinerary.filter((s) => s.id !== id));
  }
  function moveStop(id, dir) {
    const idx = itinerary.findIndex((s) => s.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= itinerary.length) return;
    const next = [...itinerary];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    updateItinerary(next);
  }

  const scheduled = useMemo(() => {
    let cursor = new Date(TRIP_START);
    return itinerary.map((s) => {
      const start = new Date(cursor);
      const end = addDays(start, Math.max(0, Number(s.days || 0) - 1));
      cursor = addDays(end, 1);
      return { ...s, start, end };
    });
  }, [itinerary]);

  const feriasStatus = useMemo(() => {
    const feriasStops = scheduled.filter((s) => s.phase === 'ferias');
    const totalDays = feriasStops.reduce((sum, s) => sum + Number(s.days || 0), 0);
    const projectedEnd = feriasStops.length ? feriasStops[feriasStops.length - 1].end : TRIP_START;
    const budget = daysBetween(TRIP_START, FERIAS_DEADLINE) + 1;
    const diff = budget - totalDays;
    return { totalDays, projectedEnd, budget, diff, onTrack: diff >= 0 };
  }, [scheduled]);

  const tripEnd = scheduled.length ? scheduled[scheduled.length - 1].end : TRIP_START;

  const totalsByPhase = useMemo(() => {
    const totals = {};
    itinerary.forEach((s) => { totals[s.phase] = (totals[s.phase] || 0) + Number(s.days || 0); });
    return totals;
  }, [itinerary]);

  const cityColors = useMemo(() => buildCityColors(itinerary), [itinerary]);
  const memberCount = members.length || 1;

  function makeListHandlers(list, setList, storageKey) {
    async function update(next) { setList(next); await saveShared(storageKey, next); }
    function addItem(city) {
      update([...list, { id: uid(), city, name: 'Nova opção', link: '', price: '', notes: '', ratings: {} }]);
    }
    function removeItem(id) { update(list.filter((i) => i.id !== id)); }
    function editItem(id, patch) { update(list.map((i) => (i.id === id ? { ...i, ...patch } : i))); }
    function rateItem(id, score, comment) {
      update(list.map((i) => (i.id === id ? { ...i, ratings: { ...i.ratings, [myName]: { score, comment } } } : i)));
    }
    return { addItem, removeItem, editItem, rateItem };
  }
  const accHandlers = makeListHandlers(accommodations, setAccommodations, 'accommodations');
  const actHandlers = makeListHandlers(activities, setActivities, 'activities');

  async function updateExpenses(next) { setExpenses(next); await saveShared('expenses', next); }
  function addExpense() {
    updateExpenses([...expenses, {
      id: uid(), description: 'Novo gasto', amount: 0, installments: 1,
      paidBy: myName || members[0] || '', splitWith: members.length ? [...members] : [myName],
    }]);
  }
  function editExpense(id, patch) { updateExpenses(expenses.map((e) => (e.id === id ? { ...e, ...patch } : e))); }
  function removeExpense(id) { updateExpenses(expenses.filter((e) => e.id !== id)); }
  function toggleSplit(id, name) {
    const exp = expenses.find((e) => e.id === id);
    if (!exp) return;
    const has = exp.splitWith.includes(name);
    const next = has ? exp.splitWith.filter((n) => n !== name) : [...exp.splitWith, name];
    editExpense(id, { splitWith: next });
  }

  const balances = useMemo(() => {
    const bal = {};
    members.forEach((m) => (bal[m] = { paid: 0, owed: 0 }));
    expenses.forEach((e) => {
      const amount = Number(e.amount || 0);
      const split = e.splitWith && e.splitWith.length ? e.splitWith : [];
      if (!bal[e.paidBy]) bal[e.paidBy] = { paid: 0, owed: 0 };
      bal[e.paidBy].paid += amount;
      const share = split.length ? amount / split.length : 0;
      split.forEach((n) => { if (!bal[n]) bal[n] = { paid: 0, owed: 0 }; bal[n].owed += share; });
    });
    return bal;
  }, [members, expenses]);

  const settlements = useMemo(() => {
    const nets = Object.entries(balances).map(([name, b]) => ({ name, net: b.paid - b.owed }));
    const debtors = nets.filter((n) => n.net < -0.01).map((n) => ({ ...n, net: -n.net })).sort((a, b) => b.net - a.net);
    const creditors = nets.filter((n) => n.net > 0.01).sort((a, b) => b.net - a.net);
    const result = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].net, creditors[j].net);
      result.push({ from: debtors[i].name, to: creditors[j].name, amount: pay });
      debtors[i].net -= pay; creditors[j].net -= pay;
      if (debtors[i].net < 0.01) i++;
      if (creditors[j].net < 0.01) j++;
    }
    return result;
  }, [balances]);

  const totalSpent = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0), [expenses]);

  const fontStyle = { fontFamily: "'Fraunces', serif" };

  if (booting) {
    return (
      <div className="w-full flex items-center justify-center py-24" style={{ color: '#9CA8A3' }}>
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  if (!myName) {
    return (
      <div className="w-full" style={{ background: SAND, fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-sm mx-auto py-16 px-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ background: JADE, color: 'white' }}>
              <Route size={24} />
            </div>
            <h1 className="text-2xl" style={{ ...fontStyle, color: INK }}>Tailândia em grupo</h1>
            <p className="text-sm mt-2" style={{ color: '#5B6A65' }}>
              Roteiro, hospedagem, passeios e orçamento, centralizados pro grupo decidir junto.
            </p>
          </div>
          <label className="block text-sm mb-1.5" style={{ color: '#4A5651' }}>Como você se chama?</label>
          <input
            autoFocus value={nameInput} onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()} placeholder="Seu nome"
            className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
            style={{ border: `1px solid ${LINE}`, background: 'white' }}
          />
          <button
            onClick={handleJoin} disabled={!nameInput.trim()}
            className="w-full mt-3 rounded-lg py-2.5 text-sm font-medium text-white transition-opacity"
            style={{ background: nameInput.trim() ? JADE : '#C9D3CF', opacity: nameInput.trim() ? 1 : 0.7 }}
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'roteiro', label: 'Roteiro', icon: Route },
    { key: 'destinos', label: 'Destinos', icon: MapPin },
    { key: 'orcamento', label: 'Orçamento', icon: Wallet },
  ];

  return (
    <div className="w-full" style={{ background: SAND, fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-2xl mx-auto pb-16">
        <div className="flex items-center justify-between pt-6 pb-3 px-4">
          <div>
            <h1 className="text-xl" style={{ ...fontStyle, color: INK }}>Tailândia em grupo</h1>
            <p className="text-xs flex items-center gap-1 mt-1" style={{ color: '#7A867F' }}>
              <Users size={12} /> {memberCount} pessoa{memberCount === 1 ? '' : 's'} · você é {myName}
            </p>
          </div>
          <button onClick={refreshShared} className="p-2 rounded-full transition-colors" style={{ color: '#8A968E' }} title="Atualizar dados do grupo">
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="px-4 mb-4">
          <DeadlineBanner status={feriasStatus} />
        </div>

        <div className="flex gap-1 px-4 mb-5 overflow-x-auto" style={{ borderBottom: `1px solid ${LINE}` }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap transition-colors"
                style={{
                  borderBottom: active ? `2px solid ${JADE}` : '2px solid transparent',
                  color: active ? JADE_DARK : '#8A968E',
                  fontWeight: active ? 500 : 400,
                  marginBottom: '-1px',
                }}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="px-4">
          {tab === 'roteiro' && (
            <RoteiroTab
              itinerary={itinerary} scheduled={scheduled} totalsByPhase={totalsByPhase}
              tripEnd={tripEnd} cityColors={cityColors}
              onAdd={addStop} onEdit={editStop} onRemove={removeStop} onMove={moveStop}
            />
          )}
          {tab === 'destinos' && (
            <DestinosTab itinerary={itinerary} accommodations={accommodations} activities={activities}
              myName={myName} accHandlers={accHandlers} actHandlers={actHandlers} cityColors={cityColors} />
          )}
          {tab === 'orcamento' && (
            <OrcamentoTab expenses={expenses} members={members} myName={myName} balances={balances}
              settlements={settlements} totalSpent={totalSpent} onAdd={addExpense} onEdit={editExpense}
              onRemove={removeExpense} onToggleSplit={toggleSplit} />
          )}
        </div>
      </div>
    </div>
  );
}

function DeadlineBanner({ status }) {
  const { onTrack, diff, projectedEnd } = status;
  const color = onTrack ? JADE : CORAL;
  const tint = onTrack ? JADE_TINT : CORAL_TINT;
  const border = onTrack ? '#BFE3D5' : '#F3C7B4';
  return (
    <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: tint, border: `1px solid ${border}` }}>
      <div
        className="shrink-0 flex flex-col items-center justify-center rounded-full text-center"
        style={{
          width: 56, height: 56, border: `2px dashed ${color}`, color, transform: 'rotate(-8deg)',
          fontFamily: "'Fraunces', serif",
        }}
      >
        <span style={{ fontSize: 9, letterSpacing: 0.5, lineHeight: 1 }}>{onTrack ? 'NO' : 'FORA DO'}</span>
        <span style={{ fontSize: 9, letterSpacing: 0.5, lineHeight: 1, marginTop: 2 }}>PRAZO</span>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium" style={{ color: onTrack ? JADE_DARK : '#8A3418' }}>
          Deadline das férias: 02 mar
        </div>
        <div className="text-xs mt-0.5" style={{ color: onTrack ? '#3F6E60' : '#A2492A' }}>
          {onTrack
            ? `Roteiro atual termina em ${fmtDate(projectedEnd)} — ${diff} dia${diff === 1 ? '' : 's'} de folga`
            : `Roteiro atual termina em ${fmtDate(projectedEnd)} — ${Math.abs(diff)} dia${Math.abs(diff) === 1 ? '' : 's'} além do prazo`}
        </div>
      </div>
      {onTrack ? <CheckCircle2 size={18} className="shrink-0 ml-auto" style={{ color: JADE }} /> : <AlertTriangle size={18} className="shrink-0 ml-auto" style={{ color: CORAL }} />}
    </div>
  );
}

function RoteiroTab({ itinerary, scheduled, totalsByPhase, tripEnd, cityColors, onAdd, onEdit, onRemove, onMove }) {
  const [view, setView] = useState('lista');
  const views = [
    { key: 'lista', label: 'Lista', icon: List },
    { key: 'calendario', label: 'Calendário', icon: Calendar },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {Object.entries(PHASE_LABEL).map(([key, label]) => (
          <div key={key} className="flex-1 rounded-xl px-3.5 py-2.5" style={{ background: PHASE_COLOR[key].bg, border: `1px solid ${PHASE_COLOR[key].border}` }}>
            <div className="text-xs opacity-80" style={{ color: PHASE_COLOR[key].text }}>{label}</div>
            <div className="text-lg font-medium" style={{ color: PHASE_COLOR[key].text, fontFamily: "'Fraunces', serif" }}>{totalsByPhase[key] || 0} dias</div>
          </div>
        ))}
      </div>

      <div className="inline-flex rounded-full p-1 mb-4" style={{ background: '#EEF2EF' }}>
        {views.map((v) => {
          const Icon = v.icon;
          const active = view === v.key;
          return (
            <button key={v.key} onClick={() => setView(v.key)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors"
              style={{ background: active ? 'white' : 'transparent', color: active ? JADE_DARK : '#7A867F', fontWeight: active ? 500 : 400, boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}
            >
              <Icon size={13} /> {v.label}
            </button>
          );
        })}
      </div>

      {view === 'lista' && (
        <ListaView itinerary={itinerary} scheduled={scheduled} cityColors={cityColors} onEdit={onEdit} onRemove={onRemove} onMove={onMove} onAdd={onAdd} />
      )}
      {view === 'calendario' && <CalendarioView scheduled={scheduled} tripEnd={tripEnd} cityColors={cityColors} />}
    </div>
  );
}

function ListaView({ itinerary, scheduled, cityColors, onEdit, onRemove, onMove, onAdd }) {
  return (
    <div>
      <div className="space-y-2">
        {itinerary.map((stop, idx) => {
          const sc = scheduled[idx];
          const c = cityColors[stop.city];
          return (
            <div key={stop.id} className="flex items-center gap-2 rounded-xl px-3 py-2.5 shadow-sm" style={{ background: 'white', border: `1px solid ${LINE}` }}>
              <div className="flex flex-col -my-1">
                <button onClick={() => onMove(stop.id, -1)} disabled={idx === 0} style={{ color: '#C4CCC8' }} className="disabled:opacity-30 p-1 -m-1 active:scale-90 transition-transform">
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => onMove(stop.id, 1)} disabled={idx === itinerary.length - 1} style={{ color: '#C4CCC8' }} className="disabled:opacity-30 p-1 -m-1 active:scale-90 transition-transform">
                  <ChevronDown size={14} />
                </button>
              </div>

              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.text }} />

              <div className="flex-1 min-w-0">
                <input value={stop.city} onChange={(e) => onEdit(stop.id, { city: e.target.value })}
                  className="w-full text-sm font-medium outline-none bg-transparent" style={{ color: INK }} />
                {sc && <div className="text-[11px]" style={{ color: '#96A19C' }}>{fmtDate(sc.start)} – {fmtDate(sc.end)}</div>}
              </div>

              <select value={stop.phase} onChange={(e) => onEdit(stop.id, { phase: e.target.value })}
                className="text-xs rounded-full px-2 py-1 outline-none"
                style={{ background: PHASE_COLOR[stop.phase].bg, color: PHASE_COLOR[stop.phase].text, border: `1px solid ${PHASE_COLOR[stop.phase].border}` }}
              >
                <option value="ferias">Férias</option>
                <option value="workation">Workation</option>
              </select>

              <input type="number" min={0} value={stop.days} onChange={(e) => onEdit(stop.id, { days: Number(e.target.value) })}
                className="w-14 text-sm text-center rounded-lg py-1 outline-none" style={{ border: `1px solid ${LINE}` }} />
              <span className="text-xs w-8" style={{ color: '#96A19C' }}>dias</span>

              <button onClick={() => onRemove(stop.id)} style={{ color: '#C4CCC8' }} className="hover:!text-red-500 shrink-0 p-1.5 -m-1.5 active:scale-90 transition-transform">
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </div>

      <button onClick={onAdd} className="mt-3 flex items-center gap-1.5 text-sm font-medium py-1 active:opacity-60 transition-opacity" style={{ color: JADE_DARK }}>
        <Plus size={15} /> Adicionar parada
      </button>
    </div>
  );
}

function CalendarioView({ scheduled, tripEnd, cityColors }) {
  if (!scheduled.length) return <p className="text-sm py-8 text-center" style={{ color: '#96A19C' }}>Adicione paradas no roteiro para ver o calendário.</p>;

  const rangeEnd = tripEnd > FERIAS_DEADLINE ? tripEnd : FERIAS_DEADLINE;
  const months = monthsInRange(TRIP_START, rangeEnd);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-4 text-xs" style={{ color: '#7A867F' }}>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ border: `2px dashed ${CORAL}` }} />
        Contorno tracejado = prazo das férias (02 mar)
      </div>

      <div className="space-y-6">
        {months.map(({ year, month }) => (
          <MonthGrid key={`${year}-${month}`} year={year} month={month} scheduled={scheduled} cityColors={cityColors} />
        ))}
      </div>

      <div className="mt-6 space-y-2">
        {scheduled.map((s) => {
          const c = cityColors[s.city];
          return (
            <div key={s.id} className="flex items-center justify-between text-xs rounded-lg px-3 py-2 shadow-sm" style={{ background: 'white', border: `1px solid ${LINE}` }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.text }} />
                <span className="font-medium" style={{ color: INK }}>{s.city}</span>
              </div>
              <span style={{ color: '#7A867F' }}>{fmtDate(s.start)} – {fmtDate(s.end)} · {s.days}d</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({ year, month, scheduled, cityColors }) {
  const weeks = buildMonthWeeks(year, month);
  return (
    <div>
      <div className="text-sm mb-2" style={{ fontFamily: "'Fraunces', serif", color: INK }}>
        {MONTHS_FULL_PT[month]} de {year}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_PT.map((w) => (
          <div key={w} className="text-center text-[10px] uppercase tracking-wide" style={{ color: '#96A19C' }}>{w}</div>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((date, di) => {
              if (!date) return <div key={di} />;
              const stop = stopForDate(date, scheduled);
              const isDeadline = isSameDay(date, FERIAS_DEADLINE);
              const c = stop ? cityColors[stop.city] : null;
              return (
                <div
                  key={di}
                  title={stop ? stop.city : undefined}
                  className="rounded-lg flex flex-col items-center justify-center gap-0.5 py-1"
                  style={{
                    minHeight: 40,
                    background: c ? c.bg : 'transparent',
                    color: c ? c.text : '#C4CCC8',
                    border: isDeadline ? `2px dashed ${CORAL}` : c ? `1px solid ${c.border}` : '1px solid transparent',
                  }}
                >
                  <span className="text-xs font-medium leading-none">{date.getDate()}</span>
                  {stop && (
                    <span className="text-[8px] font-medium leading-none uppercase tracking-wide truncate max-w-full px-0.5">
                      {cityAbbrev(stop.city)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function DestinosTab({ itinerary, accommodations, activities, myName, accHandlers, actHandlers, cityColors }) {
  const [selected, setSelected] = useState(null);
  const countFor = (city) => ({
    acc: accommodations.filter((i) => i.city === city).length,
    act: activities.filter((i) => i.city === city).length,
  });

  if (!selected) {
    return (
      <div className="space-y-2">
        {itinerary.map((stop) => {
          const counts = countFor(stop.city);
          const c = cityColors[stop.city];
          return (
            <button key={stop.id} onClick={() => setSelected(stop.city)}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 shadow-sm transition-colors active:opacity-70 text-left"
              style={{ background: 'white', border: `1px solid ${LINE}` }}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.text }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: INK }}>{stop.city}</div>
                <div className="text-xs mt-0.5" style={{ color: '#96A19C' }}>
                  {stop.days} dias · {counts.acc} hospedage{counts.acc === 1 ? 'm' : 'ns'} · {counts.act} passeio{counts.act === 1 ? '' : 's'}
                </div>
              </div>
              <ChevronRight size={16} style={{ color: '#C4CCC8' }} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm mb-4" style={{ color: '#7A867F' }}>
        <ChevronLeft size={15} /> Todos os destinos
      </button>
      <h2 className="text-lg mb-4" style={{ fontFamily: "'Fraunces', serif", color: INK }}>{selected}</h2>

      <CitySection title="Hospedagem" city={selected} items={accommodations.filter((i) => i.city === selected)} myName={myName} {...accHandlers} />
      <div className="h-6" />
      <CitySection title="Passeios" city={selected} items={activities.filter((i) => i.city === selected)} myName={myName} {...actHandlers} />
    </div>
  );
}

function CitySection({ title, city, items, myName, addItem, removeItem, editItem, rateItem }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8A968E' }}>{title}</h3>
        <button onClick={() => addItem(city)} className="flex items-center gap-1 text-xs font-medium" style={{ color: JADE_DARK }}>
          <Plus size={13} /> Adicionar
        </button>
      </div>
      {items.length === 0 && <p className="text-xs py-3" style={{ color: '#96A19C' }}>Nenhuma opção cadastrada ainda.</p>}
      <div className="space-y-3">
        {items.map((item) => (
          <OptionCard key={item.id} item={item} myName={myName} onEdit={editItem} onRemove={removeItem} onRate={rateItem} />
        ))}
      </div>
    </div>
  );
}

function OptionCard({ item, myName, onEdit, onRemove, onRate }) {
  const ratingEntries = Object.entries(item.ratings || {});
  const avg = ratingEntries.length ? (ratingEntries.reduce((s, [, r]) => s + r.score, 0) / ratingEntries.length).toFixed(1) : null;
  const myRating = item.ratings?.[myName];
  const [comment, setComment] = useState(myRating?.comment || '');

  return (
    <div className="rounded-xl p-3.5 shadow-sm" style={{ background: 'white', border: `1px solid ${LINE}` }}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 space-y-1.5">
          <input value={item.name} onChange={(e) => onEdit(item.id, { name: e.target.value })}
            className="w-full text-sm font-medium outline-none bg-transparent" style={{ color: INK }} />
          <div className="flex items-center gap-2">
            <LinkIcon size={12} className="shrink-0" style={{ color: '#C4CCC8' }} />
            <input value={item.link} onChange={(e) => onEdit(item.id, { link: e.target.value })}
              placeholder="link (Airbnb, Booking, GetYourGuide...)" className="flex-1 text-xs outline-none bg-transparent" style={{ color: '#7A867F' }} />
          </div>
          <input value={item.price} onChange={(e) => onEdit(item.id, { price: e.target.value })}
            placeholder="preço (ex: R$ 350/noite)" className="w-full text-xs outline-none bg-transparent" style={{ color: '#7A867F' }} />
        </div>
        {avg && (
          <div className="flex items-center gap-1 text-xs font-medium rounded-full px-2 py-1 shrink-0" style={{ background: '#FBF2E1', color: GOLD }}>
            <Star size={11} fill="currentColor" /> {avg}
          </div>
        )}
        <button onClick={() => onRemove(item.id)} style={{ color: '#C4CCC8' }} className="hover:!text-red-500 shrink-0 p-1.5 -m-1.5 active:scale-90 transition-transform">
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
        <div className="flex items-center gap-1 mb-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => onRate(item.id, n, comment)} className="p-1 -m-1 active:scale-90 transition-transform" style={{ color: n <= (myRating?.score || 0) ? GOLD : '#E2E8E4' }}>
              <Star size={16} fill="currentColor" />
            </button>
          ))}
          <span className="text-xs ml-1" style={{ color: '#96A19C' }}>sua nota</span>
        </div>
        <input value={comment} onChange={(e) => setComment(e.target.value)}
          onBlur={() => myRating && onRate(item.id, myRating.score, comment)} placeholder="comentário (opcional)"
          className="w-full text-xs outline-none rounded-lg px-2.5 py-1.5" style={{ background: SAND, color: '#7A867F' }} />

        {ratingEntries.length > 0 && (
          <div className="mt-2 space-y-1">
            {ratingEntries.map(([name, r]) => (
              <div key={name} className="text-xs flex gap-1.5" style={{ color: '#7A867F' }}>
                <span className="font-medium" style={{ color: '#4A5651' }}>{name}</span>
                <span style={{ color: GOLD }}>{'★'.repeat(r.score)}</span>
                {r.comment && <span style={{ color: '#96A19C' }}>— {r.comment}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrcamentoTab({ expenses, members, myName, balances, settlements, totalSpent, onAdd, onEdit, onRemove, onToggleSplit }) {
  return (
    <div>
      <div className="rounded-2xl px-4 py-3 mb-4 flex items-center justify-between" style={{ background: JADE_TINT, border: `1px solid #BFE3D5` }}>
        <span className="text-sm" style={{ color: JADE_DARK }}>Total gasto pelo grupo</span>
        <span className="text-lg font-medium" style={{ color: JADE_DARK, fontFamily: "'Fraunces', serif" }}>R$ {brl(totalSpent)}</span>
      </div>

      {members.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {members.map((m) => {
            const b = balances[m] || { paid: 0, owed: 0 };
            const net = b.paid - b.owed;
            return (
              <div key={m} className="rounded-xl px-3 py-2.5 shadow-sm" style={{ background: 'white', border: `1px solid ${LINE}` }}>
                <div className="text-xs" style={{ color: '#96A19C' }}>{m}</div>
                <div className="text-sm font-medium" style={{ color: net >= 0 ? JADE_DARK : CORAL }}>
                  {net >= 0 ? '+' : '-'}R$ {brl(Math.abs(net))}
                </div>
                <div className="text-[11px]" style={{ color: '#96A19C' }}>pagou R$ {brl(b.paid)} · parte R$ {brl(b.owed)}</div>
              </div>
            );
          })}
        </div>
      )}

      {settlements.length > 0 && (
        <div className="rounded-xl px-4 py-3 mb-5" style={{ background: '#F5F7F5', border: `1px solid ${LINE}` }}>
          <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#8A968E' }}>Acertos sugeridos</div>
          <div className="space-y-1.5">
            {settlements.map((s, idx) => (
              <div key={idx} className="text-sm flex items-center gap-1.5" style={{ color: '#4A5651' }}>
                <span className="font-medium">{s.from}</span>
                <ChevronRight size={13} style={{ color: '#B7C1BC' }} />
                <span className="font-medium">{s.to}</span>
                <span className="ml-auto" style={{ color: '#96A19C' }}>R$ {brl(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {expenses.map((e) => {
          const installments = Math.max(1, Number(e.installments || 1));
          const perInstallment = Number(e.amount || 0) / installments;
          const splitCount = e.splitWith?.length || 1;
          const perPersonPerInstallment = perInstallment / splitCount;
          return (
            <div key={e.id} className="rounded-xl p-3.5 shadow-sm" style={{ background: 'white', border: `1px solid ${LINE}` }}>
              <div className="flex items-start gap-2 mb-2">
                <input value={e.description} onChange={(ev) => onEdit(e.id, { description: ev.target.value })}
                  className="flex-1 text-sm font-medium outline-none bg-transparent" style={{ color: INK }} />
                <span className="text-sm" style={{ color: '#96A19C' }}>R$</span>
                <input type="number" value={e.amount} onChange={(ev) => onEdit(e.id, { amount: Number(ev.target.value) })}
                  className="w-20 text-sm text-right rounded-lg px-1.5 py-1 outline-none" style={{ border: `1px solid ${LINE}` }} />
                <button onClick={() => onRemove(e.id)} style={{ color: '#C4CCC8' }} className="hover:!text-red-500 shrink-0 p-1.5 -m-1.5 active:scale-90 transition-transform">
                  <X size={15} />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs mb-2">
                <span style={{ color: '#96A19C' }}>pago por</span>
                <select value={e.paidBy} onChange={(ev) => onEdit(e.id, { paidBy: ev.target.value })}
                  className="rounded-md px-1.5 py-0.5 outline-none" style={{ border: `1px solid ${LINE}` }}>
                  {members.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <span className="ml-1" style={{ color: '#96A19C' }}>em</span>
                <input type="number" min={1} value={e.installments || 1}
                  onChange={(ev) => onEdit(e.id, { installments: Math.max(1, Number(ev.target.value)) })}
                  className="w-12 text-center rounded-md px-1 py-0.5 outline-none" style={{ border: `1px solid ${LINE}` }} />
                <span style={{ color: '#96A19C' }}>parcela{installments > 1 ? 's' : ''}</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs mb-2">
                <span style={{ color: '#96A19C' }}>dividido com</span>
                {members.map((m) => (
                  <button key={m} onClick={() => onToggleSplit(e.id, m)}
                    className="px-2 py-0.5 rounded-full"
                    style={e.splitWith?.includes(m)
                      ? { background: JADE, color: 'white', border: `1px solid ${JADE}` }
                      : { color: '#7A867F', border: `1px solid ${LINE}` }}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="text-xs rounded-lg px-2.5 py-1.5" style={{ background: SAND, color: '#4A5651' }}>
                {installments > 1 ? (
                  <>{installments}x de <span className="font-medium">R$ {brl(perInstallment)}</span> · cada pessoa paga{' '}
                    <span className="font-medium">R$ {brl(perPersonPerInstallment)}</span> por parcela</>
                ) : (
                  <>à vista · cada pessoa paga <span className="font-medium">R$ {brl(perPersonPerInstallment)}</span></>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onAdd} className="mt-3 flex items-center gap-1.5 text-sm font-medium" style={{ color: JADE_DARK }}>
        <Plus size={15} /> Adicionar gasto
      </button>
    </div>
  );
}
