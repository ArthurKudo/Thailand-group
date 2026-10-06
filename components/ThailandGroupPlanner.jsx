'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  MapPin, Plus, Trash2, Star, Users, Wallet, Route, Calendar,
  ChevronUp, ChevronDown, ChevronRight, ChevronLeft, X, Link as LinkIcon,
  Loader2, RefreshCw, List, CheckCircle2, AlertTriangle, Copy, Check, History, Plane
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
const FUTURE_PAYMENT_START = new Date(2026, 8, 1); // 1ª parcela dos pagamentos futuros: set/2026 (fixo, não desliza com a data de hoje)

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
function stopsForDate(date, scheduled) {
  return scheduled.filter((s) => date >= s.start && date <= s.end);
}
function uniqueDateCount(stops) {
  const set = new Set();
  stops.forEach((s) => {
    let d = new Date(s.start);
    while (d <= s.end) {
      set.add(isoDateFromDate(d));
      d = addDays(d, 1);
    }
  });
  return set.size;
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
    const payer = e.paidBy;
    const [y, m] = e.purchaseDate.split('-').map(Number);
    for (let i = 0; i < installments; i++) {
      const d = new Date(y, m + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { key, year: d.getFullYear(), month: d.getMonth(), perPerson: {}, total: 0, pairwise: {} };
      months[key].total += perInstallment;
      split.forEach((name) => {
        months[key].perPerson[name] = (months[key].perPerson[name] || 0) + perPersonPerInstallment;
        if (payer && name !== payer) {
          if (!months[key].pairwise[name]) months[key].pairwise[name] = {};
          months[key].pairwise[name][payer] = (months[key].pairwise[name][payer] || 0) + perPersonPerInstallment;
        }
      });
    }
  });
  return Object.values(months).sort((a, b) => a.key.localeCompare(b.key));
}
function monthlyNetBalances(m) {
  const names = new Set(Object.keys(m.perPerson));
  Object.keys(m.pairwise || {}).forEach((debtor) => {
    names.add(debtor);
    Object.keys(m.pairwise[debtor]).forEach((creditor) => names.add(creditor));
  });
  const transfers = netPairwiseSettlements(m.pairwise);
  return Array.from(names).map((name) => {
    const received = transfers.filter((t) => t.to === name).reduce((s, t) => s + t.amount, 0);
    const paid = transfers.filter((t) => t.from === name).reduce((s, t) => s + t.amount, 0);
    return { name, net: received - paid };
  });
}
function netPairwiseSettlements(pairwise) {
  const result = [];
  const seen = new Set();
  Object.keys(pairwise || {}).forEach((a) => {
    Object.keys(pairwise[a] || {}).forEach((b) => {
      const pairKey = [a, b].sort().join('|');
      if (seen.has(pairKey)) return;
      seen.add(pairKey);
      const aOwesB = pairwise[a]?.[b] || 0;
      const bOwesA = pairwise[b]?.[a] || 0;
      const net = aOwesB - bOwesA;
      if (net > 0.01) result.push({ from: a, to: b, amount: net });
      else if (net < -0.01) result.push({ from: b, to: a, amount: -net });
    });
  });
  return result.sort((x, y) => y.amount - x.amount);
}
function isoDateFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function paidBeforeFutureAmount(item) {
  return item.futurePayment ? Number(item.paidBeforeFuture?.amount) || 0 : 0;
}
function paidBeforeFutureExpense(item, base) {
  const amount = paidBeforeFutureAmount(item);
  if (!amount || !item.paidBeforeFuture.month) return [];
  const [y, m] = item.paidBeforeFuture.month.split('-').map(Number);
  return [{
    ...base,
    id: `${base.id}-pago-antes`,
    description: `${base.description} (parcela já paga antes de virar futuro)`,
    amount,
    installments: 1,
    purchaseDate: isoDateFromDate(new Date(y, m - 2, 1)),
    isFuturePayment: false,
  }];
}
function accommodationsToExpenses(list, scheduled) {
  return list.filter((item) => item.addedToBudget).flatMap((item) => {
    const stop = scheduled.find((s) => s.city === item.city);
    const totalPrice = item.totalPrice ?? ((Number(item.dailyRate) || 0) * (Number(item.nights) || 0));
    const base = {
      id: `acc-${item.id}`,
      city: item.city,
      kind: 'hospedagem',
      description: `Hospedagem: ${item.name} (${item.city})`,
      amount: (Number(totalPrice) || 0) - paidBeforeFutureAmount(item),
      installments: Math.max(1, Number(item.installments) || 1),
      paidBy: item.paidBy || null,
      splitWith: item.splitWith || [],
      purchaseDate: item.purchaseDate || (stop ? isoDateFromDate(stop.start) : null),
      isFuturePayment: !!item.futurePayment,
    };
    return [base, ...paidBeforeFutureExpense(item, base)];
  });
}
function nextMonthKey() {
  const d = new Date();
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}
function futureItemTotal(item, kind) {
  const full = kind === 'hospedagem'
    ? item.totalPrice ?? ((Number(item.dailyRate) || 0) * (Number(item.nights) || 0))
    : (Number(item.pricePerPerson) || 0) * ((item.splitWith && item.splitWith.length) || 0);
  return (Number(full) || 0) - paidBeforeFutureAmount(item);
}
function activitiesToExpenses(list, scheduled) {
  return list.filter((item) => item.addedToBudget).flatMap((item) => {
    const stop = scheduled.find((s) => s.city === item.city);
    const guests = (item.splitWith && item.splitWith.length) || 0;
    const total = (Number(item.pricePerPerson) || 0) * guests;
    const base = {
      id: `act-${item.id}`,
      city: item.city,
      kind: 'passeio',
      description: `Passeio: ${item.name} (${item.city})`,
      amount: total - paidBeforeFutureAmount(item),
      installments: Math.max(1, Number(item.installments) || 1),
      paidBy: item.paidBy || null,
      splitWith: item.splitWith || [],
      purchaseDate: item.purchaseDate || (stop ? isoDateFromDate(stop.start) : null),
      isFuturePayment: !!item.futurePayment,
    };
    return [base, ...paidBeforeFutureExpense(item, base)];
  });
}
function futurePaymentPlan(item) {
  if (!item.futurePayment || !item.futurePaymentDate || !item.paidBy) return null;
  const total = Number(item.total) || 0;
  if (!total) return null;
  const [sy, sm] = (item.futurePaymentStart || '').split('-').map(Number);
  const itemStart = sy && sm ? new Date(sy, sm - 1, 1) : FUTURE_PAYMENT_START;
  const nowStart = itemStart > FUTURE_PAYMENT_START ? itemStart : FUTURE_PAYMENT_START;
  const [dy, dm] = item.futurePaymentDate.split('-').map(Number);
  if (!dy || !dm) return null;
  const deadlineStart = new Date(dy, dm - 1, 1);
  const count = Math.max(1, (deadlineStart.getFullYear() - nowStart.getFullYear()) * 12 + (deadlineStart.getMonth() - nowStart.getMonth()) + 1);
  return { total, nowStart, count };
}
function monthKeyOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function buildPixLedger(regularExpenses, futureItems) {
  const entries = [];
  regularExpenses.forEach((e) => {
    if (!e.purchaseDate || !e.paidBy) return;
    const split = e.splitWith && e.splitWith.length ? e.splitWith : [];
    if (!split.length) return;
    const installments = Math.max(1, Number(e.installments || 1));
    const perPerson = Number(e.amount || 0) / installments / split.length;
    const [y, m] = e.purchaseDate.split('-').map(Number);
    const label = e.description.replace(/^(Hospedagem|Passeio): /, '');
    for (let i = 0; i < installments; i++) {
      const d = new Date(y, m + i, 1);
      split.forEach((name) => {
        if (name === e.paidBy) return;
        entries.push({ key: monthKeyOf(d), from: name, to: e.paidBy, amount: perPerson, label, kind: 'normal', installment: i + 1, installments });
      });
    }
  });
  futureItems.forEach((item) => {
    const plan = futurePaymentPlan(item);
    if (!plan) return;
    const split = item.splitWith && item.splitWith.length ? item.splitWith : [];
    if (!split.length) return;
    const perPerson = plan.total / plan.count / split.length;
    for (let i = 0; i < plan.count; i++) {
      const d = new Date(plan.nowStart.getFullYear(), plan.nowStart.getMonth() + i, 1);
      split.forEach((name) => {
        if (name === item.paidBy) return;
        entries.push({ key: monthKeyOf(d), from: name, to: item.paidBy, amount: perPerson, label: item.name, kind: 'futuro', installment: i + 1, installments: plan.count });
      });
    }
  });
  return entries;
}
function computeFuturePaymentSchedule(items) {
  const months = {};
  items.forEach((item) => {
    const plan = futurePaymentPlan(item);
    if (!plan) return;
    const { total, nowStart, count } = plan;
    const split = item.splitWith && item.splitWith.length ? item.splitWith : [];
    const perInstallment = total / count;
    const perPersonPerInstallment = split.length ? perInstallment / split.length : 0;
    for (let i = 0; i < count; i++) {
      const d = new Date(nowStart.getFullYear(), nowStart.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { key, year: d.getFullYear(), month: d.getMonth(), total: 0, perPerson: {}, guard: {}, pairwise: {} };
      months[key].total += perInstallment;
      split.forEach((name) => {
        months[key].perPerson[name] = (months[key].perPerson[name] || 0) + perPersonPerInstallment;
        if (name === item.paidBy) {
          months[key].guard[name] = (months[key].guard[name] || 0) + perPersonPerInstallment;
        } else {
          if (!months[key].pairwise[name]) months[key].pairwise[name] = {};
          months[key].pairwise[name][item.paidBy] = (months[key].pairwise[name][item.paidBy] || 0) + perPersonPerInstallment;
        }
      });
    }
  });
  return Object.values(months).sort((a, b) => a.key.localeCompare(b.key));
}
function computeBalances(expenseList, members) {
  const bal = {};
  members.forEach((m) => (bal[m] = { paid: 0, owed: 0 }));
  expenseList.forEach((e) => {
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
}
function computePersonBreakdown(destinoExpenses, expenses, futureItems, members, itinerary) {
  const data = {};
  function ensure(name) {
    if (!data[name]) data[name] = { hospedagem: 0, passeio: 0, outras: 0, futuros: 0, futurosHospedagem: 0, futurosPasseio: 0, alimentacao: 0, paid: 0 };
  }
  members.forEach(ensure);

  const foodPerPerson = (itinerary || []).reduce((sum, stop) => sum + (Number(stop.foodPerDay) || 0) * (Number(stop.days) || 0), 0);
  if (foodPerPerson > 0) {
    members.forEach((name) => { ensure(name); data[name].alimentacao = foodPerPerson; });
  }

  destinoExpenses.forEach((e) => {
    if (e.isFuturePayment) return;
    const split = e.splitWith && e.splitWith.length ? e.splitWith : [];
    const share = split.length ? Number(e.amount || 0) / split.length : 0;
    split.forEach((name) => {
      ensure(name);
      if (e.kind === 'hospedagem') data[name].hospedagem += share;
      else data[name].passeio += share;
    });
    if (e.paidBy) { ensure(e.paidBy); data[e.paidBy].paid += Number(e.amount || 0); }
  });

  expenses.forEach((e) => {
    const split = e.splitWith && e.splitWith.length ? e.splitWith : [];
    const share = split.length ? Number(e.amount || 0) / split.length : 0;
    split.forEach((name) => { ensure(name); data[name].outras += share; });
    if (e.paidBy) { ensure(e.paidBy); data[e.paidBy].paid += Number(e.amount || 0); }
  });

  futureItems.forEach((item) => {
    const split = item.splitWith && item.splitWith.length ? item.splitWith : [];
    const total = Number(item.total) || 0;
    const share = split.length ? total / split.length : 0;
    split.forEach((name) => {
      ensure(name);
      data[name].futuros += share;
      if (item.kind === 'hospedagem') data[name].futurosHospedagem += share;
      else data[name].futurosPasseio += share;
    });
  });

  return data;
}
function computeSettlements(balances) {
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
}
function getPaymentRecord(paymentStatus, domain, name, monthKey, counterparty) {
  const scopedKey = counterparty ? `${domain}__${name}__${monthKey}__${counterparty}` : `${domain}__${name}__${monthKey}`;
  if (paymentStatus[scopedKey]) return { key: scopedKey, record: paymentStatus[scopedKey] };
  const legacyKey = `${name}__${monthKey}`;
  if (paymentStatus[legacyKey]) return { key: legacyKey, record: paymentStatus[legacyKey] };
  return { key: scopedKey, record: null };
}
function applySettledAmounts(balances, schedule, paymentStatus, domain) {
  const next = {};
  Object.entries(balances).forEach(([name, b]) => { next[name] = { ...b }; });
  schedule.forEach((m) => {
    Object.keys(m.perPerson).forEach((name) => {
      const { record } = getPaymentRecord(paymentStatus, domain, name, m.key);
      if (record?.paid) {
        if (!next[name]) next[name] = { paid: 0, owed: 0 };
        next[name].owed = Math.max(0, next[name].owed - m.perPerson[name]);
      }
    });
  });
  return next;
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

function CopyPixButton({ pixKey }) {
  const [copied, setCopied] = useState(false);
  if (!pixKey) return null;
  async function handleCopy(e) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar', err);
    }
  }
  return (
    <button onClick={handleCopy} title={`Copiar chave Pix: ${pixKey}`}
      className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full shrink-0 active:opacity-60 transition-opacity"
      style={{ color: JADE_DARK, background: copied ? JADE_TINT : SAND }}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />} {copied ? 'Copiado' : 'Pix'}
    </button>
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
  const [futureDone, setFutureDone] = useState({});
  const [pixKeys, setPixKeys] = useState({});
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const personal = window.localStorage.getItem('my-name');
        if (personal) setMyName(personal);
      } catch {}
      const [m, it, ac, at, ex, cc, cl, ps, fd, pk] = await Promise.all([
        loadShared('members', []),
        loadShared('itinerary', DEFAULT_ITINERARY),
        loadShared('accommodations', []),
        loadShared('activities', []),
        loadShared('expenses', []),
        loadShared('cityColorOverrides', {}),
        loadShared('changeLog', []),
        loadShared('paymentStatus', {}),
        loadShared('futureDone', {}),
        loadShared('pixKeys', {}),
      ]);
      setMembers(m);
      setItinerary(it);
      setAccommodations(ac);
      setActivities(at);
      setExpenses(ex);
      setCityColorOverrides(cc);
      setChangeLog(cl);
      setPaymentStatus(ps);
      setFutureDone(fd);
      setPixKeys(pk);
      setBooting(false);
    })();
  }, []);

  const refreshShared = useCallback(async () => {
    setSyncing(true);
    const [m, it, ac, at, ex, cc, cl, ps, fd, pk] = await Promise.all([
      loadShared('members', []),
      loadShared('itinerary', DEFAULT_ITINERARY),
      loadShared('accommodations', []),
      loadShared('activities', []),
      loadShared('expenses', []),
      loadShared('cityColorOverrides', {}),
      loadShared('changeLog', []),
      loadShared('paymentStatus', {}),
      loadShared('futureDone', {}),
      loadShared('pixKeys', {}),
    ]);
    setMembers(m);
    setItinerary(it);
    setAccommodations(ac);
    setActivities(at);
    setExpenses(ex);
    setCityColorOverrides(cc);
    setChangeLog(cl);
    setPaymentStatus(ps);
    setFutureDone(fd);
    setPixKeys(pk);
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

  async function confirmPayment(domain, name, monthKey, monthLabel, proofDataUrl, counterparty) {
    const key = counterparty ? `${domain}__${name}__${monthKey}__${counterparty}` : `${domain}__${name}__${monthKey}`;
    const next = { ...paymentStatus, [key]: { paid: true, proof: proofDataUrl, confirmedBy: myName, confirmedAt: Date.now() } };
    setPaymentStatus(next);
    await saveShared('paymentStatus', next);
    const domainLabel = domain === 'viagem' ? 'viagem' : domain === 'geral' ? 'despesa geral' : domain === 'futuro' ? 'pix futuro' : domain === 'saldo' ? 'pix único' : 'total';
    logChange(counterparty
      ? `anexou comprovante do pix de ${name} pra ${counterparty} em ${monthLabel} (${domainLabel})`
      : `anexou comprovante e marcou o pagamento de ${name} em ${monthLabel} (${domainLabel}) como pago`);
  }
  async function removeProof(domain, name, monthKey, monthLabel, counterparty) {
    const { key } = getPaymentRecord(paymentStatus, domain, name, monthKey, counterparty);
    const next = { ...paymentStatus };
    delete next[key];
    setPaymentStatus(next);
    await saveShared('paymentStatus', next);
    logChange(`removeu o comprovante de pagamento de ${name} em ${monthLabel}`);
  }
  async function toggleFutureDone(name, monthKey, monthLabel) {
    const key = `${name}__${monthKey}`;
    const next = { ...futureDone };
    if (next[key]) delete next[key];
    else next[key] = true;
    setFutureDone(next);
    await saveShared('futureDone', next);
    logChange(next[key]
      ? `marcou o pagamento futuro de ${name} em ${monthLabel} como feito`
      : `desmarcou o pagamento futuro de ${name} em ${monthLabel}`);
  }

  async function setPixKey(name, key) {
    const next = { ...pixKeys, [name]: key };
    setPixKeys(next);
    await saveShared('pixKeys', next);
    logChange(key ? `atualizou a chave Pix de ${name}` : `removeu a chave Pix de ${name}`);
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
      cursor = new Date(end);
      return { ...s, start, end };
    });
  }, [itinerary]);

  const tripEnd = scheduled.length ? scheduled[scheduled.length - 1].end : TRIP_START;

  const totalsByPhase = useMemo(() => {
    const byPhase = {};
    scheduled.forEach((s) => { (byPhase[s.phase] = byPhase[s.phase] || []).push(s); });
    const totals = {};
    Object.entries(byPhase).forEach(([phase, stops]) => { totals[phase] = uniqueDateCount(stops); });
    return totals;
  }, [scheduled]);

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

  const destinoExpenses = useMemo(() => [
    ...accommodationsToExpenses(accommodations, scheduled),
    ...activitiesToExpenses(activities, scheduled),
  ], [accommodations, activities, scheduled]);

  const destinoExpensesForBalances = useMemo(
    () => destinoExpenses.filter((e) => !e.isFuturePayment),
    [destinoExpenses]
  );

  const destinoSchedule = useMemo(() => computeMonthlySchedule(destinoExpensesForBalances), [destinoExpensesForBalances]);
  const geralSchedule = useMemo(() => computeMonthlySchedule(expenses), [expenses]);

  const futureItems = useMemo(() => [
    ...accommodations.filter((a) => a.futurePayment && a.addedToBudget).map((a) => ({ ...a, kind: 'hospedagem', total: futureItemTotal(a, 'hospedagem') })),
    ...activities.filter((a) => a.futurePayment && a.addedToBudget).map((a) => ({ ...a, kind: 'passeio', total: futureItemTotal(a, 'passeio') })),
  ], [accommodations, activities]);
  const futureSchedule = useMemo(() => computeFuturePaymentSchedule(futureItems), [futureItems]);
  const pixLedger = useMemo(
    () => buildPixLedger([...destinoExpensesForBalances, ...expenses.map((e) => ({ ...e, description: e.description || 'Gasto' }))], futureItems),
    [destinoExpensesForBalances, expenses, futureItems]
  );

  const destinoBalances = useMemo(() => {
    const raw = computeBalances(destinoExpensesForBalances, members);
    return applySettledAmounts(raw, destinoSchedule, paymentStatus, 'viagem');
  }, [destinoExpensesForBalances, members, destinoSchedule, paymentStatus]);

  const geralBalances = useMemo(() => {
    const raw = computeBalances(expenses, members);
    return applySettledAmounts(raw, geralSchedule, paymentStatus, 'geral');
  }, [expenses, members, geralSchedule, paymentStatus]);

  const geralSettlements = useMemo(() => computeSettlements(geralBalances), [geralBalances]);

  const destinoTotal = useMemo(() => destinoExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0), [destinoExpenses]);
  const geralTotal = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0), [expenses]);

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
          <CountdownBanner />
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
              activities={activities} onEditActivity={actHandlers.editItem} onLog={logChange}
              onAdd={addStop} onEdit={editStop} onRemove={removeStop} onMove={moveStop}
              onSetCityColor={setCityColor}
              onLogCityChange={logStopCityChange} onLogDaysChange={logStopDaysChange} onLogPhaseChange={logStopPhaseChange}
            />
          )}
          {tab === 'destinos' && (
            <DestinosTab itinerary={itinerary} scheduled={scheduled} accommodations={accommodations} activities={activities}
              myName={myName} members={members} accHandlers={accHandlers} actHandlers={actHandlers} cityColors={cityColors} onLog={logChange}
              onEditStop={editStop} />
          )}
          {tab === 'orcamento' && (
            <OrcamentoTab expenses={expenses} members={members} itinerary={itinerary}
              destinoExpenses={destinoExpenses} destinoSchedule={destinoSchedule} destinoBalances={destinoBalances}
              destinoTotal={destinoTotal}
              geralSchedule={geralSchedule} geralBalances={geralBalances} geralSettlements={geralSettlements} geralTotal={geralTotal}
              onEditActivity={actHandlers.editItem} onEditAccommodation={accHandlers.editItem}
              futureItems={futureItems} futureSchedule={futureSchedule} pixLedger={pixLedger}
              futureDone={futureDone} onToggleFutureDone={toggleFutureDone}
              pixKeys={pixKeys} onSetPixKey={setPixKey}
              onAdd={addExpense} onEdit={editExpense}
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

function CountdownBanner() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const diffMs = TRIP_START - now;
  const started = diffMs <= 0;
  const totalSec = Math.max(0, Math.floor(diffMs / 1000));
  const units = [
    { label: 'dias', value: Math.floor(totalSec / 86400) },
    { label: 'horas', value: Math.floor((totalSec % 86400) / 3600) },
    { label: 'min', value: Math.floor((totalSec % 3600) / 60) },
    { label: 'seg', value: totalSec % 60 },
  ];
  const tripDay = daysBetween(TRIP_START, new Date(now.getFullYear(), now.getMonth(), now.getDate())) + 1;
  const [days, hours, mins, secs] = units.map((u) => u.value);
  const pad = (n) => String(n).padStart(2, '0');
  const progress = started ? 100 : Math.min(96, Math.max(4, (1 - totalSec / (365 * 86400)) * 100));
  const departureLabel = `${WEEKDAYS_PT[TRIP_START.getDay()]}, ${fmtDate(TRIP_START)} ${TRIP_START.getFullYear()}`;

  return (
    <div className="relative overflow-hidden rounded-3xl px-5 pt-4 pb-5 shadow-sm"
      style={{ background: `linear-gradient(150deg, #0F7F62 0%, ${JADE} 45%, #064A3A 100%)`, color: 'white' }}>
      <div className="absolute rounded-full pointer-events-none"
        style={{ width: 220, height: 220, top: -110, right: -70, background: 'radial-gradient(circle, rgba(244,196,106,0.55) 0%, rgba(244,196,106,0) 70%)' }} />
      <div className="absolute rounded-full pointer-events-none"
        style={{ width: 160, height: 160, bottom: -90, left: -50, background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)' }} />

      <div className="relative">
        <div className="flex items-end justify-between text-[11px] tracking-wide" style={{ color: 'rgba(255,255,255,0.75)' }}>
          <div>
            <div className="text-base font-medium leading-none" style={{ color: 'white', letterSpacing: 1 }}>GRU</div>
            <div className="mt-1">São Paulo</div>
          </div>
          <div className="text-right">
            <div className="text-base font-medium leading-none" style={{ color: 'white', letterSpacing: 1 }}>BKK</div>
            <div className="mt-1">Bangkok</div>
          </div>
        </div>

        <div className="relative h-5 my-2">
          <div className="absolute left-0 right-0 top-1/2" style={{ borderTop: '1.5px dashed rgba(255,255,255,0.35)' }} />
          <div className="absolute left-0 top-1/2 h-[1.5px] -translate-y-px" style={{ width: `${progress}%`, background: 'rgba(255,255,255,0.9)' }} />
          <span className="absolute top-1/2 w-2 h-2 -translate-y-1/2 rounded-full" style={{ left: 0, background: 'white' }} />
          <span className="absolute top-1/2 w-2 h-2 -translate-y-1/2 rounded-full" style={{ right: 0, border: '1.5px solid white' }} />
          <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full"
            style={{ left: `${progress}%`, background: 'white', color: JADE_DARK, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
            <Plane size={13} style={{ transform: 'rotate(45deg)' }} />
          </span>
        </div>

        {started ? (
          <div className="mt-3">
            <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.75)' }}>Já estamos na Tailândia</div>
            <div className="text-4xl mt-1" style={{ fontFamily: "'Fraunces', serif" }}>Dia {tripDay}</div>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-3 mt-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.75)' }}>Faltam</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="leading-none" style={{ fontFamily: "'Fraunces', serif", fontSize: 52, fontVariantNumeric: 'tabular-nums' }}>{days}</span>
                <span className="text-lg" style={{ fontFamily: "'Fraunces', serif", color: 'rgba(255,255,255,0.85)' }}>dia{days === 1 ? '' : 's'}</span>
              </div>
            </div>
            <div className="flex items-start gap-1 pb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {[[hours, 'h'], [mins, 'min'], [secs, 's']].map(([v, l], idx) => (
                <React.Fragment key={l}>
                  {idx > 0 && <span className="text-xl leading-none" style={{ color: 'rgba(255,255,255,0.5)' }}>:</span>}
                  <div className="text-center">
                    <div className="text-xl leading-none font-medium">{pad(v)}</div>
                    <div className="text-[9px] uppercase tracking-wide mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>{l}</div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 flex items-center justify-between text-[11px]" style={{ borderTop: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}>
          <span>Embarque · {departureLabel}</span>
          <span>Tailândia em grupo</span>
        </div>
      </div>
    </div>
  );
}

function RoteiroTab({ itinerary, scheduled, totalsByPhase, tripEnd, cityColors, activities, onEditActivity, onLog, onAdd, onEdit, onRemove, onMove, onSetCityColor, onLogCityChange, onLogDaysChange, onLogPhaseChange }) {
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
          activities={activities} onEditActivity={onEditActivity} onLog={onLog}
          onLogCityChange={onLogCityChange} onLogDaysChange={onLogDaysChange} onLogPhaseChange={onLogPhaseChange} />
      )}
      {view === 'calendario' && <CalendarioView scheduled={scheduled} tripEnd={tripEnd} cityColors={cityColors} />}
    </div>
  );
}

function ListaView({ itinerary, scheduled, cityColors, activities, onEditActivity, onLog, onEdit, onRemove, onMove, onAdd, onSetCityColor, onLogCityChange, onLogDaysChange, onLogPhaseChange }) {
  const [colorPickerId, setColorPickerId] = useState(null);
  const [confirmStop, setConfirmStop] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div>
      <div className="space-y-2">
        {itinerary.map((stop, idx) => {
          const sc = scheduled[idx];
          const c = cityColors[stop.city];
          const pickerOpen = colorPickerId === stop.id;
          const expanded = expandedId === stop.id;
          return (
            <div key={stop.id} className="rounded-xl shadow-sm px-3 py-2.5" style={{ background: 'white', border: `1px solid ${LINE}` }}>
              <div className="flex items-center gap-2">
                <div className="flex flex-col -my-1 shrink-0">
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
                </div>

                <button onClick={() => setConfirmStop(stop)} style={{ color: '#C4CCC8' }} className="hover:!text-red-500 shrink-0 p-1.5 -m-1.5 active:scale-90 transition-transform">
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-1.5 pl-1">
                {sc && <span className="text-[11px] shrink-0" style={{ color: '#96A19C' }}>{fmtDate(sc.start)} – {fmtDate(sc.end)}</span>}
                <select value={stop.phase} onChange={(e) => { onEdit(stop.id, { phase: e.target.value }); onLogPhaseChange(stop.city, e.target.value); }}
                  className="text-[11px] rounded-full px-1.5 py-0.5 outline-none ml-auto shrink-0"
                  style={{ background: PHASE_COLOR[stop.phase].bg, color: PHASE_COLOR[stop.phase].text, border: `1px solid ${PHASE_COLOR[stop.phase].border}` }}
                >
                  <option value="ferias">Férias</option>
                  <option value="workation">Workation</option>
                </select>

                <NumberField min={0} value={stop.days} onChange={(n) => onEdit(stop.id, { days: n })}
                  onCommit={(oldV, newV) => onLogDaysChange(stop.city, oldV, newV)}
                  className="w-10 text-xs text-center rounded-lg py-0.5 outline-none shrink-0" style={{ border: `1px solid ${LINE}` }} />
                <span className="text-[11px] shrink-0" style={{ color: '#96A19C' }}>dias</span>
              </div>

              {pickerOpen && (
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  {CITY_PALETTE.map((palette, i) => (
                    <button key={i} onClick={() => { onSetCityColor(stop.city, i); setColorPickerId(null); }}
                      className="w-6 h-6 rounded-full active:scale-90 transition-transform"
                      style={{ background: palette.text, boxShadow: c === palette ? `0 0 0 2px white, 0 0 0 3.5px ${INK}` : 'none' }}
                    />
                  ))}
                </div>
              )}

              <button onClick={() => setExpandedId(expanded ? null : stop.id)}
                className="w-full flex items-center justify-center gap-1 text-[11px] font-medium mt-2 pt-2 active:opacity-60 transition-opacity"
                style={{ color: JADE_DARK, borderTop: `1px solid ${LINE}` }}
              >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded ? 'Ocultar atividades por dia' : 'Planejar atividades por dia'}
              </button>

              {expanded && (
                <div className="mt-2 space-y-2">
                  {Array.from({ length: Math.max(0, Number(stop.days) || 0) }).map((_, dayIdx) => {
                    const date = sc ? addDays(sc.start, dayIdx) : null;
                    const dateKey = date ? isoDateFromDate(date) : String(dayIdx);
                    const dayNotes = stop.dayNotes || {};
                    const cityActivities = activities.filter((a) => a.city === stop.city);
                    return (
                      <div key={dateKey} className="rounded-lg px-2.5 py-2" style={{ background: SAND }}>
                        <div className="text-[11px] font-medium mb-1" style={{ color: '#4A5651' }}>
                          {date ? fmtDate(date) : `Dia ${dayIdx + 1}`}
                        </div>
                        <textarea
                          value={dayNotes[dateKey] || ''}
                          onChange={(e) => onEdit(stop.id, { dayNotes: { ...dayNotes, [dateKey]: e.target.value } })}
                          placeholder="O que vamos fazer nesse dia..."
                          rows={2}
                          className="w-full text-xs rounded-md px-2 py-1.5 outline-none resize-none"
                          style={{ border: `1px solid ${LINE}`, background: 'white', color: INK }}
                        />

                        {cityActivities.length > 0 ? (
                          <div className="mt-1.5 space-y-1">
                            {cityActivities.map((a) => {
                              const attached = a.date === dateKey;
                              return (
                                <button key={a.id}
                                  onClick={() => {
                                    onEditActivity(a.id, { date: attached ? null : dateKey });
                                    onLog(attached
                                      ? `desvinculou o passeio "${a.name}" do dia ${date ? fmtDate(date) : dayIdx + 1}`
                                      : `atrelou o passeio "${a.name}" ao dia ${date ? fmtDate(date) : dayIdx + 1} em "${stop.city}"`);
                                  }}
                                  className="w-full flex items-center gap-1.5 text-xs rounded-md px-2 py-1 text-left active:opacity-70 transition-opacity"
                                  style={attached
                                    ? { background: JADE_TINT, color: JADE_DARK, border: `1px solid #BFE3D5` }
                                    : { background: 'white', color: '#7A867F', border: `1px solid ${LINE}` }}
                                >
                                  <span className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0" style={{ border: `1px solid ${attached ? JADE_DARK : LINE}`, background: attached ? JADE_DARK : 'white' }}>
                                    {attached && <Check size={10} color="white" />}
                                  </span>
                                  <span className="flex-1 truncate">{a.name}</span>
                                  {a.date && !attached && (
                                    <span className="text-[10px] shrink-0" style={{ color: '#96A19C' }}>outro dia</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] mt-1.5" style={{ color: '#96A19C' }}>
                            Nenhum passeio cadastrado em {stop.city} ainda. Adicione na aba Destinos.
                          </p>
                        )}
                      </div>
                    );
                  })}
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
      <div className="flex items-center gap-1.5 mb-1.5 text-xs" style={{ color: '#7A867F' }}>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ border: `2px dashed ${CORAL}` }} />
        Contorno tracejado = prazo das férias (02 mar)
      </div>
      <div className="flex items-center gap-1.5 mb-4 text-xs" style={{ color: '#7A867F' }}>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: `linear-gradient(135deg, ${JADE_TINT} 50%, ${SAND} 50%)`, border: `1px solid ${LINE}` }} />
        Dia dividido = saída de uma cidade e chegada na outra
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
              const stops = stopsForDate(date, scheduled);
              const isTransition = stops.length > 1;
              const isDeadline = isSameDay(date, FERIAS_DEADLINE);
              const stop = stops[0];
              const c = stop ? cityColors[stop.city] : null;
              const c2 = isTransition ? cityColors[stops[1].city] : null;
              return (
                <div
                  key={di}
                  title={isTransition ? `${stops[0].city} → ${stops[1].city}` : stop ? stop.city : undefined}
                  className="rounded-lg flex flex-col items-center justify-center gap-0.5 py-1"
                  style={{
                    minHeight: 40,
                    background: isTransition ? `linear-gradient(135deg, ${c.bg} 50%, ${c2.bg} 50%)` : c ? c.bg : 'transparent',
                    color: c ? c.text : '#C4CCC8',
                    border: isDeadline ? `2px dashed ${CORAL}` : c ? `1px solid ${c.border}` : '1px solid transparent',
                  }}
                >
                  <span className="text-xs font-medium leading-none">{date.getDate()}</span>
                  {isTransition ? (
                    <span className="text-[7px] font-medium leading-none uppercase tracking-wide truncate max-w-full px-0.5">
                      {cityAbbrev(stops[0].city)}/{cityAbbrev(stops[1].city)}
                    </span>
                  ) : stop && (
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

function cityCostSummary(stop, accommodations, activities, membersCount) {
  const city = stop?.city;
  const accs = accommodations.filter((i) => i.city === city);
  const acts = activities.filter((i) => i.city === city);
  const accTotal = accs.reduce((sum, i) => sum + (Number(i.totalPrice ?? ((Number(i.dailyRate) || 0) * (Number(i.nights) || 0))) || 0), 0);
  const actTotal = acts.reduce((sum, i) => sum + (Number(i.pricePerPerson) || 0) * (i.splitWith?.length || 0), 0);
  const foodTotal = (Number(stop?.foodPerDay) || 0) * (Number(stop?.days) || 0) * membersCount;
  const total = accTotal + actTotal + foodTotal;
  const perPerson = membersCount > 0 ? total / membersCount : total;
  return { accCount: accs.length, actCount: acts.length, accTotal, actTotal, foodTotal, total, perPerson };
}

function DestinosTab({ itinerary, scheduled, accommodations, activities, myName, members, accHandlers, actHandlers, cityColors, onLog, onEditStop }) {
  const [selected, setSelected] = useState(null);
  const membersCount = members.length || 1;

  if (!selected) {
    return (
      <div className="space-y-2">
        {itinerary.map((stop, idx) => {
          const summary = cityCostSummary(stop, accommodations, activities, membersCount);
          const c = cityColors[stop.city];
          const sc = scheduled[idx];
          return (
            <button key={stop.id} onClick={() => setSelected(stop.city)}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 shadow-sm transition-colors active:opacity-70 text-left"
              style={{ background: 'white', border: `1px solid ${LINE}` }}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.text }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: INK }}>{stop.city}</span>
                  {sc && <span className="text-[11px] shrink-0" style={{ color: '#96A19C' }}>{fmtDate(sc.start)} – {fmtDate(sc.end)}</span>}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#96A19C' }}>
                  {stop.days} dias · {summary.accCount} hospedage{summary.accCount === 1 ? 'm' : 'ns'} · {summary.actCount} passeio{summary.actCount === 1 ? '' : 's'}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#7A867F' }}>
                  hospedagem R$ {brl(summary.accTotal)} · passeios R$ {brl(summary.actTotal)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-medium" style={{ color: INK }}>R$ {brl(summary.total)}</div>
                <div className="text-[11px]" style={{ color: '#96A19C' }}>R$ {brl(summary.perPerson)}/pessoa</div>
              </div>
              <ChevronRight size={16} style={{ color: '#C4CCC8' }} />
            </button>
          );
        })}
      </div>
    );
  }

  const selectedIdx = itinerary.findIndex((s) => s.city === selected);
  const selectedStop = itinerary[selectedIdx];
  const selectedSc = scheduled[selectedIdx];
  const summary = cityCostSummary(selectedStop, accommodations, activities, membersCount);

  return (
    <div>
      <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm mb-4" style={{ color: '#7A867F' }}>
        <ChevronLeft size={15} /> Todos os destinos
      </button>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg" style={{ fontFamily: "'Fraunces', serif", color: INK }}>{selected}</h2>
        {selectedSc && <span className="text-xs" style={{ color: '#96A19C' }}>{fmtDate(selectedSc.start)} – {fmtDate(selectedSc.end)}</span>}
      </div>

      <div className="rounded-2xl px-4 py-3 mb-5" style={{ background: JADE_TINT, border: '1px solid #BFE3D5' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm" style={{ color: JADE_DARK }}>Total em {selected}</span>
          <span className="text-lg font-medium" style={{ color: JADE_DARK, fontFamily: "'Fraunces', serif" }}>R$ {brl(summary.total)}</span>
        </div>
        <div className="flex items-center justify-between text-xs mb-2" style={{ color: '#4A8A73' }}>
          <span>Hospedagem: R$ {brl(summary.accTotal)}</span>
          <span>Passeios: R$ {brl(summary.actTotal)}</span>
          <span>Alimentação: R$ {brl(summary.foodTotal)}</span>
        </div>
        <div className="flex items-center justify-between text-xs pt-2" style={{ color: JADE_DARK, borderTop: '1px solid #BFE3D5' }}>
          <span>Por pessoa (total)</span>
          <span className="font-medium">R$ {brl(summary.perPerson)}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs mt-2.5 pt-2.5" style={{ borderTop: '1px solid #BFE3D5', color: JADE_DARK }}>
          <span>Alimentação por pessoa/dia</span>
          <span>R$</span>
          <NumberField min={0} value={selectedStop?.foodPerDay || 0}
            onChange={(n) => onEditStop(selectedStop.id, { foodPerDay: n })}
            onCommit={(oldV, newV) => onLog(`alterou o custo de alimentação por dia em "${selected}" de R$ ${brl(oldV)} para R$ ${brl(newV)}`)}
            className="w-20 text-center rounded-md px-1.5 py-0.5 outline-none" style={{ border: '1px solid #BFE3D5', background: 'white', color: INK }} />
        </div>
      </div>

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
  const [confirmRemoveBudget, setConfirmRemoveBudget] = useState(false);
  const [choosingPayer, setChoosingPayer] = useState(false);
  const [choosingFuturePayment, setChoosingFuturePayment] = useState(false);
  const [budgetDate, setBudgetDate] = useState(item.purchaseDate || '');
  const [budgetInstallments, setBudgetInstallments] = useState(item.installments || 1);
  const [futureDate, setFutureDate] = useState(item.futurePaymentDate || '');
  const split = item.splitWith || [];
  const guests = split.length;

  function addToBudget(payer) {
    const patch = { addedToBudget: true, futurePayment: false, futurePaymentDate: null, futurePaymentStart: null, paidBeforeFuture: null, paidBy: payer, installments: Math.max(1, Number(budgetInstallments) || 1) };
    if (budgetDate) patch.purchaseDate = budgetDate;
    onEdit(item.id, patch);
    onLog(`adicionou a ${kindLabel} "${item.name}" às despesas (pago por ${payer})`);
    setChoosingPayer(false);
  }
  function addFuturePayment(responsible) {
    onEdit(item.id, { addedToBudget: true, futurePayment: true, paidBy: responsible, futurePaymentDate: futureDate || null, futurePaymentStart: nextMonthKey(), paidBeforeFuture: null, purchaseDate: null });
    onLog(`marcou a ${kindLabel} "${item.name}" como pagamento futuro (${responsible} guarda até ${futureDate || 'data a definir'})`);
    setChoosingFuturePayment(false);
  }
  function removeFromBudget() {
    onEdit(item.id, { addedToBudget: false, futurePayment: false, futurePaymentDate: null, futurePaymentStart: null, paidBeforeFuture: null, paidBy: null });
    onLog(`removeu a ${kindLabel} "${item.name}" das despesas`);
    setConfirmRemoveBudget(false);
  }

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
            <LinkIcon size={12} className="shrink-0" style={{ color: item.link ? JADE_DARK : '#C4CCC8' }} />
            <input value={item.link} onChange={(e) => onEdit(item.id, { link: e.target.value })}
              placeholder="link (Airbnb, Booking, GetYourGuide...)" className="flex-1 text-xs outline-none bg-transparent" style={{ color: '#7A867F' }} />
            {item.link && (
              <a href={item.link} target="_blank" rel="noopener noreferrer"
                className="shrink-0 text-xs font-medium px-2.5 py-1.5 -my-1.5 rounded-full active:opacity-60 transition-opacity"
                style={{ background: JADE_TINT, color: JADE_DARK }}>
                Abrir
              </a>
            )}
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

          {item.addedToBudget && item.futurePayment ? (
            <div className="rounded-lg px-2.5 py-2 mt-1.5 space-y-1.5" style={{ background: JADE_TINT, color: JADE_DARK }}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span>Pagamento futuro · {item.paidBy} guarda</span>
                <button onClick={() => setConfirmRemoveBudget(true)} className="font-medium underline active:opacity-60 transition-opacity shrink-0">
                  Remover
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span>até</span>
                <input type="date" value={item.futurePaymentDate || ''}
                  onChange={(e) => { onEdit(item.id, { futurePaymentDate: e.target.value }); onLog(`alterou a data do pagamento futuro da ${kindLabel} "${item.name}" para ${e.target.value}`); }}
                  className="rounded-md px-1.5 py-0.5 outline-none" style={{ border: '1px solid #BFE3D5', background: 'white', color: INK }} />
              </div>
            </div>
          ) : item.addedToBudget ? (
            <div className="rounded-lg px-2.5 py-2 mt-1.5 space-y-1.5" style={{ background: JADE_TINT, color: JADE_DARK }}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span>Nas despesas · pago por {item.paidBy}</span>
                <button onClick={() => setConfirmRemoveBudget(true)} className="font-medium underline active:opacity-60 transition-opacity shrink-0">
                  Remover
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span>comprado em</span>
                <input type="date" value={item.purchaseDate || ''}
                  onChange={(e) => { onEdit(item.id, { purchaseDate: e.target.value }); onLog(`definiu a data de compra da ${kindLabel} "${item.name}" para ${e.target.value}`); }}
                  className="rounded-md px-1.5 py-0.5 outline-none" style={{ border: '1px solid #BFE3D5', background: 'white', color: INK }} />
                <span>em</span>
                <NumberField min={1} value={item.installments || 1}
                  onChange={(n) => onEdit(item.id, { installments: Math.max(1, n) })}
                  onCommit={(oldV, newV) => onLog(`alterou as parcelas da ${kindLabel} "${item.name}" de ${oldV} para ${newV}`)}
                  className="w-10 text-center rounded-md px-1 py-0.5 outline-none" style={{ border: '1px solid #BFE3D5', background: 'white', color: INK }} />
                <span>parcela{(Number(item.installments) || 1) > 1 ? 's' : ''}</span>
              </div>
            </div>
          ) : choosingPayer ? (
            <div className="rounded-lg p-2.5 mt-1.5 space-y-2" style={{ background: SAND }}>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span style={{ color: '#7A867F' }}>Comprado em</span>
                <input type="date" value={budgetDate} onChange={(e) => setBudgetDate(e.target.value)}
                  className="rounded-md px-1.5 py-0.5 outline-none" style={{ border: `1px solid ${LINE}`, background: 'white' }} />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span style={{ color: '#7A867F' }}>Parcelas</span>
                <NumberField min={1} value={budgetInstallments} onChange={setBudgetInstallments}
                  className="w-12 text-center rounded-md px-1 py-0.5 outline-none" style={{ border: `1px solid ${LINE}`, background: 'white' }} />
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{ color: '#7A867F' }}>Quem pagou?</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {members.map((m) => (
                    <button key={m} onClick={() => addToBudget(m)}
                      className="px-2 py-0.5 rounded-full text-xs active:scale-95 transition-transform"
                      style={{ border: `1px solid ${LINE}`, color: '#4A5651', background: 'white' }}
                    >
                      {m}
                    </button>
                  ))}
                  <button onClick={() => setChoosingPayer(false)} className="text-xs active:opacity-60 transition-opacity" style={{ color: '#96A19C' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : choosingFuturePayment ? (
            <div className="rounded-lg p-2.5 mt-1.5 space-y-2" style={{ background: SAND }}>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span style={{ color: '#7A867F' }}>Guardar o dinheiro até</span>
                <input type="date" value={futureDate} onChange={(e) => setFutureDate(e.target.value)}
                  className="rounded-md px-1.5 py-0.5 outline-none" style={{ border: `1px solid ${LINE}`, background: 'white' }} />
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{ color: '#7A867F' }}>Quem vai guardar/pagar?</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {members.map((m) => (
                    <button key={m} onClick={() => addFuturePayment(m)}
                      className="px-2 py-0.5 rounded-full text-xs active:scale-95 transition-transform"
                      style={{ border: `1px solid ${LINE}`, color: '#4A5651', background: 'white' }}
                    >
                      {m}
                    </button>
                  ))}
                  <button onClick={() => setChoosingFuturePayment(false)} className="text-xs active:opacity-60 transition-opacity" style={{ color: '#96A19C' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 mt-1.5">
              <button onClick={() => setChoosingPayer(true)} className="flex items-center gap-1 text-xs font-medium active:opacity-60 transition-opacity" style={{ color: JADE_DARK }}>
                <Wallet size={12} /> Adicionar às despesas
              </button>
              <button onClick={() => setChoosingFuturePayment(true)} className="flex items-center gap-1 text-xs font-medium active:opacity-60 transition-opacity" style={{ color: '#7A867F' }}>
                <Wallet size={12} /> Pagamento futuro
              </button>
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

      <ConfirmDialog
        open={confirmRemoveBudget}
        title="Remover das despesas?"
        message={`"${item.name}" vai parar de contar no orçamento do grupo.`}
        onCancel={() => setConfirmRemoveBudget(false)}
        onConfirm={removeFromBudget}
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

function OrcamentoTab({
  expenses, members, itinerary,
  destinoExpenses, destinoSchedule, destinoBalances, destinoTotal,
  geralSchedule, geralBalances, geralSettlements, geralTotal,
  onEditActivity, onEditAccommodation, futureItems, futureSchedule, pixLedger, futureDone, onToggleFutureDone,
  pixKeys, onSetPixKey,
  onAdd, onEdit, onRemove, onToggleSplit, onLog,
  paymentStatus, onConfirmPayment, onRemoveProof,
}) {
  const [section, setSection] = useState('dashboard');
  const sections = [
    { key: 'dashboard', label: 'Resumo' },
    { key: 'geral', label: 'Outras' },
    { key: 'futuros', label: 'Futuros' },
  ];

  return (
    <div>
      <div className="inline-flex rounded-full p-1 mb-4 flex-wrap" style={{ background: '#EEF2EF' }}>
        {sections.map((s) => {
          const active = section === s.key;
          return (
            <button key={s.key} onClick={() => setSection(s.key)}
              className="text-xs px-3 py-1.5 rounded-full transition-colors"
              style={{ background: active ? 'white' : 'transparent', color: active ? JADE_DARK : '#7A867F', fontWeight: active ? 500 : 400, boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {section === 'dashboard' && (
        <ResumoSection
          destinoExpenses={destinoExpenses} expenses={expenses} futureItems={futureItems} members={members} itinerary={itinerary}
          destinoTotal={destinoTotal} geralTotal={geralTotal}
          destinoSchedule={destinoSchedule} geralSchedule={geralSchedule} futureSchedule={futureSchedule} pixLedger={pixLedger}
          destinoBalances={destinoBalances} geralBalances={geralBalances}
          futureDone={futureDone} onToggleFutureDone={onToggleFutureDone}
          pixKeys={pixKeys} onSetPixKey={onSetPixKey}
          paymentStatus={paymentStatus} onConfirmPayment={onConfirmPayment} onRemoveProof={onRemoveProof}
        />
      )}
      {section === 'geral' && (
        <GeralSection
          expenses={expenses} totalSpent={geralTotal}
          balances={geralBalances} settlements={geralSettlements} schedule={geralSchedule}
          members={members} onAdd={onAdd} onEdit={onEdit} onRemove={onRemove} onToggleSplit={onToggleSplit} onLog={onLog}
          pixKeys={pixKeys}
          paymentStatus={paymentStatus} onConfirmPayment={onConfirmPayment} onRemoveProof={onRemoveProof}
        />
      )}
      {section === 'futuros' && (
        <FuturosSection items={futureItems} schedule={futureSchedule} members={members}
          onEditActivity={onEditActivity} onEditAccommodation={onEditAccommodation} onLog={onLog}
          pixKeys={pixKeys}
          futureDone={futureDone} onToggleFutureDone={onToggleFutureDone} />
      )}
    </div>
  );
}

function FuturosSection({ items, schedule, members, onEditActivity, onEditAccommodation, onLog, pixKeys, futureDone, onToggleFutureDone }) {
  const grandTotal = items.reduce((sum, a) => sum + (Number(a.total) || 0), 0);
  const [confirmRemoveTarget, setConfirmRemoveTarget] = useState(null);

  const personTotals = useMemo(() => {
    const t = {};
    function ensure(name) { if (!t[name]) t[name] = { own: 0, received: 0, pay: 0 }; }
    schedule.forEach((m) => {
      Object.entries(m.guard || {}).forEach(([name, amt]) => {
        ensure(name);
        t[name].own += amt;
      });
      Object.entries(m.pairwise || {}).forEach(([debtor, creditors]) => {
        ensure(debtor);
        Object.entries(creditors).forEach(([creditor, amt]) => {
          t[debtor].pay += amt;
          ensure(creditor);
          t[creditor].received += amt;
        });
      });
    });
    return t;
  }, [schedule]);
  const peopleWithTotals = members.filter((m) => personTotals[m] && (personTotals[m].own > 0 || personTotals[m].pay > 0 || personTotals[m].received > 0));

  function removeFuturePayment(item) {
    const editFn = item.kind === 'hospedagem' ? onEditAccommodation : onEditActivity;
    editFn(item.id, { futurePayment: false, futurePaymentDate: null, futurePaymentStart: null, paidBeforeFuture: null, addedToBudget: false, paidBy: null });
    onLog(`removeu o pagamento futuro d${item.kind === 'hospedagem' ? 'a hospedagem' : 'o passeio'} "${item.name}"`);
    setConfirmRemoveTarget(null);
  }

  return (
    <div>
      <div className="rounded-2xl px-4 py-3 mb-4 flex items-center justify-between" style={{ background: JADE_TINT, border: `1px solid #BFE3D5` }}>
        <span className="text-sm" style={{ color: JADE_DARK }}>Total em pagamentos futuros</span>
        <span className="text-lg font-medium" style={{ color: JADE_DARK, fontFamily: "'Fraunces', serif" }}>R$ {brl(grandTotal)}</span>
      </div>

      {peopleWithTotals.length > 0 && (
        <div className="space-y-2 mb-5">
          {peopleWithTotals.map((name) => {
            const t = personTotals[name];
            return (
              <FuturosPersonCard key={name} name={name} schedule={schedule} total={t.own + t.received + t.pay} owes={t.pay > 0}
                futureDone={futureDone} onToggleFutureDone={onToggleFutureDone} />
            );
          })}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: '#96A19C' }}>
          Nenhum pagamento futuro ainda. Em Destinos, marque uma hospedagem ou passeio como "Pagamento futuro".
        </p>
      ) : (
        <div className="space-y-2 mb-5">
          {items.map((item) => {
            const total = Number(item.total) || 0;
            return (
              <div key={`${item.kind}-${item.id}`} className="rounded-xl px-3.5 py-3 shadow-sm" style={{ background: 'white', border: `1px solid ${LINE}` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: INK }}>{item.name}</span>
                  <span className="text-sm font-medium shrink-0" style={{ color: INK }}>R$ {brl(total)}</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#7A867F' }}>
                  {item.kind === 'hospedagem' ? 'Hospedagem' : 'Passeio'} · {item.city} · {item.paidBy} guarda até {item.futurePaymentDate ? fmtDate(parseISODate(item.futurePaymentDate)) : '—'}
                  {item.futurePaymentStart && item.futurePaymentStart > '2026-09' ? ` · parcelas desde ${MONTHS_PT[Number(item.futurePaymentStart.slice(5, 7)) - 1]}/${item.futurePaymentStart.slice(2, 4)}` : ''}
                  {paidBeforeFutureAmount(item) > 0 ? ` · R$ ${brl(paidBeforeFutureAmount(item))} já pago em ${MONTHS_PT[Number(item.paidBeforeFuture.month.slice(5, 7)) - 1]}/${item.paidBeforeFuture.month.slice(2, 4)} (fora do futuro)` : ''}
                </div>
                <button onClick={() => setConfirmRemoveTarget(item)} className="text-[11px] mt-1.5 active:opacity-60 transition-opacity" style={{ color: '#96A19C' }}>
                  Remover pagamento futuro
                </button>
              </div>
            );
          })}
        </div>
      )}

      <MonthlySummaryFuturos schedule={schedule} pixKeys={pixKeys} />

      <ConfirmDialog
        open={!!confirmRemoveTarget}
        title="Remover pagamento futuro?"
        message={confirmRemoveTarget ? `"${confirmRemoveTarget.name}" deixa de ser um pagamento futuro (não sai das despesas).` : ''}
        onCancel={() => setConfirmRemoveTarget(null)}
        onConfirm={() => removeFuturePayment(confirmRemoveTarget)}
      />
    </div>
  );
}

function FuturosPersonCard({ name, schedule, total, owes, futureDone, onToggleFutureDone }) {
  const [expanded, setExpanded] = useState(false);
  const rows = schedule.filter((m) =>
    (m.guard && m.guard[name] != null) ||
    (m.pairwise && m.pairwise[name] != null) ||
    Object.values(m.pairwise || {}).some((c) => c[name] != null)
  );
  const doneCount = rows.filter((m) => futureDone && futureDone[`${name}__${m.key}`]).length;

  return (
    <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: 'white', border: `1px solid ${LINE}` }}>
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left active:opacity-70 transition-opacity">
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0" style={{ background: JADE_TINT, color: JADE_DARK }}>
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium" style={{ color: INK }}>{name}</div>
          {rows.length > 0 && (
            <div className="text-[11px]" style={{ color: doneCount === rows.length ? JADE_DARK : '#96A19C' }}>
              {doneCount}/{rows.length} mes{rows.length === 1 ? '' : 'es'} feito{doneCount === rows.length && rows.length ? 's ✓' : 's'}
            </div>
          )}
        </div>
        <span className="text-sm font-medium shrink-0" style={{ color: owes ? CORAL : JADE_DARK }}>R$ {brl(total)}</span>
        {expanded ? <ChevronUp size={16} className="shrink-0" style={{ color: '#96A19C' }} /> : <ChevronDown size={16} className="shrink-0" style={{ color: '#96A19C' }} />}
      </button>

      {expanded && rows.length > 0 && (
        <div className="px-3.5 pb-3.5 pt-1 space-y-2" style={{ borderTop: `1px solid ${LINE}` }}>
          {rows.map((m) => {
            const guardAmt = (m.guard && m.guard[name]) || 0;
            const payAmt = Object.values((m.pairwise && m.pairwise[name]) || {}).reduce((s, v) => s + v, 0);
            const isGuardian = guardAmt > 0;
            const received = isGuardian
              ? Object.values(m.pairwise || {}).reduce((sum, creditors) => sum + (creditors[name] || 0), 0)
              : 0;
            const amount = isGuardian ? guardAmt + received : payAmt;
            const monthLabel = `${MONTHS_FULL_PT[m.month]} de ${m.year}`;
            const doneKey = `${name}__${m.key}`;
            const done = !!(futureDone && futureDone[doneKey]);
            return (
              <label key={m.key} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer" style={{ background: done ? JADE_TINT : SAND }}>
                <input type="checkbox" checked={done} onChange={() => onToggleFutureDone(name, m.key, monthLabel)}
                  className="w-4 h-4 shrink-0 accent-current" style={{ color: JADE }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs" style={{ color: done ? JADE_DARK : '#4A5651', textDecoration: done ? 'line-through' : 'none' }}>
                    {MONTHS_PT[m.month]}/{String(m.year).slice(2)}{isGuardian ? ' · guarda' : ' · Pix'}
                  </div>
                  {isGuardian && received > 0 && (
                    <div className="text-[10px]" style={{ color: '#96A19C' }}>
                      parte própria R$ {brl(guardAmt)} + recebido R$ {brl(received)}
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium shrink-0" style={{ color: done ? JADE_DARK : (isGuardian ? JADE_DARK : CORAL) }}>
                  R$ {brl(amount)}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MonthlySummaryFuturos({ schedule, pixKeys }) {
  const [expanded, setExpanded] = useState(true);
  if (!schedule.length) return null;
  const grandTotal = schedule.reduce((sum, m) => sum + m.total, 0);

  return (
    <div className="rounded-xl px-4 py-3 shadow-sm" style={{ background: 'white', border: `1px solid ${LINE}` }}>
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between text-left active:opacity-70 transition-opacity">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8A968E' }}>Quanto juntar por mês</div>
          <div className="text-xs mt-0.5" style={{ color: '#96A19C' }}>
            {schedule.length} mês{schedule.length === 1 ? '' : 'es'} · total R$ {brl(grandTotal)}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="shrink-0" style={{ color: '#96A19C' }} /> : <ChevronDown size={16} className="shrink-0" style={{ color: '#96A19C' }} />}
      </button>

      {expanded && (
        <div className="space-y-3 mt-3">
          {schedule.map((m) => {
            const transfers = netPairwiseSettlements(m.pairwise);
            return (
              <div key={m.key}>
                <div className="text-xs font-medium mb-1 flex items-center justify-between" style={{ color: INK }}>
                  <span>{MONTHS_FULL_PT[m.month]} de {m.year}</span>
                  <span style={{ color: '#96A19C', fontWeight: 400 }}>total R$ {brl(m.total)}</span>
                </div>
                <div className="space-y-0.5">
                  {Object.entries(m.guard).map(([name, amt]) => (
                    <div key={name} className="flex items-center justify-between text-xs" style={{ color: JADE_DARK }}>
                      <span>{name} guarda</span>
                      <span className="font-medium">R$ {brl(amt)}</span>
                    </div>
                  ))}
                  {transfers.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs" style={{ color: '#4A5651' }}>
                      <span className="font-medium">{t.from}</span>
                      <ChevronRight size={11} style={{ color: '#B7C1BC' }} />
                      <span className="font-medium">{t.to}</span>
                      <CopyPixButton pixKey={pixKeys?.[t.to]} />
                      <span className="ml-auto">Pix R$ {brl(t.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function mergeSchedules(a, b) {
  const map = {};
  [...a, ...b].forEach((m) => {
    if (!map[m.key]) map[m.key] = { key: m.key, year: m.year, month: m.month, perPerson: {}, total: 0, pairwise: {} };
    map[m.key].total += m.total;
    Object.entries(m.perPerson).forEach(([name, amt]) => {
      map[m.key].perPerson[name] = (map[m.key].perPerson[name] || 0) + amt;
    });
    Object.entries(m.pairwise || {}).forEach(([debtor, creditors]) => {
      if (!map[m.key].pairwise[debtor]) map[m.key].pairwise[debtor] = {};
      Object.entries(creditors).forEach(([creditor, amt]) => {
        map[m.key].pairwise[debtor][creditor] = (map[m.key].pairwise[debtor][creditor] || 0) + amt;
      });
    });
  });
  return Object.values(map).sort((x, y) => x.key.localeCompare(y.key));
}

function PixKeysPanel({ members, pixKeys, onSetPixKey }) {
  const [expanded, setExpanded] = useState(false);
  const filledCount = members.filter((m) => pixKeys?.[m]).length;

  return (
    <div className="rounded-xl px-4 py-3 mb-4 shadow-sm" style={{ background: 'white', border: `1px solid ${LINE}` }}>
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between text-left active:opacity-70 transition-opacity">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8A968E' }}>Chaves Pix</div>
          <div className="text-xs mt-0.5" style={{ color: '#96A19C' }}>
            {filledCount}/{members.length} cadastrada{filledCount === 1 ? '' : 's'}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="shrink-0" style={{ color: '#96A19C' }} /> : <ChevronDown size={16} className="shrink-0" style={{ color: '#96A19C' }} />}
      </button>

      {expanded && (
        <div className="space-y-2 mt-3">
          {members.map((name) => (
            <PixKeyRow key={name} name={name} value={pixKeys?.[name]} onSave={onSetPixKey} />
          ))}
        </div>
      )}
    </div>
  );
}

function PixKeyRow({ name, value, onSave }) {
  const [text, setText] = useState(value || '');
  useEffect(() => { setText(value || ''); }, [value]);
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm w-16 shrink-0 truncate" style={{ color: '#4A5651' }}>{name}</span>
      <input value={text} onChange={(e) => setText(e.target.value)}
        onBlur={() => { const trimmed = text.trim(); if (trimmed !== (value || '')) onSave(name, trimmed); }}
        placeholder="chave Pix (CPF, e-mail, telefone...)"
        className="flex-1 text-xs rounded-lg px-2.5 py-1.5 outline-none" style={{ border: `1px solid ${LINE}`, background: SAND, color: INK }} />
      <CopyPixButton pixKey={value} />
    </div>
  );
}

function ResumoSection({
  destinoExpenses, expenses, futureItems, members, itinerary,
  destinoTotal, geralTotal, destinoSchedule, geralSchedule, futureSchedule, pixLedger, destinoBalances, geralBalances,
  futureDone, onToggleFutureDone, pixKeys, onSetPixKey,
  paymentStatus, onConfirmPayment, onRemoveProof,
}) {
  const grandTotal = destinoTotal + geralTotal;
  const balances = useMemo(() => {
    const merged = {};
    members.forEach((m) => { merged[m] = { paid: 0, owed: 0 }; });
    [destinoBalances, geralBalances].forEach((bal) => {
      Object.entries(bal).forEach(([name, v]) => {
        if (!merged[name]) merged[name] = { paid: 0, owed: 0 };
        merged[name].paid += v.paid;
        merged[name].owed += v.owed;
      });
    });
    return merged;
  }, [destinoBalances, geralBalances, members]);
  const settlements = useMemo(() => computeSettlements(balances), [balances]);
  const mergedSchedule = useMemo(() => mergeSchedules(destinoSchedule, geralSchedule), [destinoSchedule, geralSchedule]);

  const breakdown = useMemo(
    () => computePersonBreakdown(destinoExpenses, expenses, futureItems, members, itinerary),
    [destinoExpenses, expenses, futureItems, members, itinerary]
  );
  const people = members.length ? members : Object.keys(breakdown);
  const totals = useMemo(() => {
    const t = {};
    people.forEach((name) => {
      const b = breakdown[name] || {};
      const spent = (b.hospedagem || 0) + (b.passeio || 0) + (b.outras || 0);
      const total = spent + (b.futuros || 0) + (b.alimentacao || 0);
      const passeios_total = (b.passeio || 0) + (b.futurosPasseio || 0);
      const hospedagem_total = (b.hospedagem || 0) + (b.futurosHospedagem || 0);
      t[name] = { ...b, spent, total, passeios_total, hospedagem_total, net: (b.paid || 0) - spent };
    });
    return t;
  }, [breakdown, people]);
  const futurosTotal = futureItems.reduce((sum, a) => sum + (Number(a.total) || 0), 0);
  const alimentacaoTotal = people.reduce((sum, name) => sum + (totals[name]?.alimentacao || 0), 0);
  const sortedPeople = [...people].sort((a, b) => totals[b].total - totals[a].total);

  return (
    <div>
      <div className="rounded-2xl px-4 py-3 mb-2 flex items-center justify-between" style={{ background: JADE_TINT, border: `1px solid #BFE3D5` }}>
        <span className="text-sm" style={{ color: JADE_DARK }}>Total geral do grupo</span>
        <span className="text-lg font-medium" style={{ color: JADE_DARK, fontFamily: "'Fraunces', serif" }}>R$ {brl(grandTotal)}</span>
      </div>
      <div className="flex items-center justify-between text-xs mb-1 px-1" style={{ color: '#96A19C' }}>
        <span>Viagem: R$ {brl(destinoTotal)}</span>
        <span>Outras: R$ {brl(geralTotal)}</span>
        <span>Média/pessoa: R$ {brl(people.length ? grandTotal / people.length : 0)}</span>
      </div>
      {(futurosTotal > 0 || alimentacaoTotal > 0) && (
        <div className="mb-3 px-1">
          {futurosTotal > 0 && (
            <div className="text-xs" style={{ color: '#96A19C' }}>
              + R$ {brl(futurosTotal)} em pagamentos futuros (ainda não pago por ninguém)
            </div>
          )}
          {alimentacaoTotal > 0 && (
            <div className="text-xs" style={{ color: '#96A19C' }}>
              + R$ {brl(alimentacaoTotal)} estimado em alimentação (não é um gasto compartilhado)
            </div>
          )}
        </div>
      )}

      <PixKeysPanel members={people} pixKeys={pixKeys} onSetPixKey={onSetPixKey} />

      <MonthlySummary schedule={mergedSchedule} pixKeys={pixKeys} />

      {people.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: '#96A19C' }}>Nenhuma pessoa no grupo ainda.</p>
      ) : (
        <div className="space-y-2 mb-4">
          {sortedPeople.map((name) => (
            <ResumoPersonCard key={name} name={name} b={totals[name]}
              destinoSchedule={destinoSchedule} geralSchedule={geralSchedule} futureSchedule={futureSchedule} pixLedger={pixLedger}
              futureDone={futureDone} onToggleFutureDone={onToggleFutureDone} pixKeys={pixKeys}
              paymentStatus={paymentStatus} onConfirmPayment={onConfirmPayment} onRemoveProof={onRemoveProof} />
          ))}
        </div>
      )}

      {settlements.length > 0 && (
        <div className="rounded-xl px-4 py-3 mb-5" style={{ background: '#F5F7F5', border: `1px solid ${LINE}` }}>
          <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#8A968E' }}>Acertos sugeridos (geral)</div>
          <div className="space-y-1.5">
            {settlements.map((s, idx) => (
              <div key={idx} className="text-sm flex items-center gap-1.5" style={{ color: '#4A5651' }}>
                <span className="font-medium">{s.from}</span>
                <ChevronRight size={13} style={{ color: '#B7C1BC' }} />
                <span className="font-medium">{s.to}</span>
                <CopyPixButton pixKey={pixKeys?.[s.to]} />
                <span className="ml-auto" style={{ color: '#96A19C' }}>R$ {brl(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] px-1" style={{ color: '#96A19C' }}>
        Clique numa pessoa pra ver o detalhamento por mês. Itens de Viagem ficam em Destinos.
      </p>
    </div>
  );
}

function ResumoPersonCard({ name, b, destinoSchedule, geralSchedule, futureSchedule, pixLedger, futureDone, onToggleFutureDone, pixKeys, paymentStatus, onConfirmPayment, onRemoveProof }) {
  const [expanded, setExpanded] = useState(false);
  const months = useMemo(() => {
    const map = {};
    function ensure(key) {
      if (!map[key]) {
        const [y, m] = key.split('-').map(Number);
        map[key] = { key, year: y, month: m - 1, parts: [], pairs: {} };
      }
      return map[key];
    }
    function addPart(schedule, domain, domainLabel) {
      (schedule || []).forEach((m) => {
        const amount = m.perPerson[name];
        if (!amount) return;
        ensure(m.key).parts.push({ domain, domainLabel, amount });
      });
    }
    addPart(destinoSchedule, 'viagem', 'Viagem');
    addPart(geralSchedule, 'geral', 'Outras');
    addPart(futureSchedule, 'futuro', 'Futuros');

    (pixLedger || []).forEach((e) => {
      if (e.from !== name && e.to !== name) return;
      const counterparty = e.from === name ? e.to : e.from;
      const row = ensure(e.key);
      if (!row.pairs[counterparty]) row.pairs[counterparty] = { counterparty, owe: [], owed: [], net: 0 };
      const pair = row.pairs[counterparty];
      if (e.from === name) { pair.owe.push(e); pair.net -= e.amount; }
      else { pair.owed.push(e); pair.net += e.amount; }
    });

    return Object.values(map)
      .map((row) => ({
        ...row,
        total: row.parts.reduce((s, p) => s + p.amount, 0),
        pairList: Object.values(row.pairs).sort((a, b) => a.net - b.net),
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [destinoSchedule, geralSchedule, futureSchedule, pixLedger, name]);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  return (
    <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: 'white', border: `1px solid ${LINE}` }}>
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left px-3.5 py-3 active:opacity-70 transition-opacity">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium" style={{ color: INK }}>{name}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm font-medium" style={{ color: b.net >= 0 ? JADE_DARK : CORAL }}>
              {b.net >= 0 ? '+' : '-'}R$ {brl(Math.abs(b.net))}
            </span>
            {expanded ? <ChevronUp size={14} style={{ color: '#96A19C' }} /> : <ChevronDown size={14} style={{ color: '#96A19C' }} />}
          </div>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden mb-1.5" style={{ background: SAND }}>
          {DASHBOARD_DISPLAY_CATS.map((c) => {
            const v = b[c.key] || 0;
            const pct = b.total > 0 ? (v / b.total) * 100 : 0;
            if (pct <= 0) return null;
            return <div key={c.key} style={{ width: `${pct}%`, background: c.color.text }} title={`${c.label}: ${pct.toFixed(0)}% · R$ ${brl(v)}`} />;
          })}
        </div>
        <div className="flex items-center justify-between text-[11px] mb-1.5" style={{ color: '#96A19C' }}>
          <span>gasta R$ {brl(b.spent)}{b.futuros > 0 ? ` + R$ ${brl(b.futuros)} futuro` : ''}</span>
          <span>pagou R$ {brl(b.paid)}</span>
        </div>
        <div className="space-y-1">
          {DASHBOARD_DISPLAY_CATS.map((c) => {
            const v = b[c.key] || 0;
            if (v <= 0 || !b.total) return null;
            const pct = Math.round((v / b.total) * 100);
            return (
              <div key={c.key} className="flex items-center justify-between text-[11px]" style={{ color: '#7A867F' }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color.text }} />
                  {c.label} {pct}%
                </span>
                <span>R$ {brl(v)}</span>
              </div>
            );
          })}
          {b.total > 0 && (
            <div className="flex items-center justify-between text-[11px] font-medium pt-1" style={{ color: INK, borderTop: `1px solid ${LINE}` }}>
              <span>Total</span>
              <span>R$ {brl(b.total)}</span>
            </div>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-1" style={{ borderTop: `1px solid ${LINE}` }}>
          {months.length === 0 ? (
            <p className="text-xs pt-2" style={{ color: '#96A19C' }}>Nenhum valor com data definida ainda para {name}.</p>
          ) : (
            <div className="space-y-2 pt-2">
              {months.map((m) => {
                const monthLabel = `${MONTHS_FULL_PT[m.month]} de ${m.year}`;
                const net = m.pairList.reduce((s, p) => s + p.net, 0);
                return (
                  <div key={m.key} className="rounded-lg px-3 py-2" style={{ background: SAND }}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span style={{ color: '#4A5651' }}>{monthLabel}</span>
                      <span className="font-medium" style={{ color: net >= 0 ? JADE_DARK : CORAL }}>
                        {net >= 0 ? '+' : '-'}R$ {brl(Math.abs(net))}
                      </span>
                    </div>
                    <div className="space-y-0.5 mb-1.5">
                      {m.parts.map((p) => (
                        <div key={p.domain} className="flex items-center justify-between text-[11px]" style={{ color: '#96A19C' }}>
                          <span>{p.domainLabel}</span>
                          <span>R$ {brl(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                    {m.total > 0 && (
                      <div className="flex items-center justify-between text-[11px] font-medium mb-1.5 pt-1" style={{ color: INK, borderTop: `1px dashed ${LINE}` }}>
                        <span>Total do mês{m.parts.length > 1 ? ` (${m.parts.map((p) => brl(p.amount)).join(' + ')})` : ''}</span>
                        <span>R$ {brl(m.total)}</span>
                      </div>
                    )}
                    {m.pairList.length > 0 && (
                      <div className="space-y-1.5 pt-1.5" style={{ borderTop: `1px dashed ${LINE}` }}>
                        <div className="text-[10px] uppercase tracking-wide" style={{ color: '#8A968E' }}>Pix do mês (já com o saldo) · toque para ver o porquê</div>
                        {m.pairList.map((pair) => (
                          <PixPairLine key={pair.counterparty} pair={pair} name={name} monthKey={m.key} monthLabel={monthLabel}
                            paymentStatus={paymentStatus} onConfirmPayment={onConfirmPayment} pixKeys={pixKeys}
                            onPreview={setPreviewUrl} onRequestRemove={setConfirmRemove}
                            futureDone={futureDone} onToggleFutureDone={onToggleFutureDone} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); }}>
          <img src={previewUrl} alt="Comprovante de pagamento" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}

      <ConfirmDialog
        open={!!confirmRemove}
        title="Remover comprovante?"
        message={confirmRemove ? `Isso vai desfazer a confirmação de pagamento de ${name} pra ${confirmRemove.counterparty} em ${confirmRemove.label}.` : ''}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={() => {
          onRemoveProof(confirmRemove.domain, name, confirmRemove.monthKey, confirmRemove.label, confirmRemove.counterparty);
          setConfirmRemove(null);
        }}
      />
    </div>
  );
}

const PIX_PROOF_DOMAINS = [
  { domain: 'saldo', label: 'Pix único' },
  { domain: 'total', label: 'Pix normal' },
  { domain: 'futuro', label: 'Pix futuro' },
];
const LEGACY_MONTH_PROOF_DOMAINS = [
  { domain: 'total', label: 'Pix do mês' },
  { domain: 'geral', label: 'Outras do mês' },
  { domain: 'viagem', label: 'Viagem do mês' },
];

function PixPairLine({ pair, name, monthKey, monthLabel, paymentStatus, onConfirmPayment, onPreview, onRequestRemove, futureDone, onToggleFutureDone, pixKeys }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const { counterparty, owe, owed, net } = pair;
  const settled = Math.abs(net) < 0.005;
  const isPayer = net < 0 && !settled;
  const payer = isPayer ? name : counterparty;
  const receiver = isPayer ? counterparty : name;
  const oweTotal = owe.reduce((s, e) => s + e.amount, 0);
  const owedTotal = owed.reduce((s, e) => s + e.amount, 0);

  const proofs = [];
  [[name, counterparty], [counterparty, name]].forEach(([from, to]) => {
    PIX_PROOF_DOMAINS.forEach(({ domain, label }) => {
      const rec = paymentStatus[`${domain}__${from}__${monthKey}__${to}`];
      if (rec?.paid) proofs.push({ domain, label, from, to, rec, key: `${domain}-${from}` });
    });
    LEGACY_MONTH_PROOF_DOMAINS.forEach(({ domain, label }) => {
      const rec = paymentStatus[`${domain}__${from}__${monthKey}`];
      if (rec?.paid) proofs.push({ domain, label, from, to, rec, legacyMonth: true, key: `${domain}-${from}-mes` });
    });
  });
  const paid = settled || proofs.some((p) => p.from === payer);

  async function handleFile(file) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const dataUrl = await readAndCompressImage(file);
      await onConfirmPayment('saldo', name, monthKey, monthLabel, dataUrl, counterparty);
      const owesFuture = owe.some((e) => e.kind === 'futuro');
      if (owesFuture && onToggleFutureDone && !(futureDone && futureDone[`${name}__${monthKey}`])) {
        onToggleFutureDone(name, monthKey, monthLabel);
      }
    } catch (err) {
      setError('Não deu para processar essa imagem, tenta outra.');
    } finally {
      setUploading(false);
    }
  }

  const tag = (e) => (e.kind === 'futuro' ? `futuro ${e.installment}/${e.installments}` : `parcela ${e.installment}/${e.installments}`);

  return (
    <div className="rounded-lg" style={{ background: 'white', border: `1px solid ${LINE}` }}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-1.5 text-xs px-2.5 py-2 text-left active:opacity-70 transition-opacity"
        style={{ color: settled ? '#7A867F' : isPayer ? CORAL : JADE_DARK }}>
        <span>{settled ? 'Zerado com' : isPayer ? 'Você paga pra' : 'Você recebe de'}</span>
        <span className="font-medium">{counterparty}</span>
        {isPayer && <CopyPixButton pixKey={pixKeys?.[counterparty]} />}
        {!settled && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
            style={paid ? { background: JADE_TINT, color: JADE_DARK } : { background: '#FCF3E3', color: '#8A5A12' }}>
            {paid ? 'pago' : 'pendente'}
          </span>
        )}
        <span className="ml-auto font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>R$ {brl(Math.abs(net))}</span>
        {open ? <ChevronUp size={13} className="shrink-0" style={{ color: '#96A19C' }} /> : <ChevronDown size={13} className="shrink-0" style={{ color: '#96A19C' }} />}
      </button>

      {open && (
        <div className="px-2.5 pb-2.5 space-y-2 text-[11px]" style={{ borderTop: `1px solid ${LINE}`, fontVariantNumeric: 'tabular-nums' }}>
          {owe.length > 0 && (
            <div className="pt-2 space-y-0.5">
              <div className="font-medium" style={{ color: CORAL }}>Você deve a {counterparty}</div>
              {owe.map((e, i) => (
                <div key={i} className="flex items-center justify-between gap-2" style={{ color: '#4A5651' }}>
                  <span className="min-w-0 truncate">{e.label} <span style={{ color: '#96A19C' }}>· {tag(e)}</span></span>
                  <span className="shrink-0" style={{ color: CORAL }}>− R$ {brl(e.amount)}</span>
                </div>
              ))}
              {owe.length > 1 && (
                <div className="flex justify-between font-medium pt-0.5" style={{ color: CORAL }}><span>Subtotal</span><span>− R$ {brl(oweTotal)}</span></div>
              )}
            </div>
          )}
          {owed.length > 0 && (
            <div className="pt-1 space-y-0.5">
              <div className="font-medium" style={{ color: JADE_DARK }}>{counterparty} te deve</div>
              {owed.map((e, i) => (
                <div key={i} className="flex items-center justify-between gap-2" style={{ color: '#4A5651' }}>
                  <span className="min-w-0 truncate">{e.label} <span style={{ color: '#96A19C' }}>· {tag(e)}</span></span>
                  <span className="shrink-0" style={{ color: JADE_DARK }}>+ R$ {brl(e.amount)}</span>
                </div>
              ))}
              {owed.length > 1 && (
                <div className="flex justify-between font-medium pt-0.5" style={{ color: JADE_DARK }}><span>Subtotal</span><span>+ R$ {brl(owedTotal)}</span></div>
              )}
            </div>
          )}
          <div className="flex justify-between font-medium pt-1.5 text-xs" style={{ borderTop: `1px dashed ${LINE}`, color: INK }}>
            <span>{settled ? 'Saldo zerado' : `${owedTotal > 0 && oweTotal > 0 ? `${brl(owedTotal)} − ${brl(oweTotal)} = ` : ''}${payer} paga a ${receiver}`}</span>
            <span>R$ {brl(Math.abs(net))}</span>
          </div>
          <p style={{ color: '#96A19C' }}>"parcela" = despesa já paga dividida em parcelas; "futuro" = dinheiro que o responsável está guardando até a compra.</p>

          {proofs.length > 0 && (
            <div className="space-y-1 pt-1">
              {proofs.map((p) => (
                <div key={p.key} className="flex items-center justify-between gap-2">
                  <span style={{ color: '#7A867F' }}>Comprovante de {p.from} ({p.label})</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <button onClick={() => onPreview(p.rec.proof)} className="font-medium active:opacity-60" style={{ color: JADE_DARK }}>Ver</button>
                    {p.from === name && !p.legacyMonth && (
                      <button onClick={() => onRequestRemove({ domain: p.domain, monthKey, counterparty, label: monthLabel })} className="active:opacity-60" style={{ color: '#96A19C' }}>Remover</button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
          {isPayer && (
            <div className="flex justify-end">
              <label className="font-medium active:opacity-60 transition-opacity" style={{ color: JADE_DARK, cursor: uploading ? 'default' : 'pointer' }}>
                {uploading ? 'Enviando...' : proofs.some((p) => p.from === name) ? 'Anexar outro comprovante' : 'Anexar comprovante'}
                <input type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }} />
              </label>
            </div>
          )}
          {error && <p className="text-right" style={{ color: CORAL }}>{error}</p>}
        </div>
      )}
    </div>
  );
}

const DASHBOARD_DISPLAY_CATS = [
  { key: 'hospedagem_total', label: 'Hospedagem', color: CITY_PALETTE[0] },
  { key: 'passeios_total', label: 'Passeios', color: CITY_PALETTE[1] },
  { key: 'outras', label: 'Outras', color: CITY_PALETTE[2] },
  { key: 'alimentacao', label: 'Alimentação', color: CITY_PALETTE[4] },
];

function GeralSection({ expenses, totalSpent, balances, settlements, schedule, members, onAdd, onEdit, onRemove, onToggleSplit, onLog, pixKeys, paymentStatus, onConfirmPayment, onRemoveProof }) {
  const [confirmExpenseId, setConfirmExpenseId] = useState(null);
  const confirmExpense = expenses.find((e) => e.id === confirmExpenseId);

  return (
    <div>
      <div className="rounded-2xl px-4 py-3 mb-4 flex items-center justify-between" style={{ background: JADE_TINT, border: `1px solid #BFE3D5` }}>
        <span className="text-sm" style={{ color: JADE_DARK }}>Total em despesas gerais</span>
        <span className="text-lg font-medium" style={{ color: JADE_DARK, fontFamily: "'Fraunces', serif" }}>R$ {brl(totalSpent)}</span>
      </div>

      <BalancesPanel domain="geral" balances={balances} settlements={settlements} schedule={schedule} members={members}
        pixKeys={pixKeys}
        paymentStatus={paymentStatus} onConfirmPayment={onConfirmPayment} onRemoveProof={onRemoveProof} />

      <div className="space-y-3 mt-1">
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
    </div>
  );
}

function BalancesPanel({ domain, balances, settlements, schedule, members, pixKeys, paymentStatus, onConfirmPayment, onRemoveProof }) {
  const [personModal, setPersonModal] = useState(null);

  return (
    <>
      <MonthlySummary schedule={schedule} pixKeys={pixKeys} />

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
                <CopyPixButton pixKey={pixKeys?.[s.to]} />
                <span className="ml-auto" style={{ color: '#96A19C' }}>R$ {brl(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {personModal && (
        <PersonMonthlyModal domain={domain} name={personModal} schedule={schedule} onClose={() => setPersonModal(null)}
          pixKeys={pixKeys}
          paymentStatus={paymentStatus} onConfirmPayment={onConfirmPayment} onRemoveProof={onRemoveProof} />
      )}
    </>
  );
}

function PersonMonthlyModal({ domain, name, schedule, onClose, pixKeys, paymentStatus, onConfirmPayment, onRemoveProof }) {
  const rows = schedule.filter((m) => m.perPerson[name] != null
    || Object.values(m.pairwise || {}).some((creditors) => creditors[name] != null));
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
      await onConfirmPayment(domain, name, monthKey, monthLabel, dataUrl);
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
              const { record } = getPaymentRecord(paymentStatus, domain, name, m.key);
              const status = monthPaymentStatus(m.year, m.month, !!record?.paid);
              const sc = PAYMENT_STATUS_COLOR[status];
              const transfers = netPairwiseSettlements(m.pairwise).filter((t) => t.from === name || t.to === name);
              const net = transfers.reduce((s, t) => s + (t.to === name ? t.amount : -t.amount), 0);
              return (
                <div key={m.key} className="rounded-lg px-3 py-2" style={{ background: SAND }}>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: '#4A5651' }}>{monthLabel}</span>
                    <span className="font-medium" style={{ color: net >= 0 ? JADE_DARK : CORAL }}>
                      {net >= 0 ? '+' : '-'}R$ {brl(Math.abs(net))}
                    </span>
                  </div>
                  {transfers.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {transfers.map((t, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs" style={{ color: t.from === name ? CORAL : JADE_DARK }}>
                          <span>{t.from === name ? 'Você paga pra' : 'Você recebe de'}</span>
                          <span className="font-medium">{t.from === name ? t.to : t.from}</span>
                          {t.from === name && <CopyPixButton pixKey={pixKeys?.[t.to]} />}
                          <span className="ml-auto font-medium">R$ {brl(t.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
          onRemoveProof(domain, name, confirmRemoveKey, monthLabel);
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

function MonthlySummary({ schedule, pixKeys }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!schedule.length) return null;

  const grandTotal = schedule.reduce((sum, m) => sum + m.total, 0);

  function buildShareText() {
    return schedule.map((m) => {
      const label = `${MONTHS_FULL_PT[m.month]} de ${m.year}`;
      const transfers = netPairwiseSettlements(m.pairwise);
      const nets = monthlyNetBalances(m);
      const lines = nets.map(({ name, net }) => `  ${name}: ${net >= 0 ? '+' : '-'}R$ ${brl(Math.abs(net))}`).join('\n');
      const transferLines = transfers.length
        ? `\n  Pix:\n${transfers.map((t) => `    ${t.from} → ${t.to}: R$ ${brl(t.amount)}`).join('\n')}`
        : '';
      return `${label} (total R$ ${brl(m.total)})\n${lines}${transferLines}`;
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
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between text-left active:opacity-70 transition-opacity">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8A968E' }}>Resumo mensal por pessoa</div>
          <div className="text-xs mt-0.5" style={{ color: '#96A19C' }}>
            {schedule.length} mês{schedule.length === 1 ? '' : 'es'} · total R$ {brl(grandTotal)}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="shrink-0" style={{ color: '#96A19C' }} /> : <ChevronDown size={16} className="shrink-0" style={{ color: '#96A19C' }} />}
      </button>

      {expanded && (
        <>
          <div className="flex justify-end mt-3 mb-1">
            <button onClick={handleCopy} className="flex items-center gap-1 text-xs font-medium active:opacity-60 transition-opacity" style={{ color: JADE_DARK }}>
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <div className="space-y-3">
            {schedule.map((m) => {
              const transfers = netPairwiseSettlements(m.pairwise);
              const nets = monthlyNetBalances(m);
              return (
                <div key={m.key}>
                  <div className="text-xs font-medium mb-1 flex items-center justify-between" style={{ color: INK }}>
                    <span>{MONTHS_FULL_PT[m.month]} de {m.year}</span>
                    <span style={{ color: '#96A19C', fontWeight: 400 }}>total R$ {brl(m.total)}</span>
                  </div>
                  <div className="space-y-0.5">
                    {nets.map(({ name, net }) => (
                      <div key={name} className="flex items-center justify-between text-xs" style={{ color: '#4A5651' }}>
                        <span>{name}</span>
                        <span className="font-medium" style={{ color: net >= 0 ? JADE_DARK : CORAL }}>
                          {net >= 0 ? '+' : '-'}R$ {brl(Math.abs(net))}
                        </span>
                      </div>
                    ))}
                  </div>
                  {transfers.length > 0 && (
                    <div className="mt-1.5 pt-1.5 space-y-1" style={{ borderTop: `1px solid ${LINE}` }}>
                      {transfers.map((t, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs" style={{ color: JADE_DARK }}>
                          <span className="font-medium">{t.from}</span>
                          <ChevronRight size={11} style={{ color: '#B7C1BC' }} />
                          <span className="font-medium">{t.to}</span>
                          <CopyPixButton pixKey={pixKeys?.[t.to]} />
                          <span className="ml-auto">Pix R$ {brl(t.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] mt-3" style={{ color: '#96A19C' }}>
            Baseado na data de compra e no número de parcelas de cada gasto — preencha "comprado em" nos gastos abaixo para aparecer aqui.
          </p>
        </>
      )}
    </div>
  );
}
