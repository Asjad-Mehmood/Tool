"use client";
import { useState, type ComponentType } from "react";
import { Num, ResultCard, Select, Stat, fmtNum } from "@/components/templates";

const money = (n: number) => (Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : "—");

function Percentage() {
  const [a, setA] = useState("10"), [b, setB] = useState("200"), [c, setC] = useState("50"), [d, setD] = useState("200"), [e, setE] = useState("100"), [f, setF] = useState("150");
  const row = "grid gap-3 sm:grid-cols-3";
  return (
    <div className="space-y-6">
      <div className="space-y-2"><p className="font-medium">What is X% of Y?</p><div className={row}><Num label="X (%)" value={a} onChange={setA} /><Num label="Y" value={b} onChange={setB} /><ResultCard>{fmtNum((+a / 100) * +b)}</ResultCard></div></div>
      <div className="space-y-2"><p className="font-medium">X is what % of Y?</p><div className={row}><Num label="X" value={c} onChange={setC} /><Num label="Y" value={d} onChange={setD} /><ResultCard>{fmtNum((+c / +d) * 100)}%</ResultCard></div></div>
      <div className="space-y-2"><p className="font-medium">Percentage change</p><div className={row}><Num label="From" value={e} onChange={setE} /><Num label="To" value={f} onChange={setF} /><ResultCard>{fmtNum(((+f - +e) / Math.abs(+e)) * 100)}%</ResultCard></div></div>
    </div>
  );
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
function Age() {
  const [dob, setDob] = useState("1995-06-15"), [on, setOn] = useState(iso(new Date()));
  const a = new Date(dob), b = new Date(on), ok = !isNaN(+a) && !isNaN(+b) && b >= a;
  let y = 0, m = 0, d = 0;
  if (ok) {
    y = b.getFullYear() - a.getFullYear(); m = b.getMonth() - a.getMonth(); d = b.getDate() - a.getDate();
    if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
  }
  const next = new Date(b.getFullYear(), a.getMonth(), a.getDate()); if (next < b) next.setFullYear(b.getFullYear() + 1);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Date of birth<input type="date" className="input mt-1" value={dob} onChange={(e) => setDob(e.target.value)} /></label>
        <label className="text-sm font-medium">Age at date<input type="date" className="input mt-1" value={on} onChange={(e) => setOn(e.target.value)} /></label>
      </div>
      {ok ? <><ResultCard>{y} years, {m} months, {d} days</ResultCard>
        <div className="grid gap-2 sm:grid-cols-3"><Stat label="Total days" value={Math.floor((+b - +a) / 864e5).toLocaleString()} /><Stat label="Total months" value={y * 12 + m} /><Stat label="Next birthday in" value={`${Math.ceil((+next - +b) / 864e5)} days`} /></div></> : <p className="text-red-600">Enter valid dates</p>}
    </div>
  );
}

function DateDifference() {
  const [s, setS] = useState(iso(new Date())), [e, setE] = useState(iso(new Date(Date.now() + 30 * 864e5))), [add, setAdd] = useState("90");
  const a = new Date(s), b = new Date(e), days = Math.round((+b - +a) / 864e5);
  const r = new Date(a); r.setDate(r.getDate() + (parseInt(add) || 0));
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3"><h3 className="font-semibold">Difference</h3>
        <label className="block text-sm font-medium">From<input type="date" className="input mt-1" value={s} onChange={(x) => setS(x.target.value)} /></label>
        <label className="block text-sm font-medium">To<input type="date" className="input mt-1" value={e} onChange={(x) => setE(x.target.value)} /></label>
        <ResultCard>{isNaN(days) ? "—" : `${Math.abs(days)} days (${(Math.abs(days) / 7).toFixed(1)} weeks)`}</ResultCard></div>
      <div className="space-y-3"><h3 className="font-semibold">Add / subtract days</h3>
        <label className="block text-sm font-medium">Start<input type="date" className="input mt-1" value={s} onChange={(x) => setS(x.target.value)} /></label>
        <Num label="Days (negative to subtract)" value={add} onChange={setAdd} />
        <ResultCard>{isNaN(+r) ? "—" : r.toDateString()}</ResultCard></div>
    </div>
  );
}

function LoanEmi() {
  const [p, setP] = useState("100000"), [r, setR] = useState("8"), [y, setY] = useState("5");
  const P = +p, n = +y * 12, i = +r / 1200;
  const emi = i === 0 ? P / n : (P * i * (1 + i) ** n) / ((1 + i) ** n - 1), total = emi * n;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3"><Num label="Loan amount" value={p} onChange={setP} /><Num label="Interest rate (% / year)" value={r} onChange={setR} /><Num label="Term (years)" value={y} onChange={setY} /></div>
      <ResultCard>Monthly EMI: {money(emi)}</ResultCard>
      <div className="grid gap-2 sm:grid-cols-2"><Stat label="Total interest" value={money(total - P)} /><Stat label="Total payment" value={money(total)} /></div>
    </div>
  );
}

function Bmi() {
  const [u, setU] = useState("metric"), [w, setW] = useState("70"), [h, setH] = useState("175");
  const bmi = u === "metric" ? +w / (+h / 100) ** 2 : (703 * +w) / (+h) ** 2;
  const cat = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal weight" : bmi < 30 ? "Overweight" : "Obese";
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3"><Select label="Units" value={u} onChange={setU} options={[{ value: "metric", label: "kg / cm" }, { value: "imperial", label: "lb / in" }]} /><Num label={u === "metric" ? "Weight (kg)" : "Weight (lb)"} value={w} onChange={setW} /><Num label={u === "metric" ? "Height (cm)" : "Height (in)"} value={h} onChange={setH} /></div>
      <ResultCard>{Number.isFinite(bmi) ? `BMI ${bmi.toFixed(1)} — ${cat}` : "—"}</ResultCard>
      <p className="text-xs text-slate-500">General guidance only; not medical advice.</p>
    </div>
  );
}

function Discount() {
  const [p, setP] = useState("100"), [d, setD] = useState("20");
  const save = (+p * +d) / 100;
  return (<div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Num label="Original price" value={p} onChange={setP} /><Num label="Discount (%)" value={d} onChange={setD} /></div><ResultCard>Final price: {money(+p - save)}</ResultCard><Stat label="You save" value={money(save)} /></div>);
}

function Vat() {
  const [a, setA] = useState("100"), [r, setR] = useState("5"), [m, setM] = useState("add");
  const A = +a, R = +r / 100, net = m === "add" ? A : A / (1 + R), vat = net * R;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3"><Num label="Amount" value={a} onChange={setA} /><Num label="VAT rate (%) — UAE 5, KSA 15" value={r} onChange={setR} /><Select label="Mode" value={m} onChange={setM} options={[{ value: "add", label: "Add VAT (amount is net)" }, { value: "remove", label: "Remove VAT (amount includes VAT)" }]} /></div>
      <div className="grid gap-2 sm:grid-cols-3"><Stat label="Net" value={money(net)} /><Stat label="VAT" value={money(vat)} /><Stat label="Gross" value={money(net + vat)} /></div>
    </div>
  );
}

function Zakat() {
  const [v, setV] = useState({ cash: "0", gold: "0", silver: "0", invest: "0", biz: "0", debts: "0" }), [nisab, setNisab] = useState("0");
  const set = (k: keyof typeof v) => (x: string) => setV({ ...v, [k]: x });
  const net = +v.cash + +v.gold + +v.silver + +v.invest + +v.biz - +v.debts, due = net >= +nisab && net > 0;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3"><Num label="Cash & savings" value={v.cash} onChange={set("cash")} /><Num label="Gold value" value={v.gold} onChange={set("gold")} /><Num label="Silver value" value={v.silver} onChange={set("silver")} /><Num label="Investments" value={v.invest} onChange={set("invest")} /><Num label="Business assets" value={v.biz} onChange={set("biz")} /><Num label="Debts due" value={v.debts} onChange={set("debts")} /></div>
      <Num label="Nisab threshold in your currency (enter current value)" value={nisab} onChange={setNisab} />
      <ResultCard>Zakat due: {due ? money(net * 0.025) : "0.00"}</ResultCard>
      <p className="text-xs text-slate-500">Zakat is 2.5% of net zakatable wealth held above nisab for a lunar year. Consult a scholar for your situation.</p>
    </div>
  );
}

// Simplified estimates. UAE: 21 days/yr for first 5 yrs, 30 days/yr after. Qatar: 21 days/yr (min 1 yr). KSA: half-month/yr for first 5 yrs, full month after (halved/thirded on resignation <10 yrs).
function Gratuity() {
  const [c, setC] = useState("uae"), [wage, setWage] = useState("5000"), [years, setYears] = useState("6"), [ended, setEnded] = useState("terminated");
  const Y = +years, W = +wage, daily = W / 30;
  let g = 0;
  if (c === "uae") g = Y < 1 ? 0 : Math.min(daily * 21 * Math.min(Y, 5) + daily * 30 * Math.max(Y - 5, 0), W * 24);
  else if (c === "qatar") g = Y < 1 ? 0 : daily * 21 * Y;
  else { g = (W / 2) * Math.min(Y, 5) + W * Math.max(Y - 5, 0); if (ended === "resigned") g *= Y < 2 ? 0 : Y < 5 ? 1 / 3 : Y < 10 ? 2 / 3 : 1; }
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Country" value={c} onChange={setC} options={[{ value: "uae", label: "UAE" }, { value: "qatar", label: "Qatar" }, { value: "ksa", label: "Saudi Arabia" }]} />
        <Select label="End of service" value={ended} onChange={setEnded} options={[{ value: "terminated", label: "Terminated / contract end" }, { value: "resigned", label: "Resigned" }]} />
        <Num label={c === "uae" ? "Last basic salary / month" : c === "qatar" ? "Last basic salary / month" : "Last total wage / month"} value={wage} onChange={setWage} />
        <Num label="Years of service" value={years} onChange={setYears} />
      </div>
      <ResultCard>Estimated gratuity: {money(g)}</ResultCard>
      <p className="text-xs text-slate-500">Simplified estimate for guidance only. Labour laws change and contracts can differ — verify against the current law and your contract before relying on this.</p>
    </div>
  );
}

export const tools: Record<string, ComponentType> = {
  "percentage-calculator": Percentage, "age-calculator": Age, "date-difference": DateDifference, "loan-emi-calculator": LoanEmi,
  "bmi-calculator": Bmi, "discount-calculator": Discount, "vat-calculator": Vat, "zakat-calculator": Zakat, "gratuity-calculator": Gratuity,
};
