import { useState, useMemo, useEffect } from "react";

// ── Pricing ───────────────────────────────────────────────────────────────────
const DOZEN_PRICE = { p10: 80, p20: 160, p50: 420 };
const PER_PKT     = { p10: DOZEN_PRICE.p10/12, p20: DOZEN_PRICE.p20/12, p50: DOZEN_PRICE.p50/12 };

// ── Wrapping constants ────────────────────────────────────────────────────────
const PINS_PER_BOX = 1000, PINS_PER_PKT = 2, CARDS_PER_PACK = 620, CARDS_PER_PKT = 1;
const BAG_12W = { p10: 8, p20: 10, p50: 12 }; // grams per 12 bags
const BAG_GPB  = { p10: BAG_12W.p10/12, p20: BAG_12W.p20/12, p50: BAG_12W.p50/12 };

const DEFAULT_RAW  = [
  {id:1,name:"Salt",weightGrams:5000,pricePerKg:80},
  {id:2,name:"Sugar",weightGrams:10000,pricePerKg:140},
  {id:3,name:"Red Pepper",weightGrams:3000,pricePerKg:600},
  {id:4,name:"Sesame Seeds",weightGrams:2000,pricePerKg:450},
];
const DEFAULT_WRAP = {
  stapler_boxes:1, stapler_price:30,
  bags10_kg:1,     bags10_price:1300,
  bags20_kg:1,     bags20_price:1300,
  bags50_kg:1,     bags50_price:1300,
  card_packs:1,    card_price:300,
};

const TABS = [
  {id:"Dashboard",icon:"◈"},
  {id:"Raw Stock", icon:"⊞"},
  {id:"Packets",   icon:"⊡"},
  {id:"Wrapping",  icon:"◻"},
  {id:"Sales",     icon:"📊"},
  {id:"Inventory", icon:"≡"},
  {id:"Calculator",icon:"∑"},
];

const PKT_TYPES = [
  {key:"p10", label:"10Rs", icon:"🟢", color:"#10b981", pale:"#d1fae5", doz:DOZEN_PRICE.p10},
  {key:"p20", label:"20Rs", icon:"🟡", color:"#f59e0b", pale:"#fffbeb", doz:DOZEN_PRICE.p20},
  {key:"p50", label:"50Rs", icon:"🟠", color:"#f97316", pale:"#fff7ed", doz:DOZEN_PRICE.p50},
];

const fmt  = n => `Rs ${Number(n).toLocaleString("en-PK",{minimumFractionDigits:0,maximumFractionDigits:2})}`;
const fmtG = g => g>=1000?`${(g/1000).toFixed(2)} kg`:`${parseFloat(g).toFixed(1)} g`;
const today = () => new Date().toLocaleDateString("en-PK");

async function load(k,fb){try{const r=await window.storage.get(k);return r?JSON.parse(r.value):fb;}catch{return fb;}}
async function save(k,v){try{await window.storage.set(k,JSON.stringify(v));}catch{}}

function usedGrams(packets,rawItems){
  const m={};rawItems.forEach(r=>{m[r.id]=0;});
  packets.forEach(p=>{
    if(p.rawId&&m[p.rawId]!==undefined)
      m[p.rawId]+=(p.g10||0)*p.qty10+(p.g20||0)*p.qty20+(p.g50||0)*p.qty50;
  });
  return m;
}

// ── Colours ───────────────────────────────────────────────────────────────────
const C={
  bg:"#f0faf4",card:"#ffffff",border:"#d4edda",borderLight:"#e8f5e9",
  primary:"#2e7d52",primaryPale:"#e8f5ee",
  accent:"#00897b",accentPale:"#e0f2f1",
  gold:"#f59e0b",goldPale:"#fffbeb",
  green:"#10b981",greenPale:"#d1fae5",
  orange:"#f97316",orangePale:"#fff7ed",
  red:"#ef4444",redPale:"#fef2f2",
  text:"#1a2e22",textMid:"#4a6b55",textLight:"#8aab93",
  shadow:"rgba(46,125,82,0.08)",
};
const card={background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:"16px",boxShadow:`0 2px 12px ${C.shadow}`};
const inp={background:"#f8fdfb",border:`1.5px solid ${C.border}`,color:C.text,padding:"9px 12px",borderRadius:9,fontSize:13,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};
const lbl={display:"flex",flexDirection:"column",gap:5,fontSize:11,color:C.textMid,fontWeight:600,letterSpacing:.4};
const btn=(bg,col="#fff")=>({background:bg,color:col,border:"none",padding:"10px 18px",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",transition:"opacity .15s"});

export default function App(){
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState("Dashboard");
  const [rawItems,setRawItems]=useState(DEFAULT_RAW);
  const [rawForm,setRawForm]=useState({name:"",weightGrams:"",pricePerKg:""});
  const [wrap,setWrap]=useState(DEFAULT_WRAP);
  const [packets,setPackets]=useState([]);
  const [pForm,setPForm]=useState({rawId:"",qty10:"",qty20:"",qty50:"",g10:"",g20:"",g50:""});
  const [editId,setEditId]=useState(null);
  const [eForm,setEForm]=useState({qty10:"",qty20:"",qty50:"",g10:"",g20:"",g50:""});
  const [sales,setSales]=useState([]);
  const [saleForm,setSaleForm]=useState({date:today(),qty10:"",qty20:"",qty50:"",note:""});
  const [calcForm,setCalcForm]=useState({rawId:"",wg:"",pktType:"p20",targetProfit:""});

  useEffect(()=>{(async()=>{
    const[ri,wr,pk,sl]=await Promise.all([
      load("amjad:rawItems",DEFAULT_RAW),
      load("amjad:wrapping4",DEFAULT_WRAP),
      load("amjad:packets3",[]),
      load("amjad:sales",[]),
    ]);
    setRawItems(ri);setWrap(wr);setPackets(pk);setSales(sl);setReady(true);
  })();},[]);
  useEffect(()=>{if(ready)save("amjad:rawItems",rawItems);},[rawItems,ready]);
  useEffect(()=>{if(ready)save("amjad:wrapping4",wrap);},[wrap,ready]);
  useEffect(()=>{if(ready)save("amjad:packets3",packets);},[packets,ready]);
  useEffect(()=>{if(ready)save("amjad:sales",sales);},[sales,ready]);

  const usedMap=useMemo(()=>usedGrams(packets,rawItems),[packets,rawItems]);
  const totals=useMemo(()=>({
    p10:packets.reduce((s,p)=>s+(p.qty10||0),0),
    p20:packets.reduce((s,p)=>s+(p.qty20||0),0),
    p50:packets.reduce((s,p)=>s+(p.qty50||0),0),
  }),[packets]);
  const totalPkts=totals.p10+totals.p20+totals.p50;
  const totalRev=useMemo(()=>
    (totals.p10/12)*DOZEN_PRICE.p10+(totals.p20/12)*DOZEN_PRICE.p20+(totals.p50/12)*DOZEN_PRICE.p50
  ,[totals]);

  // wrapping
  const pinsStock=wrap.stapler_boxes*PINS_PER_BOX;
  const pinsUsed=totalPkts*PINS_PER_PKT;
  const pinsRem=Math.max(0,pinsStock-pinsUsed);
  const bags10StockG=wrap.bags10_kg*1000,bags20StockG=wrap.bags20_kg*1000,bags50StockG=wrap.bags50_kg*1000;
  const bags10UsedG=totals.p10*BAG_GPB.p10,bags20UsedG=totals.p20*BAG_GPB.p20,bags50UsedG=totals.p50*BAG_GPB.p50;
  const bags10RemG=Math.max(0,bags10StockG-bags10UsedG),bags20RemG=Math.max(0,bags20StockG-bags20UsedG),bags50RemG=Math.max(0,bags50StockG-bags50UsedG);
  const bags10Rem=Math.floor(bags10RemG/BAG_GPB.p10),bags20Rem=Math.floor(bags20RemG/BAG_GPB.p20),bags50Rem=Math.floor(bags50RemG/BAG_GPB.p50);
  const cardsTotal=wrap.card_packs*CARDS_PER_PACK,cardsUsed=totalPkts*CARDS_PER_PKT,cardsRem=Math.max(0,cardsTotal-cardsUsed);
  const totalWrapCost=(wrap.stapler_boxes||0)*(wrap.stapler_price||0)+(wrap.bags10_kg||0)*(wrap.bags10_price||0)+(wrap.bags20_kg||0)*(wrap.bags20_price||0)+(wrap.bags50_kg||0)*(wrap.bags50_price||0)+(wrap.card_packs||0)*(wrap.card_price||0);

  // packet form
  const selRaw=rawItems.find(r=>r.id===parseInt(pForm.rawId));
  const selRemG=selRaw?Math.max(0,selRaw.weightGrams-(usedMap[selRaw.id]||0)):0;
  const fg={p10:parseFloat(pForm.g10)||0,p20:parseFloat(pForm.g20)||0,p50:parseFloat(pForm.g50)||0};
  const fq={p10:parseInt(pForm.qty10)||0,p20:parseInt(pForm.qty20)||0,p50:parseInt(pForm.qty50)||0};
  const pFormUsed=fq.p10*fg.p10+fq.p20*fg.p20+fq.p50*fg.p50;
  const pFormRem=selRemG-pFormUsed;
  const newPkts=fq.p10+fq.p20+fq.p50;

  // sales
  const salesByDate=useMemo(()=>{
    const m={};
    sales.forEach(s=>{if(!m[s.date])m[s.date]={qty10:0,qty20:0,qty50:0,notes:[]};m[s.date].qty10+=(s.qty10||0);m[s.date].qty20+=(s.qty20||0);m[s.date].qty50+=(s.qty50||0);if(s.note)m[s.date].notes.push(s.note);});
    return m;
  },[sales]);
  const totalSold={p10:sales.reduce((s,x)=>s+(x.qty10||0),0),p20:sales.reduce((s,x)=>s+(x.qty20||0),0),p50:sales.reduce((s,x)=>s+(x.qty50||0),0)};
  const totalSoldRev=(totalSold.p10/12)*DOZEN_PRICE.p10+(totalSold.p20/12)*DOZEN_PRICE.p20+(totalSold.p50/12)*DOZEN_PRICE.p50;

  // calculator
  const ci=rawItems.find(r=>r.id===parseInt(calcForm.rawId));
  const cw=parseFloat(calcForm.wg)||0;
  const targetProfit=parseFloat(calcForm.targetProfit)||0;
  const pt=calcForm.pktType;
  const sellPPkt=PER_PKT[pt];
  // gram per packet to achieve target profit: sell - (raw_cost_per_pkt) - pkg_cost = targetProfit
  // raw_cost_per_pkt = (g/1000)*pricePerKg
  // => g = ((sellPPkt - targetProfit - pkg_cost) / pricePerKg) * 1000
  // pkg_cost varies; use mid estimate
  const PKG_MID={p10:1.25,p20:1.75,p50:3.0};
  let calcResult=null;
  if(ci&&cw>0&&targetProfit>0){
    const pkgCost=PKG_MID[pt];
    const rawBudget=sellPPkt-targetProfit-pkgCost;
    if(rawBudget>0){
      const gPerPkt=(rawBudget/ci.pricePerKg)*1000;
      const numPkts=Math.floor(cw/gPerPkt);
      const dozens=numPkts/12;
      const revenue=dozens*DOZEN_PRICE[pt];
      const totalRawCost=numPkts*rawBudget;
      const totalPkgCost=numPkts*pkgCost;
      const netProfit=revenue-totalRawCost-totalPkgCost;
      calcResult={gPerPkt,numPkts,dozens,revenue,netProfit,rawBudget,pkgCost};
    }
  }

  function addRaw(){if(!rawForm.name||!rawForm.weightGrams||!rawForm.pricePerKg)return;setRawItems(p=>[...p,{id:Date.now(),name:rawForm.name,weightGrams:parseFloat(rawForm.weightGrams),pricePerKg:parseFloat(rawForm.pricePerKg)}]);setRawForm({name:"",weightGrams:"",pricePerKg:""});}
  function addPacket(){if(!selRaw||(!fq.p10&&!fq.p20&&!fq.p50)||pFormRem<0)return;setPackets(p=>[...p,{id:Date.now(),rawId:selRaw.id,rawName:selRaw.name,qty10:fq.p10,qty20:fq.p20,qty50:fq.p50,g10:fg.p10,g20:fg.p20,g50:fg.p50,date:today()}]);setPForm({rawId:"",qty10:"",qty20:"",qty50:"",g10:"",g20:"",g50:""});}
  function startEdit(p){setEditId(p.id);setEForm({qty10:p.qty10||0,qty20:p.qty20||0,qty50:p.qty50||0,g10:p.g10||0,g20:p.g20||0,g50:p.g50||0});}
  function saveEdit(id){setPackets(p=>p.map(x=>x.id===id?{...x,qty10:parseInt(eForm.qty10)||0,qty20:parseInt(eForm.qty20)||0,qty50:parseInt(eForm.qty50)||0,g10:parseFloat(eForm.g10)||0,g20:parseFloat(eForm.g20)||0,g50:parseFloat(eForm.g50)||0}:x));setEditId(null);}
  function delPacket(id){setPackets(p=>p.filter(x=>x.id!==id));if(editId===id)setEditId(null);}
  function addSale(){if(!saleForm.qty10&&!saleForm.qty20&&!saleForm.qty50)return;setSales(p=>[...p,{id:Date.now(),date:saleForm.date,qty10:parseInt(saleForm.qty10)||0,qty20:parseInt(saleForm.qty20)||0,qty50:parseInt(saleForm.qty50)||0,note:saleForm.note}]);setSaleForm({date:today(),qty10:"",qty20:"",qty50:"",note:""});}

  if(!ready)return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${C.primaryPale},${C.accentPale})`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <div style={{width:40,height:40,borderRadius:"50%",border:`4px solid ${C.border}`,borderTop:`4px solid ${C.primary}`,animation:"spin 1s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{color:C.primary,fontWeight:700,fontSize:13}}>Loading Amjad Dukan…</span>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.text,fontSize:14}}>
      <style>{`*{box-sizing:border-box;}input:focus,select:focus{border-color:${C.primary}!important;box-shadow:0 0 0 2px ${C.primaryPale};}button:active{opacity:.8;}::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-thumb{background:${C.primary};border-radius:4px;}`}</style>

      {/* HEADER */}
      <header style={{background:`linear-gradient(135deg,${C.primary},${C.accent})`,padding:"12px 16px",boxShadow:"0 3px 16px rgba(46,125,82,.3)",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:38,height:38,borderRadius:10,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🏪</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:16,fontWeight:800,color:"#fff",letterSpacing:.3}}>Amjad Dukan</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,.7)",letterSpacing:1.5,textTransform:"uppercase"}}>امجد دکان · Packet Business</div>
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            {PKT_TYPES.map(t=>(
              <div key={t.key} style={{background:"rgba(255,255,255,.15)",borderRadius:8,padding:"4px 8px",textAlign:"center"}}>
                <div style={{fontSize:8,color:"rgba(255,255,255,.65)",letterSpacing:1}}>{t.label}</div>
                <div style={{fontSize:12,fontWeight:800,color:"#fff"}}>{fmt(t.doz)}</div>
                <div style={{fontSize:8,color:"rgba(255,255,255,.6)"}}>doz</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* NAV */}
      <nav style={{background:C.card,borderBottom:`1px solid ${C.border}`,position:"sticky",top:62,zIndex:99,overflowX:"auto"}}>
        <div style={{display:"flex",padding:"0 4px",minWidth:"max-content"}}>
          {TABS.map(t=>{const active=tab===t.id;return(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"11px 12px",background:"transparent",border:"none",cursor:"pointer",fontSize:11,fontWeight:active?700:500,color:active?C.primary:C.textMid,fontFamily:"inherit",whiteSpace:"nowrap",borderBottom:active?`2.5px solid ${C.primary}`:"2.5px solid transparent",transition:"all .15s"}}>
              <span style={{fontSize:13}}>{t.icon}</span>{t.id}
            </button>
          );})}
        </div>
      </nav>

      <main style={{maxWidth:960,margin:"0 auto",padding:"16px 12px 40px"}}>

        {/* ══ DASHBOARD ══ */}
        {tab==="Dashboard"&&(
          <div>
            <PT title="Overview" sub="Business at a glance" icon="◈"/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
              {PKT_TYPES.map(t=>(
                <KpiCard key={t.key} icon={t.icon} label={`${t.label} Pkts`} value={totals[t.key]} sub={`${(totals[t.key]/12).toFixed(1)} doz`} color={t.color} pale={t.pale}/>
              ))}
            </div>
            <div style={{...card,marginBottom:16,background:`linear-gradient(135deg,${C.greenPale},#fff)`,borderTop:`3px solid ${C.green}`}}>
              <div style={{fontSize:10,color:C.textLight,marginBottom:4}}>TOTAL REVENUE (if all sold)</div>
              <div style={{fontSize:24,fontWeight:800,color:C.green}}>{fmt(totalRev)}</div>
              <div style={{fontSize:10,color:C.textMid,marginTop:2}}>Sold so far: <b style={{color:C.primary}}>{fmt(totalSoldRev)}</b></div>
            </div>

            <ST>Pricing per packet</ST>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
              {PKT_TYPES.map(t=>(
                <div key={t.key} style={{...card,borderTop:`3px solid ${t.color}`}}>
                  <div style={{fontWeight:700,color:t.color,fontSize:12,marginBottom:8}}>{t.icon} {t.label}</div>
                  {[["Sell",fmt(PER_PKT[t.key])],["Raw","Rs 4–7.5"],["Pkg","Rs 1–2"]].map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:10,padding:"2px 0",borderBottom:`1px solid ${t.color}15`}}>
                      <span style={{color:C.textLight}}>{k}</span><b>{v}</b>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <ST>Raw Materials</ST>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              {rawItems.map(r=>{const used=usedMap[r.id]||0,rem=Math.max(0,r.weightGrams-used),pct=r.weightGrams>0?rem/r.weightGrams:1;return(
                <div key={r.id} style={card}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div style={{fontWeight:700,fontSize:13}}>{r.name}</div>
                    <Pill color={pct>0.5?C.green:pct>0.2?C.gold:C.red} pale={pct>0.5?C.greenPale:pct>0.2?C.goldPale:C.redPale}>{fmtG(rem)}</Pill>
                  </div>
                  <PB pct={pct}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textLight,marginTop:5}}>
                    <span>{fmtG(r.weightGrams)}</span><span>Used {fmtG(used)}</span>
                  </div>
                </div>
              );})}
            </div>

            <ST>Wrapping Stock</ST>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              <WMini icon="📌" label="Pins" rem={pinsRem.toLocaleString()} pct={pinsStock>0?pinsRem/pinsStock:1}/>
              <WMini icon="🟢" label="Bags 10Rs" rem={bags10Rem} pct={bags10StockG>0?bags10RemG/bags10StockG:1}/>
              <WMini icon="🟡" label="Bags 20Rs" rem={bags20Rem} pct={bags20StockG>0?bags20RemG/bags20StockG:1}/>
              <WMini icon="🟠" label="Bags 50Rs" rem={bags50Rem} pct={bags50StockG>0?bags50RemG/bags50StockG:1}/>
            </div>
          </div>
        )}

        {/* ══ RAW STOCK ══ */}
        {tab==="Raw Stock"&&(
          <div>
            <PT title="Raw Stock" sub="Manage raw materials" icon="⊞"/>
            <div style={{...card,marginBottom:16}}>
              <div style={{fontWeight:700,color:C.primary,marginBottom:12,fontSize:13}}>+ Add New Item</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <label style={lbl}>Name<input style={inp} placeholder="e.g. Salt" value={rawForm.name} onChange={e=>setRawForm(p=>({...p,name:e.target.value}))}/></label>
                <label style={lbl}>Weight (g)<input style={inp} type="number" placeholder="800" value={rawForm.weightGrams} onChange={e=>setRawForm(p=>({...p,weightGrams:e.target.value}))}/></label>
                <label style={lbl}>Price/kg (Rs)<input style={inp} type="number" placeholder="200" value={rawForm.pricePerKg} onChange={e=>setRawForm(p=>({...p,pricePerKg:e.target.value}))}/></label>
              </div>
              <button onClick={addRaw} style={{...btn(C.primary),marginTop:12,fontSize:12}}>+ Add to Stock</button>
            </div>
            <ST>Current Stock</ST>
            {rawItems.map(r=>{const used=usedMap[r.id]||0,rem=Math.max(0,r.weightGrams-used),pct=r.weightGrams>0?rem/r.weightGrams:1;return(
              <div key={r.id} style={{...card,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:700}}>{r.name}</div>
                    <div style={{fontSize:11,color:C.textLight}}>{fmt(r.pricePerKg)}/kg · {fmt((r.weightGrams/1000)*r.pricePerKg)}</div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <Pill color={pct>0.5?C.green:pct>0.2?C.gold:C.red} pale={pct>0.5?C.greenPale:pct>0.2?C.goldPale:C.redPale}>{fmtG(rem)}</Pill>
                    <button onClick={()=>setRawItems(p=>p.filter(x=>x.id!==r.id))} style={{...btn(C.redPale,C.red),padding:"5px 10px",fontSize:11}}>✕</button>
                  </div>
                </div>
                <PB pct={pct}/>
                <div style={{display:"flex",gap:16,fontSize:10,color:C.textMid,marginTop:5}}>
                  <span>Total: <b>{fmtG(r.weightGrams)}</b></span>
                  <span>Used: <b style={{color:C.gold}}>{fmtG(used)}</b></span>
                  <span>Left: <b style={{color:pct>0.2?C.green:C.red}}>{fmtG(rem)}</b></span>
                </div>
              </div>
            );})}
          </div>
        )}

        {/* ══ PACKETS ══ */}
        {tab==="Packets"&&(
          <div>
            <PT title="Make Packets" sub="Record production with weight tracking" icon="⊡"/>

            {newPkts>0&&(
              <div style={{...card,marginBottom:14,background:C.primaryPale,border:`1px solid ${C.primary}30`}}>
                <div style={{fontWeight:700,color:C.primary,fontSize:12,marginBottom:10}}>📦 Wrapping needed for {newPkts} packets</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                  {[["📌 Pins",newPkts*PINS_PER_PKT,pinsRem],["🟢 Bags10",fq.p10,bags10Rem],["🟡 Bags20",fq.p20,bags20Rem],["🏷 Cards",newPkts,cardsRem]].map(([lbl2,need,avail])=>{const ok=avail>=need;return(
                    <div key={lbl2} style={{background:ok?C.greenPale:C.redPale,borderRadius:8,padding:"7px",textAlign:"center"}}>
                      <div style={{fontSize:9,color:C.textLight}}>{lbl2}</div>
                      <div style={{fontWeight:700,fontSize:12,color:ok?C.green:C.red}}>need {need}</div>
                      <div style={{fontSize:9,color:C.textMid}}>{avail} avail</div>
                    </div>
                  );})}
                </div>
              </div>
            )}

            <div style={{...card,marginBottom:16}}>
              <label style={{...lbl,marginBottom:12}}>Select Raw Material
                <select style={inp} value={pForm.rawId} onChange={e=>setPForm(p=>({...p,rawId:e.target.value}))}>
                  <option value="">— Choose —</option>
                  {rawItems.map(r=>{const rem=Math.max(0,r.weightGrams-(usedMap[r.id]||0));return <option key={r.id} value={r.id}>{r.name} — {fmtG(rem)} left</option>;})}
                </select>
              </label>
              {selRaw&&(
                <div style={{background:C.primaryPale,borderRadius:10,padding:"10px 12px",marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <b style={{color:C.primary,fontSize:12}}>{selRaw.name}</b>
                    <Pill color={selRemG<100?C.red:C.green} pale={selRemG<100?C.redPale:C.greenPale}>{fmtG(selRemG)} available</Pill>
                  </div>
                  <PB pct={selRaw.weightGrams>0?selRemG/selRaw.weightGrams:1}/>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {PKT_TYPES.map(t=>(
                  <div key={t.key} style={{background:t.pale,borderRadius:12,padding:"12px",border:`1.5px solid ${t.color}30`}}>
                    <div style={{fontWeight:700,color:t.color,marginBottom:10,fontSize:12}}>{t.icon} {t.label}</div>
                    <label style={{...lbl,marginBottom:8}}>g/pkt<input style={inp} type="number" placeholder="g" value={pForm[`g${t.key.slice(1)}`]} onChange={e=>setPForm(p=>({...p,[`g${t.key.slice(1)}`]:e.target.value}))}/></label>
                    <label style={lbl}>Qty<input style={inp} type="number" placeholder="0" value={pForm[`qty${t.key.slice(1)}`]} onChange={e=>setPForm(p=>({...p,[`qty${t.key.slice(1)}`]:e.target.value}))}/></label>
                    {fg[t.key]>0&&fq[t.key]>0&&<div style={{marginTop:6,fontSize:10,color:t.color,fontWeight:600}}>{fmtG(fg[t.key]*fq[t.key])}</div>}
                  </div>
                ))}
              </div>
              {selRaw&&(fq.p10||fq.p20||fq.p50)>0&&(
                <div style={{marginTop:12,padding:"10px 12px",background:pFormRem<0?C.redPale:C.greenPale,borderRadius:10,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  <div style={{fontSize:11}}><div style={{color:C.textLight,fontSize:9}}>Raw used</div><b>{fmtG(pFormUsed)}</b></div>
                  <div style={{fontSize:11}}><div style={{color:C.textLight,fontSize:9}}>After</div><b style={{color:pFormRem<0?C.red:C.green}}>{fmtG(Math.max(0,pFormRem))}</b></div>
                  <div style={{fontSize:11}}><div style={{color:C.textLight,fontSize:9}}>Revenue</div><b style={{color:C.green}}>{fmt((fq.p10/12)*DOZEN_PRICE.p10+(fq.p20/12)*DOZEN_PRICE.p20+(fq.p50/12)*DOZEN_PRICE.p50)}</b></div>
                </div>
              )}
              {pFormRem<0&&<div style={{marginTop:8,padding:"8px 12px",background:C.redPale,borderRadius:8,fontSize:12,color:C.red,fontWeight:600}}>⚠ Not enough stock!</div>}
              <button onClick={addPacket} disabled={pFormRem<0} style={{...btn(C.primary),marginTop:12,opacity:pFormRem<0?.4:1}}>✓ Record Production</button>
            </div>

            <ST>Production Log ({packets.length})</ST>
            {packets.length===0&&<Empty text="No packets recorded yet."/>}
            {[...packets].reverse().map(p=>(
              <div key={p.id} style={{...card,marginBottom:10,border:editId===p.id?`2px solid ${C.primary}`:undefined}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>{p.rawName}</div>
                    <div style={{fontSize:10,color:C.textLight}}>{p.date}</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {editId!==p.id&&<button onClick={()=>startEdit(p)} style={{...btn(C.primaryPale,C.primary),padding:"6px 12px",fontSize:11}}>✏ Edit</button>}
                    <button onClick={()=>delPacket(p.id)} style={{...btn(C.redPale,C.red),padding:"6px 10px",fontSize:11}}>✕</button>
                  </div>
                </div>
                {editId===p.id?(
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:10}}>
                      {PKT_TYPES.map(t=>(
                        <div key={t.key} style={{background:t.pale,borderRadius:10,padding:"10px",border:`1px solid ${t.color}30`}}>
                          <div style={{fontWeight:700,color:t.color,fontSize:11,marginBottom:8}}>{t.icon} {t.label}</div>
                          <label style={{...lbl,marginBottom:6}}>g/pkt<input style={inp} type="number" value={eForm[`g${t.key.slice(1)}`]} onChange={e=>setEForm(f=>({...f,[`g${t.key.slice(1)}`]:e.target.value}))}/></label>
                          <label style={lbl}>Qty<input style={inp} type="number" value={eForm[`qty${t.key.slice(1)}`]} onChange={e=>setEForm(f=>({...f,[`qty${t.key.slice(1)}`]:e.target.value}))}/></label>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>saveEdit(p.id)} style={{...btn(C.green),padding:"9px 20px"}}>✓ Save</button>
                      <button onClick={()=>setEditId(null)} style={{...btn(C.borderLight,C.textMid),padding:"9px 16px"}}>Cancel</button>
                    </div>
                  </div>
                ):(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                    {PKT_TYPES.map(t=>{const qty=p[`qty${t.key.slice(1)}`]||0,g=p[`g${t.key.slice(1)}`]||0;return(
                      <div key={t.key} style={{background:t.pale,borderRadius:10,padding:"10px"}}>
                        <div style={{fontSize:9,color:t.color,fontWeight:700,marginBottom:3}}>{t.icon} {t.label}</div>
                        <div style={{fontSize:20,fontWeight:800,color:t.color}}>{qty}</div>
                        <div style={{fontSize:9,color:C.textMid}}>{g}g/pkt</div>
                        <div style={{fontSize:9,color:C.textMid}}>{(qty/12).toFixed(1)} doz</div>
                      </div>
                    );})}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══ WRAPPING ══ */}
        {tab==="Wrapping"&&(
          <div>
            <PT title="Wrapping Materials" sub="Stock, prices and auto-deduction" icon="◻"/>
            <div style={{...card,marginBottom:14,background:C.primaryPale,border:`1px solid ${C.primary}25`}}>
              <div style={{fontWeight:700,color:C.primary,fontSize:12,marginBottom:8}}>📋 Auto-deduction per packet</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                {[["📌 Pins",`${PINS_PER_PKT} pins/pkt · ${PINS_PER_BOX}/box`],["🟢 Bag 10Rs",`${BAG_GPB.p10.toFixed(2)}g/pkt · 12=${BAG_12W.p10}g`],["🟡 Bag 20Rs",`${BAG_GPB.p20.toFixed(2)}g/pkt · 12=${BAG_12W.p20}g`],["🏷 Card",`${CARDS_PER_PKT}/pkt · ${CARDS_PER_PACK}/pack`],["🟠 Bag 50Rs",`${BAG_GPB.p50.toFixed(2)}g/pkt · 12=${BAG_12W.p50}g`]].map(([ic,r1])=>(
                  <div key={ic} style={{background:"white",borderRadius:8,padding:"8px 10px"}}>
                    <div style={{fontSize:12,marginBottom:2}}>{ic}</div>
                    <div style={{fontSize:10,fontWeight:700,color:C.primary}}>{r1}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:"grid",gap:12}}>
              {/* Stapler */}
              <WCard icon="📌" title="Stapler Boxes" border={C.textMid} note={`${PINS_PER_BOX} pins/box · ${PINS_PER_PKT} pins/pkt`}
                fields={[{label:"Price/box (Rs)",key:"stapler_price",val:wrap.stapler_price,ph:"30"},{label:"Boxes",key:"stapler_boxes",val:wrap.stapler_boxes,ph:"1"}]}
                onF={(k,v)=>setWrap(w=>({...w,[k]:v}))}
                stats={[["Total",`${pinsStock.toLocaleString()} pins`],["Used",`${pinsUsed}`],["Left",`${pinsRem.toLocaleString()}`],["Boxes left",`${(pinsRem/PINS_PER_BOX).toFixed(2)}`]]}
                pct={pinsStock>0?pinsRem/pinsStock:1} color={C.textMid} pale="#f1f5f9"
                cost={(wrap.stapler_boxes||0)*(wrap.stapler_price||0)}/>

              {/* Bags 10 */}
              <WCard icon="🟢" title="Plastic Bags — 10Rs Packets" border={C.green} note={`${BAG_GPB.p10.toFixed(2)}g/bag · 12 bags=${BAG_12W.p10}g`}
                fields={[{label:"Price/kg (Rs)",key:"bags10_price",val:wrap.bags10_price,ph:"1300"},{label:"Stock (kg)",key:"bags10_kg",val:wrap.bags10_kg,ph:"1"}]}
                onF={(k,v)=>setWrap(w=>({...w,[k]:v}))}
                stats={[["Total",`${Math.floor(bags10StockG/BAG_GPB.p10)}`],["Used",`${totals.p10}`],["Left",`${bags10Rem} bags`],["Cost/bag",`Rs ${((BAG_GPB.p10/1000)*(wrap.bags10_price||0)).toFixed(4)}`]]}
                pct={bags10StockG>0?bags10RemG/bags10StockG:1} color={C.green} pale={C.greenPale}
                cost={(wrap.bags10_kg||0)*(wrap.bags10_price||0)}/>

              {/* Bags 20 */}
              <WCard icon="🟡" title="Plastic Bags — 20Rs Packets" border={C.gold} note={`${BAG_GPB.p20.toFixed(2)}g/bag · 12 bags=${BAG_12W.p20}g`}
                fields={[{label:"Price/kg (Rs)",key:"bags20_price",val:wrap.bags20_price,ph:"1300"},{label:"Stock (kg)",key:"bags20_kg",val:wrap.bags20_kg,ph:"1"}]}
                onF={(k,v)=>setWrap(w=>({...w,[k]:v}))}
                stats={[["Total",`${Math.floor(bags20StockG/BAG_GPB.p20)}`],["Used",`${totals.p20}`],["Left",`${bags20Rem} bags`],["Cost/bag",`Rs ${((BAG_GPB.p20/1000)*(wrap.bags20_price||0)).toFixed(4)}`]]}
                pct={bags20StockG>0?bags20RemG/bags20StockG:1} color={C.gold} pale={C.goldPale}
                cost={(wrap.bags20_kg||0)*(wrap.bags20_price||0)}/>

              {/* Bags 50 */}
              <WCard icon="🟠" title="Plastic Bags — 50Rs Packets" border={C.orange} note={`${BAG_GPB.p50.toFixed(2)}g/bag · 12 bags=${BAG_12W.p50}g`}
                fields={[{label:"Price/kg (Rs)",key:"bags50_price",val:wrap.bags50_price,ph:"1300"},{label:"Stock (kg)",key:"bags50_kg",val:wrap.bags50_kg,ph:"1"}]}
                onF={(k,v)=>setWrap(w=>({...w,[k]:v}))}
                stats={[["Total",`${Math.floor(bags50StockG/BAG_GPB.p50)}`],["Used",`${totals.p50}`],["Left",`${bags50Rem} bags`],["Cost/bag",`Rs ${((BAG_GPB.p50/1000)*(wrap.bags50_price||0)).toFixed(4)}`]]}
                pct={bags50StockG>0?bags50RemG/bags50StockG:1} color={C.orange} pale={C.orangePale}
                cost={(wrap.bags50_kg||0)*(wrap.bags50_price||0)}/>

              {/* Cards */}
              <WCard icon="🏷" title="Cards / Labels" border={C.primary} note={`${CARDS_PER_PACK} cards/pack · ${CARDS_PER_PKT} card/pkt`}
                fields={[{label:"Price/pack (Rs)",key:"card_price",val:wrap.card_price,ph:"300"},{label:"Packs",key:"card_packs",val:wrap.card_packs,ph:"1"}]}
                onF={(k,v)=>setWrap(w=>({...w,[k]:v}))}
                stats={[["Total",`${cardsTotal}`],["Used",`${cardsUsed}`],["Left",`${cardsRem}`],["Packs left",`${(cardsRem/CARDS_PER_PACK).toFixed(2)}`]]}
                pct={cardsTotal>0?cardsRem/cardsTotal:1} color={C.primary} pale={C.primaryPale}
                cost={(wrap.card_packs||0)*(wrap.card_price||0)}/>

              {/* Total */}
              <div style={{...card,background:`linear-gradient(135deg,${C.primaryPale},${C.accentPale})`}}>
                <div style={{fontWeight:800,color:C.primary,marginBottom:12}}>📊 Total Investment</div>
                {[["📌 Stapler",(wrap.stapler_boxes||0)*(wrap.stapler_price||0)],["🟢 Bags 10Rs",(wrap.bags10_kg||0)*(wrap.bags10_price||0)],["🟡 Bags 20Rs",(wrap.bags20_kg||0)*(wrap.bags20_price||0)],["🟠 Bags 50Rs",(wrap.bags50_kg||0)*(wrap.bags50_price||0)],["🏷 Cards",(wrap.card_packs||0)*(wrap.card_price||0)]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                    <span style={{color:C.textMid}}>{k}</span><b>{fmt(v)}</b>
                  </div>
                ))}
                <div style={{marginTop:10,background:C.primary,borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{color:"rgba(255,255,255,.8)",fontSize:12}}>Grand Total</span>
                  <span style={{color:"#fff",fontSize:16,fontWeight:800}}>{fmt(totalWrapCost)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ SALES NOTEPAD ══ */}
        {tab==="Sales"&&(
          <div>
            <PT title="Sales Notepad" sub="Record daily sales and generate reports" icon="📊"/>

            {/* Add sale */}
            <div style={{...card,marginBottom:16}}>
              <div style={{fontWeight:700,color:C.primary,fontSize:13,marginBottom:12}}>+ Record Today's Sales</div>
              <label style={{...lbl,marginBottom:10}}>Date<input style={inp} type="date" value={saleForm.date} onChange={e=>setSaleForm(p=>({...p,date:e.target.value}))}/></label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:10}}>
                {PKT_TYPES.map(t=>(
                  <label key={t.key} style={lbl}>{t.icon} {t.label} sold
                    <input style={inp} type="number" placeholder="0" value={saleForm[`qty${t.key.slice(1)}`]} onChange={e=>setSaleForm(p=>({...p,[`qty${t.key.slice(1)}`]:e.target.value}))}/>
                  </label>
                ))}
              </div>
              <label style={{...lbl,marginBottom:10}}>Note (optional)
                <input style={inp} placeholder="e.g. Market sale, shop sale..." value={saleForm.note} onChange={e=>setSaleForm(p=>({...p,note:e.target.value}))}/>
              </label>
              {(parseInt(saleForm.qty10)||parseInt(saleForm.qty20)||parseInt(saleForm.qty50))>0&&(
                <div style={{padding:"8px 12px",background:C.greenPale,borderRadius:8,fontSize:11,marginBottom:10,color:C.green,fontWeight:600}}>
                  Revenue: {fmt(((parseInt(saleForm.qty10)||0)/12)*DOZEN_PRICE.p10+((parseInt(saleForm.qty20)||0)/12)*DOZEN_PRICE.p20+((parseInt(saleForm.qty50)||0)/12)*DOZEN_PRICE.p50)}
                </div>
              )}
              <button onClick={addSale} style={{...btn(C.primary)}}>✓ Save Sale</button>
            </div>

            {/* Summary report */}
            <ST>Stock Report — Today</ST>
            <div style={{...card,marginBottom:16,background:`linear-gradient(135deg,${C.primaryPale},#fff)`}}>
              <div style={{fontWeight:700,color:C.primary,marginBottom:12,fontSize:13}}>📋 Current Stock Status</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
                {PKT_TYPES.map(t=>{
                  const produced=totals[t.key];
                  const sold=totalSold[t.key.replace('p','p')];
                  const avail=Math.max(0,produced-sold);
                  return(
                    <div key={t.key} style={{background:t.pale,borderRadius:10,padding:"10px",textAlign:"center",border:`1px solid ${t.color}20`}}>
                      <div style={{fontSize:12,marginBottom:4}}>{t.icon} {t.label}</div>
                      <div style={{fontSize:20,fontWeight:800,color:t.color}}>{avail}</div>
                      <div style={{fontSize:9,color:C.textMid}}>available</div>
                      <div style={{fontSize:9,color:C.textLight,marginTop:2}}>made {produced} · sold {sold}</div>
                    </div>
                  );
                })}
              </div>
              <ST>Raw Materials Today</ST>
              {rawItems.map(r=>{const used=usedMap[r.id]||0,rem=Math.max(0,r.weightGrams-used),pct=r.weightGrams>0?rem/r.weightGrams:1;return(
                <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                  <span style={{fontWeight:600}}>{r.name}</span>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <Pill color={pct>0.5?C.green:pct>0.2?C.gold:C.red} pale={pct>0.5?C.greenPale:pct>0.2?C.goldPale:C.redPale}>{fmtG(rem)} left</Pill>
                  </div>
                </div>
              );})}
            </div>

            {/* Sales log by date */}
            <ST>Sales History</ST>
            {Object.keys(salesByDate).length===0&&<Empty text="No sales recorded yet."/>}
            {Object.entries(salesByDate).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,d])=>{
              const rev=(d.qty10/12)*DOZEN_PRICE.p10+(d.qty20/12)*DOZEN_PRICE.p20+(d.qty50/12)*DOZEN_PRICE.p50;
              return(
                <div key={date} style={{...card,marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <b style={{color:C.primary}}>{date}</b>
                    <Pill color={C.green} pale={C.greenPale}>{fmt(rev)}</Pill>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                    {PKT_TYPES.map(t=>(
                      <div key={t.key} style={{background:t.pale,borderRadius:8,padding:"8px",textAlign:"center"}}>
                        <div style={{fontSize:10,color:t.color,fontWeight:700}}>{t.icon} {t.label}</div>
                        <div style={{fontSize:18,fontWeight:800,color:t.color}}>{d[`qty${t.key.slice(1)}`]||0}</div>
                        <div style={{fontSize:9,color:C.textMid}}>{((d[`qty${t.key.slice(1)}`]||0)/12).toFixed(1)} doz</div>
                      </div>
                    ))}
                  </div>
                  {d.notes.length>0&&<div style={{marginTop:8,fontSize:11,color:C.textMid,fontStyle:"italic"}}>📝 {d.notes.join(" · ")}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ INVENTORY ══ */}
        {tab==="Inventory"&&(
          <div>
            <PT title="Inventory" sub="Complete stock overview" icon="≡"/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
              {PKT_TYPES.map(t=><KpiCard key={t.key} icon={t.icon} label={`${t.label} Pkts`} value={totals[t.key]} sub={`${(totals[t.key]/12).toFixed(1)} doz`} color={t.color} pale={t.pale}/>)}
            </div>
            <ST>Packet Log</ST>
            <div style={{...card,marginBottom:14,overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:400}}>
                <thead><tr style={{borderBottom:`2px solid ${C.border}`}}>{["Date","Material","10Rs","20Rs","50Rs","Revenue"].map(h=><th key={h} style={{textAlign:"left",color:C.textLight,fontWeight:600,padding:"7px 8px",fontSize:10}}>{h}</th>)}</tr></thead>
                <tbody>
                  {packets.map((p,i)=>(
                    <tr key={p.id} style={{borderBottom:`1px solid ${C.borderLight}`,background:i%2===0?"transparent":C.bg}}>
                      <td style={{padding:"8px",color:C.textMid,fontSize:10}}>{p.date}</td>
                      <td style={{padding:"8px",fontWeight:600}}>{p.rawName}</td>
                      <td style={{padding:"8px"}}><Pill color={C.green} pale={C.greenPale}>{p.qty10||0}</Pill></td>
                      <td style={{padding:"8px"}}><Pill color={C.gold} pale={C.goldPale}>{p.qty20||0}</Pill></td>
                      <td style={{padding:"8px"}}><Pill color={C.orange} pale={C.orangePale}>{p.qty50||0}</Pill></td>
                      <td style={{padding:"8px",fontWeight:700,color:C.green,fontSize:10}}>{fmt(((p.qty10||0)/12)*DOZEN_PRICE.p10+((p.qty20||0)/12)*DOZEN_PRICE.p20+((p.qty50||0)/12)*DOZEN_PRICE.p50)}</td>
                    </tr>
                  ))}
                  {packets.length===0&&<tr><td colSpan={6} style={{padding:"20px",textAlign:"center",color:C.textLight}}>No packets yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <ST>Raw Materials</ST>
            <div style={{...card,marginBottom:14,overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:360}}>
                <thead><tr style={{borderBottom:`2px solid ${C.border}`}}>{["Item","Total","Used","Remaining","Value"].map(h=><th key={h} style={{textAlign:"left",color:C.textLight,fontWeight:600,padding:"7px 8px",fontSize:10}}>{h}</th>)}</tr></thead>
                <tbody>
                  {rawItems.map((r,i)=>{const u=usedMap[r.id]||0,rem=Math.max(0,r.weightGrams-u),pct=r.weightGrams>0?rem/r.weightGrams:1;return(
                    <tr key={r.id} style={{borderBottom:`1px solid ${C.borderLight}`,background:i%2===0?"transparent":C.bg}}>
                      <td style={{padding:"8px",fontWeight:600}}>{r.name}</td>
                      <td style={{padding:"8px",color:C.textMid,fontSize:10}}>{fmtG(r.weightGrams)}</td>
                      <td style={{padding:"8px",color:C.gold,fontSize:10}}>{fmtG(u)}</td>
                      <td style={{padding:"8px"}}><Pill color={pct>0.5?C.green:pct>0.2?C.gold:C.red} pale={pct>0.5?C.greenPale:pct>0.2?C.goldPale:C.redPale}>{fmtG(rem)}</Pill></td>
                      <td style={{padding:"8px",fontWeight:700,color:C.primary,fontSize:10}}>{fmt((r.weightGrams/1000)*r.pricePerKg)}</td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
            <ST>Wrapping Summary</ST>
            <div style={{...card,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["📌 Pins",`${pinsRem.toLocaleString()} left`],["🟢 Bags 10Rs",`${bags10Rem} left`],["🟡 Bags 20Rs",`${bags20Rem} left`],["🟠 Bags 50Rs",`${bags50Rem} left`],["🏷 Cards",`${cardsRem} left`]].map(([k,v])=>(
                <div key={k} style={{background:C.bg,borderRadius:8,padding:"10px 12px",display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:12,color:C.textMid}}>{k}</span><b style={{fontSize:12,color:C.primary}}>{v}</b>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ CALCULATOR ══ */}
        {tab==="Calculator"&&(
          <div>
            <PT title="Profit Calculator" sub="Enter target profit → get grams per packet" icon="∑"/>

            <div style={{...card,marginBottom:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <label style={lbl}>Raw Material
                  <select style={inp} value={calcForm.rawId} onChange={e=>setCalcForm(p=>({...p,rawId:e.target.value}))}>
                    <option value="">— Choose —</option>
                    {rawItems.map(r=><option key={r.id} value={r.id}>{r.name} ({fmt(r.pricePerKg)}/kg)</option>)}
                  </select>
                </label>
                <label style={lbl}>Weight to Use (g)
                  <input style={inp} type="number" placeholder="e.g. 1000" value={calcForm.wg} onChange={e=>setCalcForm(p=>({...p,wg:e.target.value}))}/>
                </label>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <label style={lbl}>Packet Type
                  <select style={inp} value={calcForm.pktType} onChange={e=>setCalcForm(p=>({...p,pktType:e.target.value}))}>
                    {PKT_TYPES.map(t=><option key={t.key} value={t.key}>{t.icon} {t.label} Packet (sell {fmt(PER_PKT[t.key])}/pkt)</option>)}
                  </select>
                </label>
                <label style={lbl}>Target Profit per Packet (Rs)
                  <input style={inp} type="number" placeholder="e.g. 4" value={calcForm.targetProfit} onChange={e=>setCalcForm(p=>({...p,targetProfit:e.target.value}))}/>
                </label>
              </div>
            </div>

            {calcResult&&ci&&(
              <div>
                <div style={{...card,background:`linear-gradient(135deg,${C.primaryPale},${C.accentPale})`,marginBottom:14,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontWeight:700,color:C.primary}}>{ci.name}</span>
                  <Pill color={C.primary} pale={C.primaryPale}>{fmtG(cw)}</Pill>
                  <Pill color={C.accent} pale={C.accentPale}>{fmt(ci.pricePerKg)}/kg</Pill>
                  <span style={{marginLeft:"auto",fontSize:13,fontWeight:700}}>Input cost: <span style={{color:C.primary}}>{fmt((cw/1000)*ci.pricePerKg)}</span></span>
                </div>

                <div style={{...card,borderTop:`3px solid ${PKT_TYPES.find(t=>t.key===pt)?.color}`}}>
                  <div style={{fontWeight:800,color:PKT_TYPES.find(t=>t.key===pt)?.color,marginBottom:14,fontSize:14}}>
                    {PKT_TYPES.find(t=>t.key===pt)?.icon} {PKT_TYPES.find(t=>t.key===pt)?.label} — Target: {fmt(targetProfit)}/pkt
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                    {[["Sell price",fmt(sellPPkt)],["Raw budget/pkt",fmt(calcResult.rawBudget)],["Pkg cost/pkt",fmt(calcResult.pkgCost)],["✅ Grams/pkt",`${calcResult.gPerPkt.toFixed(2)} g`],["Total packets",calcResult.numPkts],["Total dozens",calcResult.dozens.toFixed(1)],["Total revenue",fmt(calcResult.revenue)],["Net profit",fmt(calcResult.netProfit)]].map(([k,v])=>(
                      <div key={k} style={{background:k==="✅ Grams/pkt"?C.greenPale:k==="Net profit"?C.greenPale:C.bg,borderRadius:8,padding:"10px 12px",border:k==="✅ Grams/pkt"?`2px solid ${C.green}`:undefined}}>
                        <div style={{fontSize:10,color:C.textLight,marginBottom:3}}>{k}</div>
                        <div style={{fontSize:14,fontWeight:700,color:k==="✅ Grams/pkt"?C.green:k==="Net profit"?C.green:C.text}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{background:C.primary,borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginBottom:4}}>To earn {fmt(targetProfit)}/packet, use</div>
                    <div style={{fontSize:28,fontWeight:800,color:"#fff"}}>{calcResult.gPerPkt.toFixed(2)} grams</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginTop:2}}>per {PKT_TYPES.find(t=>t.key===pt)?.label} packet</div>
                  </div>
                </div>
              </div>
            )}
            {ci&&cw>0&&targetProfit>0&&!calcResult&&(
              <div style={{...card,background:C.redPale,textAlign:"center",color:C.red}}>
                <div style={{fontSize:24,marginBottom:8}}>⚠️</div>
                <div style={{fontWeight:700}}>Target profit too high!</div>
                <div style={{fontSize:12,marginTop:4}}>Not achievable with current selling price of {fmt(sellPPkt)}/pkt</div>
              </div>
            )}
            {!ci&&<Empty text="Select a raw material and enter target profit to calculate grams per packet."/>}
          </div>
        )}

      </main>
    </div>
  );
}

// ── Reusable components ───────────────────────────────────────────────────────
function PT({title,sub,icon}){return(
  <div style={{marginBottom:16}}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:3}}>
      <span style={{fontSize:18,color:C.primary}}>{icon}</span>
      <h1 style={{margin:0,fontSize:18,fontWeight:800,color:C.text}}>{title}</h1>
    </div>
    <p style={{margin:0,fontSize:11,color:C.textLight,marginLeft:28}}>{sub}</p>
  </div>
);}
function ST({children}){return <div style={{fontWeight:700,fontSize:12,color:C.primary,marginBottom:10,marginTop:4,display:"flex",alignItems:"center",gap:6}}><span style={{width:3,height:14,background:C.primary,borderRadius:2,display:"inline-block",flexShrink:0}}></span>{children}</div>;}
function KpiCard({icon,label,value,sub,color,pale}){return(
  <div style={{...{background:"#fff",borderRadius:12,border:`1px solid #d4edda`,padding:"12px",boxShadow:`0 2px 8px rgba(46,125,82,0.07)`},background:`linear-gradient(135deg,${pale},#fff)`,borderTop:`3px solid ${color}`}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
      <span style={{fontSize:20}}>{icon}</span>
      <span style={{fontSize:8,color:C.textLight,letterSpacing:.5,fontWeight:600,textTransform:"uppercase",textAlign:"right"}}>{label}</span>
    </div>
    <div style={{fontSize:22,fontWeight:800,color,lineHeight:1}}>{value}</div>
    <div style={{fontSize:10,color:C.textMid,marginTop:3}}>{sub}</div>
  </div>
);}
function Pill({children,color,pale}){return <span style={{background:pale,color,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>{children}</span>;}
function PB({pct,color}){const c=color||(pct>0.5?C.green:pct>0.2?C.gold:C.red);return(<div style={{height:5,background:C.borderLight,borderRadius:4,overflow:"hidden"}}><div style={{height:5,borderRadius:4,width:`${Math.max(0,Math.min(100,pct*100))}%`,background:c,transition:"width .4s ease"}}/></div>);}
function WMini({icon,label,rem,pct}){const col=pct>0.5?C.green:pct>0.2?C.gold:C.red,pale=pct>0.5?C.greenPale:pct>0.2?C.goldPale:C.redPale;return(<div style={{...{background:"#fff",borderRadius:12,border:`1px solid #d4edda`,padding:"12px",boxShadow:`0 2px 8px rgba(46,125,82,0.07)`},textAlign:"center"}}><div style={{fontSize:20,marginBottom:4}}>{icon}</div><div style={{fontSize:9,color:C.textLight,marginBottom:3}}>{label}</div><div style={{fontSize:16,fontWeight:800,color:col}}>{rem}</div><div style={{marginTop:5}}><PB pct={pct}/></div></div>);}
function Empty({text}){return(<div style={{textAlign:"center",padding:"30px 16px",color:C.textLight}}><div style={{fontSize:32,marginBottom:8}}>📭</div><div style={{fontSize:12}}>{text}</div></div>);}
function WCard({icon,title,border,note,fields,onF,stats,pct,color,pale,cost}){return(
  <div style={{background:"#fff",borderRadius:14,border:`1px solid #d4edda`,padding:"16px",boxShadow:`0 2px 12px rgba(46,125,82,0.08)`,borderLeft:`4px solid ${border}`}}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
      <div style={{width:40,height:40,borderRadius:10,background:pale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{icon}</div>
      <div><div style={{fontWeight:700,fontSize:13}}>{title}</div><div style={{fontSize:10,color:C.textLight,marginTop:1}}>{note}</div></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
      {fields.map(f=>(
        <label key={f.key} style={{display:"flex",flexDirection:"column",gap:5,fontSize:11,color:C.textMid,fontWeight:600}}>
          {f.label}<input style={{background:"#f8fdfb",border:`1.5px solid #d4edda`,color:C.text,padding:"9px 12px",borderRadius:9,fontSize:13,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"}} type="number" placeholder={f.ph} value={f.val??""} onChange={e=>onF(f.key,e.target.value===""?"":parseFloat(e.target.value)||0)}/>
        </label>
      ))}
    </div>
    <PB pct={pct} color={color}/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginTop:10}}>
      {stats.map(([k,v])=>(
        <div key={k} style={{background:pale,borderRadius:7,padding:"7px 8px",textAlign:"center"}}>
          <div style={{fontSize:8,color:C.textLight,marginBottom:2,textTransform:"uppercase",letterSpacing:.3}}>{k}</div>
          <div style={{fontWeight:700,fontSize:11,color}}>{v}</div>
        </div>
      ))}
    </div>
    {cost>0&&<div style={{marginTop:8,padding:"7px 10px",background:pale,borderRadius:7,fontSize:11,display:"flex",justifyContent:"space-between"}}><span style={{color:C.textMid}}>Stock cost</span><b style={{color}}>{`Rs ${Number(cost).toLocaleString("en-PK",{minimumFractionDigits:0,maximumFractionDigits:2})}`}</b></div>}
  </div>
);}