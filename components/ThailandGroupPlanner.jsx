'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  MapPin, Plus, Trash2, Star, Users, Wallet, Route, Calendar,
  ChevronUp, ChevronDown, ChevronRight, ChevronLeft, X, Link as LinkIcon,
  Loader2, RefreshCw, List, CheckCircle2, AlertTriangle, Copy, Check, History
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

const PAYMENT_STATUS_LABEL = { paid: 'Pago', pending: 'Pendente', late: 'Em atraso' };
const PAYMENT_STATUS_COLOR = {
  paid: { bg: JADE_TINT, text: JADE_DARK },
  pending: { bg: '#FCF3E3', text: '#8A5A12' },
  late: { bg: CORAL_TINT, text: '#8A3418' },
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
function fmtLogTime(timestamp) {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${MONTHS_PT[d.getMonth()]} · ${hh}:${mm}`;
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
function buildCityColors(stops, overrides = {}) {
  const map = {};
  let i = 0;
  stops.forEach((s) => {
    if (!(s.city in map)) {
      const idx = overrides[s.city] != null ? overrides[s.city] : i;
      map[s.city] = CITY_PALETTE[((idx % CITY_PALETTE.length) + CITY_PALETTE.length) % CITY_PALETTE.length];
      if (overrides[s.city] == null) i += 1;
    }
  });
  return map;
}
function computeMonthlySchedule(expenses) {
  const months = {};
  expenses.forEach((e) => {
    if (!e.purchaseDate) return;
    const installments = Math.max(1, Number(e.installments || 1));
    const perInstallment = Number(e.amount || 0) / installments;
    const split = e.splitWith && e.splitWith.length ? e.splitWith : [];
    const perPersonPerInstallment = split.length ? perInstallment / split.length : 0;
    const [y, m] = e.purchaseDate.split('-').map(Number);
    for (let i = 0; i < installments; i++) {
      const d = new Date(y, (m - 1) + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { key, year: d.getFullYear(), month: d.getMonth(), perPerson: {}, total: 0 };
      months[key].total += perInstallment;
      split.forEach((name) => {
        months[key].perPerson[name] = (months[key].perPerson[name] || 0) + perPersonPerInstallment;
      });
    }
  });
  return Object.values(months).sort((a, b) => a.key.localeCompare(b.key));
}
function isoDateFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function accommodationsToExpenses(list, scheduled) {
  return list.map((item) => {
    const stop = scheduled.find((s) => s.city === item.city);
    const totalPrice = item.totalPrice ?? ((Number(item.dailyRate) || 0) * (Number(item.nights) || 0));
    return {
      id: `acc-${item.id}`,
      description: `Hospedagem: ${item.name} (${item.city})`,
      amount: Number(totalPrice) || 0,
      installments: 1,
      paidBy: null,
      splitWith: item.splitWith || [],
      purchaseDate: stop ? isoDateFromDate(stop.start) : null,
    };
  });
}
function activitiesToExpenses(list, scheduled) {
  return list.map((item) => {
    const stop = scheduled.find((s) => s.city === item.city);
    const guests = (item.splitWith && item.splitWith.length) || 0;
    const total = (Number(item.pricePerPerson) || 0) * guests;
    return {
      id: `act-${item.id}`,
      description: `Passeio: ${item.name} (${item.city})`,
      amount: total,
      installments: 1,
      paidBy: null,
      splitWith: item.splitWith || [],
      purchaseDate: stop ? isoDateFromDate(stop.start) : null,
    };
  });
}
function monthPaymentStatus(year, month, paid) {
  if (paid) return 'paid';
  const now = new Date();
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
  return now > monthEnd ? 'late' : 'pending';
}
function readAndCompressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const maxW = 640;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}
function cityAbbrev(city) {
  const words = (city || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return (words[0] || '').slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join('').toUpperCase().slice(0, 4);
}

function NumberField({ value, onChange, onCommit, className, style, min, step, placeholder }) {
  const toText = (v) => (v === 0 || v === undefined || v === null ? '' : String(v));
  const [text, setText] = useState(toText(value));
  const focusValueRef = useRef(value);

  useEffect(() => {
    setText((current) => (current !== '' && Number(current) === Number(value) ? current : toText(value)));
  }, [value]);

  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      placeholder={placeholder}
      value={text}
      onFocus={() => { focusValueRef.current = value; }}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        if (v === '' || v === '-') return;
        const n = Number(v);
        if (!Number.isNaN(n)) onChange(n);
      }}
      onBlur={() => {
        let finalValue = value;
        if (text === '' || text === '-') { setText(''); onChange(0); finalValue = 0; }
        else finalValue = Number(text);
        if (onCommit) {
          const before = Number(focusValueRef.current) || 0;
          if (before !== finalValue) onCommit(before, finalValue);
        }
      }}
      className={className}
      style={style}
    />
  );
}

function TextField({ value, onChange, onCommit, className, style, placeholder }) {
  const focusValueRef = useRef(value);
  return (
    <input
      value={value}
      placeholder={placeholder}
      onFocus={() => { focusValueRef.current = value; }}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => {
        if (onCommit && focusValueRef.current !== value) onCommit(focusValueRef.current, value);
      }}
      className={className}
      style={style}
    />
  );
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(28,42,39,0.45)' }} onClick={(e) => { e.stopPropagation(); onCancel(); }}>
      <div className="w-full max-w-xs rounded-2xl p-5 shadow-lg" style={{ background: 'white' }} onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-medium mb-1.5" style={{ color: INK }}>{title}</div>
        <p className="text-xs mb-4" style={{ color: '#7A867F' }}>{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-lg py-2 text-sm font-medium active:opacity-70 transition-opacity" style={{ border: `1px solid ${LINE}`, color: '#4A5651' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-lg py-2 text-sm font-medium text-white active:opacity-80 transition-opacity" style={{ background: CORAL }}>
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
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
  const [cityColorOverrides, setCityColorOverrides] = useState({});
  const [changeLog, setChangeLog] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState({});
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const personal = window.localStorage.getItem('my-name');
        if (personal) setMyName(personal);
      } catch {}
      const [m, it, ac, at, ex, cc, cl, ps] = await Promise.all([
        loadShared('members', []),
        loadShared('itinerary', DEFAULT_ITINERARY),
        loadShared('accommodations', []),
        loadShared('activities', []),
        loadShared('expenses', []),
        loadShared('cityColorOverrides', {}),
        loadShared('changeLog', []),
        loadShared('paymentStatus', {}),
      ]);
      setMembers(m);
      setItinerary(it);
      setAccommodations(ac);
      setActivities(at);
      setExpenses(ex);
      setCityColorOverrides(cc);
      setChangeLog(cl);
      setPaymentStatus(ps);
      setBooting(false);
    })();
  }, []);

  const refreshShared = useCallback(async () => {
    setSyncing(true);
    const [m, it, ac, at, ex, cc, cl, ps] = await Promise.all([
      loadShared('members', []),
      loadShared('itinerary', DEFAULT_ITINERARY),
      loadShared('accommodations', []),
      loadShared('activities', []),
      loadShared('expenses', []),
      loadShared('cityColorOverrides', {}),
      loadShared('changeLog', []),
      loadShared('paymentStatus', {}),
    ]);
    setMembers(m);
    setItinerary(it);
    setAccommodations(ac);
    setActivities(at);
    setExpenses(ex);
    setCityColorOverrides(cc);
    setChangeLog(cl);
    setPaymentStatus(ps);
    setSyncing(false);
  }, []);

  async function logChangeAs(who, message) {
    const entry = { id: uid(), timestamp: Date.now(), who, message };
    const next = [entry, ...changeLog].slice(0, 200);
    setChangeLog(next);
    await saveShared('changeLog', next);
  }
  function logChange(message) {
    return logChangeAs(myName, message);
  }

  async function confirmPayment(name, monthKey, monthLabel, proofDataUrl) {
    const key = `${name}__${monthKey}`;
    const next = { ...paymentStatus, [key]: { paid: true, proof: proofDataUrl, confirmedBy: myName, confirmedAt: Date.now() } };
    setPaymentStatus(next);
    await saveShared('paymentStatus', next);
    logChange(`anexou comprovante e marcou o pagamento de ${name} em ${monthLabel} como pago`);
  }
  async function removeProof(name, monthKey, monthLabel) {
    const key = `${name}__${monthKey}`;
    const next = { ...paymentStatus };
    delete next[key];
    setPaymentStatus(next);
    await saveShared('paymentStatus', next);
    logChange(`removeu o comprovante de pagamento de ${name} em ${monthLabel}`);
  }

  async function setCityColor(city, paletteIndex) {
    const next = { ...cityColorOverrides, [city]: paletteIndex };
    setCityColorOverrides(next);
    await saveShared('cityColorOverrides', next);
    logChange(`mudou a cor de "${city}"`);
  }

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
      logChangeAs(name, 'entrou no grupo');
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
    logChange('adicionou uma nova parada ao roteiro');
  }
  function editStop(id, patch) {
    updateItinerary(itinerary.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function logStopCityChange(city, oldCity, newCity) {
    logChange(`renomeou a parada "${oldCity}" para "${newCity}"`);
  }
  function logStopDaysChange(city, oldDays, newDays) {
    logChange(`alterou os dias de "${city}" de ${oldDays} para ${newDays}`);
  }
  function logStopPhaseChange(city, newPhase) {
    logChange(`mudou a fase de "${city}" para ${PHASE_LABEL[newPhase]}`);
  }
  function removeStop(id) {
    const stop = itinerary.find((s) => s.id === id);
    updateItinerary(itinerary.filter((s) => s.id !== id));
    if (stop) logChange(`removeu a parada "${stop.city}" do roteiro`);
  }
  function moveStop(id, dir) {
    const idx = itinerary.findIndex((s) => s.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= itinerary.length) return;
    const next = [...itinerary];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    updateItinerary(next);
    logChange(`reordenou "${next[swap].city}" no roteiro`);
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

  const cityColors = useMemo(() => buildCityColors(itinerary, cityColorOverrides), [itinerary, cityColorOverrides]);
  const memberCount = members.length || 1;

  function makeListHandlers(list, setList, storageKey, kindLabel) {
    async function update(next) { setList(next); await saveShared(storageKey, next); }
    function addItem(city, extra = {}) {
      update([...list, { id: uid(), city, name: 'Nova opção', link: '', notes: '', ratings: {}, ...extra }]);
      logChange(`adicionou uma nova ${kindLabel} em "${city}"`);
    }
    function removeItem(id) {
      const item = list.find((i) => i.id === id);
      update(list.filter((i) => i.id !== id));
      if (item) logChange(`removeu a ${kindLabel} "${item.name}" em "${item.city}"`);
    }
    function editItem(id, patch) { update(list.map((i) => (i.id === id ? { ...i, ...patch } : i))); }
    function rateItem(id, score, comment) {
      const item = list.find((i) => i.id === id);
      update(list.map((i) => (i.id === id ? { ...i, ratings: { ...i.ratings, [myName]: { score, comment } } } : i)));
      if (item) logChange(`avaliou "${item.name}" com ${score} estrela${score === 1 ? '' : 's'}`);
    }
    return { addItem, removeItem, editItem, rateItem };
  }
  const accHandlers = makeListHandlers(accommodations, setAccommodations, 'accommodations', 'hospedagem');
  const actHandlers = makeListHandlers(activities, setActivities, 'activities', 'passeio');

  async function updateExpenses(next) { setExpenses(next); await saveShared('expenses', next); }
  function addExpense() {
    updateExpenses([...expenses, {
      id: uid(), description: 'Novo gasto', amount: 0, installments: 1,
      paidBy: myName || members[0] || '', splitWith: members.length ? [...members] : [myName],
    }]);
    logChange('adicionou um novo gasto');
  }
  function editExpense(id, patch) { updateExpenses(expenses.map((e) => (e.id === id ? { ...e, ...patch } : e))); }
  function removeExpense(id) {
    const exp = expenses.find((e) => e.id === id);
    updateExpenses(expenses.filter((e) => e.id !== id));
    if (exp) logChange(`removeu o gasto "${exp.description}" (R$ ${brl(exp.amount)})`);
  }
  function toggleSplit(id, name) {
    const exp = expenses.find((e) => e.id === id);
    if (!exp) return;
    const has = exp.splitWith.includes(name);
    const next = has ? exp.splitWith.filter((n) => n !== name) : [...exp.splitWith, name];
    editExpense(id, { splitWith: next });
    logChange(has ? `removeu ${name} da divisão do gasto "${exp.description}"` : `incluiu ${name} na divisão do gasto "${exp.description}"`);
  }

  const combinedExpenses = useMemo(() => [
    ...expenses,
    ...accommodationsToExpenses(accommodations, scheduled),
    ...activitiesToExpenses(activities, scheduled),
  ], [expenses, accommodations, activities, scheduled]);

  const balances = useMemo(() => {
    const bal = {};
    members.forEach((m) => (bal[m] = { paid: 0, owed: 0 }));
    combinedExpenses.forEach((e) => {
      const amount = Number(e.amount || 0);
      const split = e.splitWith && e.splitWith.length ? e.splitWith : [];
      if (e.paidBy) {
        if (!bal[e.paidBy]) bal[e.paidBy] = { paid: 0, owed: 0 };
        bal[e.paidBy].paid += amount;
      }
      const share = split.length ? amount / split.length : 0;
      split.forEach((n) => { if (!bal[n]) bal[n] = { paid: 0, owed: 0 }; bal[n].owed += share; });
    });
    return bal;
  }, [members, combinedExpenses]);

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

  const totalSpent = useMemo(() => combinedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0), [combinedExpenses]);

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
    { key: 'logs', label: 'Logs', icon: History },
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
              onSetCityColor={setCityColor}
              onLogCityChange={logStopCityChange} onLogDaysChange={logStopDaysChange} onLogPhaseChange={logStopPhaseChange}
            />
          )}
          {tab === 'destinos' && (
            <DestinosTab itinerary={itinerary} accommodations={accommodations} activities={activities}
              myName={myName} members={members} accHandlers={accHandlers} actHandlers={actHandlers} cityColors={cityColors} onLog={logChange} />
          )}
          {tab === 'orcamento' && (
            <OrcamentoTab expenses={expenses} combinedExpenses={combinedExpenses} members={members} myName={myName} balances={balances}
              settlements={settlements} totalSpent={totalSpent} onAdd={addExpense} onEdit={editExpense}
              onRemove={removeExpense} onToggleSplit={toggleSplit} onLog={logChange}
              paymentStatus={paymentStatus} onConfirmPayment={confirmPayment} onRemoveProof={removeProof}
            />
          )}
          {tab === 'logs' && <LogsTab changeLog={changeLog} />}
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

function RoteiroTab({ itinerary, scheduled, totalsByPhase, tripEnd, cityColors, onAdd, onEdit, onRemove, onMove, onSetCityColor, onLogCityChange, onLogDaysChange, onLogPhaseChange }) {
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
        <ListaView itinerary={itinerary} scheduled={scheduled} cityColors={cityColors} onEdit={onEdit} onRemove={onRemove} onMove={onMove} onAdd={onAdd} onSetCityColor={onSetCityColor}
          onLogCityChange={onLogCityChange} onLogDaysChange={onLogDaysChange} onLogPhaseChange={onLogPhaseChange} />
      )}
      {view === 'calendario' && <CalendarioView scheduled={scheduled} tripEnd={tripEnd} cityColors={cityColors} />}
    </div>
  );
}

function ListaView({ itinerary, scheduled, cityColors, onEdit, onRemove, onMove, onAdd, onSetCityColor, onLogCityChange, onLogDaysChange, onLogPhaseChange }) {
  const [colorPickerId, setColorPickerId] = useState(null);
  const [confirmStop, setConfirmStop] = useState(null);

  return (
    <div>
      <div className="space-y-2">
        {itinerary.map((stop, idx) => {
          const sc = scheduled[idx];
          const c = cityColors[stop.city];
          const pickerOpen = colorPickerId === stop.id;
          return (
            <div key={stop.id} className="rounded-xl shadow-sm" style={{ background: 'white', border: `1px solid ${LINE}` }}>
              <div className="flex items-center gap-2 px-3 py-2.5">
                <div className="flex flex-col -my-1">
                  <button onClick={() => onMove(stop.id, -1)} disabled={idx === 0} style={{ color: '#C4CCC8' }} className="disabled:opacity-30 p-1 -m-1 active:scale-90 transition-transform">
                    <ChevronUp size={14} />
                  </button>
                  <button onClick={() => onMove(stop.id, 1)} disabled={idx === itinerary.length - 1} style={{ color: '#C4CCC8' }} className="disabled:opacity-30 p-1 -m-1 active:scale-90 transition-transform">
                    <ChevronDown size={14} />
                  </button>
                </div>

                <button onClick={() => setColorPickerId(pickerOpen ? null : stop.id)} title="Mudar cor da cidade" className="shrink-0 p-1 -m-1 active:scale-90 transition-transform">
                  <span className="block w-2.5 h-2.5 rounded-full" style={{ background: c.text }} />
                </button>

                <div className="flex-1 min-w-0">
                  <TextField value={stop.city} onChange={(v) => onEdit(stop.id, { city: v })}
                    onCommit={(oldV, newV) => onLogCityChange(stop.city, oldV, newV)}
                    className="w-full text-sm font-medium outline-none bg-transparent" style={{ color: INK }} />
                  {sc && <div className="text-[11px]" style={{ color: '#96A19C' }}>{fmtDate(sc.start)} – {fmtDate(sc.end)}</div>}
                </div>

                <select value={stop.phase} onChange={(e) => { onEdit(stop.id, { phase: e.target.value }); onLogPhaseChange(stop.city, e.target.value); }}
                  className="text-xs rounded-full px-2 py-1 outline-none"
                  style={{ background: PHASE_COLOR[stop.phase].bg, color: PHASE_COLOR[stop.phase].text, border: `1px solid ${PHASE_COLOR[stop.phase].border}` }}
                >
                  <option value="ferias">Férias</option>
                  <option value="workation">Workation</option>
                </select>

                <NumberField min={0} value={stop.days} onChange={(n) => onEdit(stop.id, { days: n })}
                  onCommit={(oldV, newV) => onLogDaysChange(stop.city, oldV, newV)}
                  className="w-14 text-sm text-center rounded-lg py-1 outline-none" style={{ border: `1px solid ${LINE}` }} />
                <span className="text-xs w-8" style={{ color: '#96A19C' }}>dias</span>

                <button onClick={() => setConfirmStop(stop)} style={{ color: '#C4CCC8' }} className="hover:!text-red-500 shrink-0 p-1.5 -m-1.5 active:scale-90 transition-transform">
                  <Trash2 size={15} />
                </button>
              </div>

              {pickerOpen && (
                <div className="flex items-center gap-2 flex-wrap px-3 pb-3">
                  {CITY_PALETTE.map((palette, i) => (
                    <button key={i} onClick={() => { onSetCityColor(stop.city, i); setColorPickerId(null); }}
                      className="w-6 h-6 rounded-full active:scale-90 transition-transform"
                      style={{ background: palette.text, boxShadow: c === palette ? `0 0 0 2px white, 0 0 0 3.5px ${INK}` : 'none' }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={onAdd} className="mt-3 flex items-center gap-1.5 text-sm font-medium py-1 active:opacity-60 transition-opacity" style={{ color: JADE_DARK }}>
        <Plus size={15} /> Adicionar parada
      </button>

      <ConfirmDialog
        open={!!confirmStop}
        title="Excluir parada?"
        message={confirmStop ? `Isso vai remover "${confirmStop.city}" do roteiro.` : ''}
        onCancel={() => setConfirmStop(null)}
        onConfirm={() => { onRemove(confirmStop.id); setConfirmStop(null); }}
      />
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

function DestinosTab({ itinerary, accommodations, activities, myName, members, accHandlers, actHandlers, cityColors, onLog }) {
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

  const selectedStop = itinerary.find((s) => s.city === selected);

  return (
    <div>
      <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm mb-4" style={{ color: '#7A867F' }}>
        <ChevronLeft size={15} /> Todos os destinos
      </button>
      <h2 className="text-lg mb-4" style={{ fontFamily: "'Fraunces', serif", color: INK }}>{selected}</h2>

      <CitySection title="Hospedagem" city={selected} type="accommodation" defaultNights={selectedStop?.days || 1}
        items={accommodations.filter((i) => i.city === selected)} myName={myName} members={members} onLog={onLog} {...accHandlers} />
      <div className="h-6" />
      <CitySection title="Passeios" city={selected} type="activity"
        items={activities.filter((i) => i.city === selected)} myName={myName} members={members} onLog={onLog} {...actHandlers} />
    </div>
  );
}

function CitySection({ title, city, type, defaultNights, items, myName, members, onLog, addItem, removeItem, editItem, rateItem }) {
  function handleAdd() {
    const extra = type === 'accommodation'
      ? { totalPrice: 0, nights: defaultNights, splitWith: members.length ? [...members] : [] }
      : { pricePerPerson: 0, splitWith: members.length ? [...members] : [] };
    addItem(city, extra);
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8A968E' }}>{title}</h3>
        <button onClick={handleAdd} className="flex items-center gap-1 text-xs font-medium py-1 active:opacity-60 transition-opacity" style={{ color: JADE_DARK }}>
          <Plus size={13} /> Adicionar
        </button>
      </div>
      {items.length === 0 && <p className="text-xs py-3" style={{ color: '#96A19C' }}>Nenhuma opção cadastrada ainda.</p>}
      <div className="space-y-3">
        {items.map((item) => (
          <OptionCard key={item.id} item={item} type={type} myName={myName} members={members} onEdit={editItem} onRemove={removeItem} onRate={rateItem} onLog={onLog} />
        ))}
      </div>
    </div>
  );
}

function OptionCard({ item, type, myName, members, onEdit, onRemove, onRate, onLog }) {
  const kindLabel = type === 'accommodation' ? 'hospedagem' : 'passeio';
  const ratingEntries = Object.entries(item.ratings || {});
  const avg = ratingEntries.length ? (ratingEntries.reduce((s, [, r]) => s + r.score, 0) / ratingEntries.length).toFixed(1) : null;
  const myRating = item.ratings?.[myName];
  const [comment, setComment] = useState(myRating?.comment || '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const split = item.splitWith || [];
  const guests = split.length;

  function toggleGuest(name) {
    const has = split.includes(name);
    const next = has ? split.filter((n) => n !== name) : [...split, name];
    onEdit(item.id, { splitWith: next });
    onLog(has ? `removeu ${name} da divisão da ${kindLabel} "${item.name}"` : `incluiu ${name} na divisão da ${kindLabel} "${item.name}"`);
  }

  const totalPrice = item.totalPrice ?? ((Number(item.dailyRate) || 0) * (Number(item.nights) || 0));
  const nights = Number(item.nights) || 0;
  const dailyRate = nights > 0 ? totalPrice / nights : 0;
  const perPersonPerNight = guests > 0 ? dailyRate / guests : 0;

  return (
    <div className="rounded-xl p-3.5 shadow-sm" style={{ background: 'white', border: `1px solid ${LINE}` }}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 space-y-1.5">
          <TextField value={item.name} onChange={(v) => onEdit(item.id, { name: v })}
            onCommit={(oldV, newV) => onLog(`renomeou a ${kindLabel} "${oldV}" para "${newV}"`)}
            className="w-full text-sm font-medium outline-none bg-transparent" style={{ color: INK }} />
          <div className="flex items-center gap-2">
            <LinkIcon size={12} className="shrink-0" style={{ color: '#C4CCC8' }} />
            <input value={item.link} onChange={(e) => onEdit(item.id, { link: e.target.value })}
              placeholder="link (Airbnb, Booking, GetYourGuide...)" className="flex-1 text-xs outline-none bg-transparent" style={{ color: '#7A867F' }} />
          </div>
          {type === 'accommodation' ? (
            <div style={{ color: '#7A867F' }}>
              <div className="flex items-center gap-1.5 text-xs flex-wrap">
                <span>R$</span>
                <NumberField value={totalPrice} onChange={(n) => onEdit(item.id, { totalPrice: n })}
                  onCommit={(oldV, newV) => onLog(`alterou o valor total da hospedagem "${item.name}" de R$ ${brl(oldV)} para R$ ${brl(newV)}`)}
                  placeholder="0" className="w-16 rounded-md px-1.5 py-0.5 outline-none" style={{ border: `1px solid ${LINE}` }} />
                <span>total ÷</span>
                <NumberField value={item.nights} onChange={(n) => onEdit(item.id, { nights: n })}
                  onCommit={(oldV, newV) => onLog(`alterou as noites de "${item.name}" de ${oldV} para ${newV}`)}
                  placeholder="0" className="w-10 rounded-md px-1.5 py-0.5 outline-none text-center" style={{ border: `1px solid ${LINE}` }} />
                <span>noites</span>
              </div>
              <div className="text-xs mt-1">
                = <span className="font-medium" style={{ color: INK }}>R$ {brl(dailyRate)}</span>/noite
                {guests > 0 && (
                  <> · <span className="font-medium" style={{ color: INK }}>R$ {brl(perPersonPerNight)}</span>/noite por pessoa ({guests} hóspede{guests === 1 ? '' : 's'})</>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap text-xs mt-1.5">
                <span>dividir com</span>
                {members.map((m) => (
                  <button key={m} onClick={() => toggleGuest(m)}
                    className="px-2 py-0.5 rounded-full active:scale-95 transition-transform"
                    style={split.includes(m) ? { background: JADE, color: 'white', border: `1px solid ${JADE}` } : { color: '#7A867F', border: `1px solid ${LINE}` }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: '#7A867F' }}>
              <div className="flex items-center gap-1.5 text-xs">
                <span>R$</span>
                <NumberField value={item.pricePerPerson} onChange={(n) => onEdit(item.id, { pricePerPerson: n })}
                  onCommit={(oldV, newV) => onLog(`alterou o valor por pessoa de "${item.name}" de R$ ${brl(oldV)} para R$ ${brl(newV)}`)}
                  placeholder="0" className="w-16 rounded-md px-1.5 py-0.5 outline-none" style={{ border: `1px solid ${LINE}` }} />
                <span>por pessoa</span>
              </div>
              {guests > 0 && (
                <div className="text-xs mt-1">
                  total <span className="font-medium" style={{ color: INK }}>R$ {brl((Number(item.pricePerPerson) || 0) * guests)}</span> ({guests} pessoa{guests === 1 ? '' : 's'})
                </div>
              )}
              <div className="flex items-center gap-1.5 flex-wrap text-xs mt-1.5">
                <span>quem vai</span>
                {members.map((m) => (
                  <button key={m} onClick={() => toggleGuest(m)}
                    className="px-2 py-0.5 rounded-full active:scale-95 transition-transform"
                    style={split.includes(m) ? { background: JADE, color: 'white', border: `1px solid ${JADE}` } : { color: '#7A867F', border: `1px solid ${LINE}` }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {avg && (
          <div className="flex items-center gap-1 text-xs font-medium rounded-full px-2 py-1 shrink-0" style={{ background: '#FBF2E1', color: GOLD }}>
            <Star size={11} fill="currentColor" /> {avg}
          </div>
        )}
        <button onClick={() => setConfirmOpen(true)} style={{ color: '#C4CCC8' }} className="hover:!text-red-500 shrink-0 p-1.5 -m-1.5 active:scale-90 transition-transform">
          <X size={15} />
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Excluir ${kindLabel}?`}
        message={`Isso vai remover "${item.name}" e seu valor não vai mais contar no orçamento.`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { onRemove(item.id); setConfirmOpen(false); }}
      />

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

function OrcamentoTab({ expenses, combinedExpenses, members, myName, balances, settlements, totalSpent, onAdd, onEdit, onRemove, onToggleSplit, onLog, paymentStatus, onConfirmPayment, onRemoveProof }) {
  const [confirmExpenseId, setConfirmExpenseId] = useState(null);
  const [personModal, setPersonModal] = useState(null);
  const schedule = useMemo(() => computeMonthlySchedule(combinedExpenses), [combinedExpenses]);
  const autoItems = useMemo(() => combinedExpenses.filter((e) => !e.paidBy), [combinedExpenses]);
  const confirmExpense = expenses.find((e) => e.id === confirmExpenseId);

  return (
    <div>
      <div className="rounded-2xl px-4 py-3 mb-4 flex items-center justify-between" style={{ background: JADE_TINT, border: `1px solid #BFE3D5` }}>
        <span className="text-sm" style={{ color: JADE_DARK }}>Total gasto pelo grupo</span>
        <span className="text-lg font-medium" style={{ color: JADE_DARK, fontFamily: "'Fraunces', serif" }}>R$ {brl(totalSpent)}</span>
      </div>

      {autoItems.length > 0 && (
        <div className="rounded-xl px-4 py-3 mb-4 shadow-sm" style={{ background: 'white', border: `1px solid ${LINE}` }}>
          <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#8A968E' }}>Hospedagens e passeios (de Destinos)</div>
          <div className="space-y-1.5">
            {autoItems.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-xs" style={{ color: '#4A5651' }}>
                <span>{e.description}</span>
                <span className="font-medium">R$ {brl(e.amount)}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-2" style={{ color: '#96A19C' }}>Editável na aba Destinos — já entra nos totais e no resumo abaixo.</p>
        </div>
      )}

      <MonthlySummary schedule={schedule} />

      {members.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {members.map((m) => {
            const b = balances[m] || { paid: 0, owed: 0 };
            const net = b.paid - b.owed;
            return (
              <button key={m} onClick={() => setPersonModal(m)}
                className="text-left rounded-xl px-3 py-2.5 shadow-sm active:opacity-70 transition-opacity" style={{ background: 'white', border: `1px solid ${LINE}` }}>
                <div className="text-xs" style={{ color: '#96A19C' }}>{m}</div>
                <div className="text-sm font-medium" style={{ color: net >= 0 ? JADE_DARK : CORAL }}>
                  {net >= 0 ? '+' : '-'}R$ {brl(Math.abs(net))}
                </div>
                <div className="text-[11px]" style={{ color: '#96A19C' }}>pagou R$ {brl(b.paid)} · parte R$ {brl(b.owed)}</div>
              </button>
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
                <TextField value={e.description} onChange={(v) => onEdit(e.id, { description: v })}
                  onCommit={(oldV, newV) => onLog(`renomeou o gasto "${oldV}" para "${newV}"`)}
                  className="flex-1 text-sm font-medium outline-none bg-transparent" style={{ color: INK }} />
                <span className="text-sm" style={{ color: '#96A19C' }}>R$</span>
                <NumberField value={e.amount} onChange={(n) => onEdit(e.id, { amount: n })}
                  onCommit={(oldV, newV) => onLog(`alterou o valor do gasto "${e.description}" de R$ ${brl(oldV)} para R$ ${brl(newV)}`)}
                  className="w-20 text-sm text-right rounded-lg px-1.5 py-1 outline-none" style={{ border: `1px solid ${LINE}` }} />
                <button onClick={() => setConfirmExpenseId(e.id)} style={{ color: '#C4CCC8' }} className="hover:!text-red-500 shrink-0 p-1.5 -m-1.5 active:scale-90 transition-transform">
                  <X size={15} />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs mb-2">
                <span style={{ color: '#96A19C' }}>pago por</span>
                <select value={e.paidBy} onChange={(ev) => { onEdit(e.id, { paidBy: ev.target.value }); onLog(`mudou quem pagou o gasto "${e.description}" para ${ev.target.value}`); }}
                  className="rounded-md px-1.5 py-0.5 outline-none" style={{ border: `1px solid ${LINE}` }}>
                  {members.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <span className="ml-1" style={{ color: '#96A19C' }}>em</span>
                <NumberField min={1} value={e.installments || 1}
                  onChange={(n) => onEdit(e.id, { installments: Math.max(1, n) })}
                  onCommit={(oldV, newV) => onLog(`alterou as parcelas do gasto "${e.description}" de ${oldV} para ${newV}`)}
                  className="w-12 text-center rounded-md px-1 py-0.5 outline-none" style={{ border: `1px solid ${LINE}` }} />
                <span style={{ color: '#96A19C' }}>parcela{installments > 1 ? 's' : ''}</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs mb-2">
                <span style={{ color: '#96A19C' }}>comprado em</span>
                <input type="date" value={e.purchaseDate || ''}
                  onChange={(ev) => { onEdit(e.id, { purchaseDate: ev.target.value }); onLog(`definiu a data de compra do gasto "${e.description}" para ${ev.target.value}`); }}
                  className="rounded-md px-1.5 py-0.5 outline-none" style={{ border: `1px solid ${LINE}`, color: e.purchaseDate ? INK : '#96A19C' }} />
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

      <button onClick={onAdd} className="mt-3 flex items-center gap-1.5 text-sm font-medium py-1 active:opacity-60 transition-opacity" style={{ color: JADE_DARK }}>
        <Plus size={15} /> Adicionar gasto
      </button>

      <ConfirmDialog
        open={!!confirmExpenseId}
        title="Excluir gasto?"
        message={confirmExpense ? `Isso vai remover "${confirmExpense.description}" (R$ ${brl(confirmExpense.amount)}).` : ''}
        onCancel={() => setConfirmExpenseId(null)}
        onConfirm={() => { onRemove(confirmExpenseId); setConfirmExpenseId(null); }}
      />

      {personModal && (
        <PersonMonthlyModal name={personModal} schedule={schedule} onClose={() => setPersonModal(null)}
          paymentStatus={paymentStatus} onConfirmPayment={onConfirmPayment} onRemoveProof={onRemoveProof} />
      )}
    </div>
  );
}

function PersonMonthlyModal({ name, schedule, onClose, paymentStatus, onConfirmPayment, onRemoveProof }) {
  const rows = schedule.filter((m) => m.perPerson[name] != null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [confirmRemoveKey, setConfirmRemoveKey] = useState(null);
  const [uploadingKey, setUploadingKey] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  async function handleFile(monthKey, monthLabel, file) {
    if (!file) return;
    setUploadError(null);
    setUploadingKey(monthKey);
    try {
      const dataUrl = await readAndCompressImage(file);
      await onConfirmPayment(name, monthKey, monthLabel, dataUrl);
    } catch (err) {
      setUploadError('Não deu para processar essa imagem, tenta outra.');
    } finally {
      setUploadingKey(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(28,42,39,0.45)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-5 shadow-lg max-h-[80vh] overflow-y-auto" style={{ background: 'white' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-base" style={{ fontFamily: "'Fraunces', serif", color: INK }}>{name} · por mês</div>
          <button onClick={onClose} style={{ color: '#C4CCC8' }} className="p-1 -m-1 active:scale-90 transition-transform"><X size={16} /></button>
        </div>
        {uploadError && <p className="text-xs mb-2" style={{ color: CORAL }}>{uploadError}</p>}
        {rows.length === 0 ? (
          <p className="text-xs" style={{ color: '#96A19C' }}>Nenhum valor com data definida ainda para {name}.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((m) => {
              const monthLabel = `${MONTHS_FULL_PT[m.month]} de ${m.year}`;
              const record = paymentStatus[`${name}__${m.key}`];
              const status = monthPaymentStatus(m.year, m.month, !!record?.paid);
              const sc = PAYMENT_STATUS_COLOR[status];
              return (
                <div key={m.key} className="rounded-lg px-3 py-2" style={{ background: SAND }}>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: '#4A5651' }}>{monthLabel}</span>
                    <span className="font-medium" style={{ color: INK }}>R$ {brl(m.perPerson[name])}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: sc.bg, color: sc.text }}>
                      {PAYMENT_STATUS_LABEL[status]}
                    </span>
                    {record?.paid ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setPreviewUrl(record.proof)} className="text-[11px] font-medium active:opacity-60 transition-opacity" style={{ color: JADE_DARK }}>
                          Ver comprovante
                        </button>
                        <button onClick={() => setConfirmRemoveKey(m.key)} className="text-[11px] active:opacity-60 transition-opacity" style={{ color: '#96A19C' }}>
                          Remover
                        </button>
                      </div>
                    ) : (
                      <label className="text-[11px] font-medium active:opacity-60 transition-opacity shrink-0" style={{ color: JADE_DARK, cursor: uploadingKey === m.key ? 'default' : 'pointer' }}>
                        {uploadingKey === m.key ? 'Enviando...' : 'Anexar comprovante'}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingKey === m.key}
                          onChange={(e) => { handleFile(m.key, monthLabel, e.target.files[0]); e.target.value = ''; }} />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); }}>
          <img src={previewUrl} alt="Comprovante de pagamento" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}

      <ConfirmDialog
        open={!!confirmRemoveKey}
        title="Remover comprovante?"
        message={confirmRemoveKey ? `Isso vai desfazer a confirmação de pagamento de ${name} em ${rows.find((r) => r.key === confirmRemoveKey) ? `${MONTHS_FULL_PT[rows.find((r) => r.key === confirmRemoveKey).month]} de ${rows.find((r) => r.key === confirmRemoveKey).year}` : ''}.` : ''}
        onCancel={() => setConfirmRemoveKey(null)}
        onConfirm={() => {
          const row = rows.find((r) => r.key === confirmRemoveKey);
          const monthLabel = row ? `${MONTHS_FULL_PT[row.month]} de ${row.year}` : confirmRemoveKey;
          onRemoveProof(name, confirmRemoveKey, monthLabel);
          setConfirmRemoveKey(null);
        }}
      />
    </div>
  );
}

function LogsTab({ changeLog }) {
  if (!changeLog.length) {
    return <p className="text-sm py-8 text-center" style={{ color: '#96A19C' }}>Nenhuma alteração registrada ainda.</p>;
  }
  return (
    <div>
      <p className="text-xs mb-3" style={{ color: '#96A19C' }}>Histórico de tudo que foi alterado no app, mais recente primeiro.</p>
      <div className="space-y-2">
        {changeLog.map((entry) => (
          <div key={entry.id} className="rounded-xl px-3.5 py-2.5 shadow-sm" style={{ background: 'white', border: `1px solid ${LINE}` }}>
            <div className="text-sm" style={{ color: INK }}>
              <span className="font-medium">{entry.who || 'Alguém'}</span> {entry.message}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: '#96A19C' }}>{fmtLogTime(entry.timestamp)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlySummary({ schedule }) {
  const [copied, setCopied] = useState(false);

  if (!schedule.length) return null;

  function buildShareText() {
    return schedule.map((m) => {
      const label = `${MONTHS_FULL_PT[m.month]} de ${m.year}`;
      const lines = Object.entries(m.perPerson).map(([name, amt]) => `  ${name}: R$ ${brl(amt)}`).join('\n');
      return `${label} (total R$ ${brl(m.total)})\n${lines}`;
    }).join('\n\n');
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar', err);
    }
  }

  return (
    <div className="rounded-xl px-4 py-3 mb-4 shadow-sm" style={{ background: 'white', border: `1px solid ${LINE}` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8A968E' }}>Resumo mensal por pessoa</div>
        <button onClick={handleCopy} className="flex items-center gap-1 text-xs font-medium active:opacity-60 transition-opacity" style={{ color: JADE_DARK }}>
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <div className="space-y-3">
        {schedule.map((m) => (
          <div key={m.key}>
            <div className="text-xs font-medium mb-1 flex items-center justify-between" style={{ color: INK }}>
              <span>{MONTHS_FULL_PT[m.month]} de {m.year}</span>
              <span style={{ color: '#96A19C', fontWeight: 400 }}>total R$ {brl(m.total)}</span>
            </div>
            <div className="space-y-0.5">
              {Object.entries(m.perPerson).map(([name, amt]) => (
                <div key={name} className="flex items-center justify-between text-xs" style={{ color: '#4A5651' }}>
                  <span>{name}</span>
                  <span className="font-medium">R$ {brl(amt)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] mt-3" style={{ color: '#96A19C' }}>
        Baseado na data de compra e no número de parcelas de cada gasto — preencha "comprado em" nos gastos abaixo para aparecer aqui.
      </p>
    </div>
  );
}
