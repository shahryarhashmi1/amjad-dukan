import { useState, useMemo, useEffect } from "react";

const SELL_PER_DOZEN_20 = 160, SELL_PER_DOZEN_50 = 420;
const PER_PACKET_20 = SELL_PER_DOZEN_20 / 12, PER_PACKET_50 = SELL_PER_DOZEN_50 / 12;
const COSTS = { p20:{rawMin:6,rawMax:7.5,pkgMin:1.5,pkgMax:2}, p50:{rawMin:24,rawMax:28,pkgMin:2.5,pkgMax:3.5} };
const SCENARIOS = [
  {label:"Low", rawFn:c=>c.rawMax,pkgFn:c=>c.pkgMax},
  {label:"Mid", rawFn:c=>(c.rawMin+c.rawMax)/2,pkgFn:c=>(c.pkgMin+c.pkgMax)/2},
  {label:"High",rawFn:c=>c.rawMin,pkgFn:c=>c.pkgMin},
];

// Fixed ratios
const PINS_PER_BOX    = 1000;
const PINS_PER_PACKET = 2;      // each packet uses 2 stapler pins
const BAG20_12W = 10;           // 12 bags = 10g
const BAG50_12W = 12;           // 12 bags = 12g
const BAG20_GPB = BAG20_12W / 12;
const BAG50_GPB = BAG50_12W / 12;
const CARDS_PER_PACK = 620;
const CARDS_PER_PACKET = 1;     // each packet uses 1 card

const DEFAULT_RAW=[{id:1,name:"Salt",weightGrams:5000,pricePerKg:80},{id:2,name:"Sugar",weightGrams:10000,pricePerKg:140},{id:3,name:"Red Pepper",weightGrams:3000,pricePerKg:600},{id:4,name:"Sesame Seeds",weightGrams:2000,pricePerKg:450}];
const DEFAULT_WRAP={
  stapler_boxes:1, stapler_price:30,
  bags20_kg:1,     bags20_price:1300,
  bags50_kg:1,     bags50_price:1300,
  card_packs:1,    card_price:300,
};

const TABS=[{id:"Dashboard",icon:"◈"},{id:"Raw Stock",icon:"⊞"},{id:"Make Packets",icon:"⊡"},{id:"Wrapping",icon:"◻"},{id:"Inventory",icon:"≡"},{id:"Calculator",icon:"∑"}];
const fmt=n=>`Rs ${Number(n).toLocaleString("en-PK",{minimumFractionDigits:0,maximumFractionDigits:2})}`;
const fmtG=g=>g>=1000?`${(g/1000).toFixed(2)} kg`:`${parseFloat(g).toFixed(1)} g`;

async function load(k,fb){try{const r=await window.storage.get(k);return r?JSON.parse(r.value):fb;}catch{return fb;}}
async function save(k,v){try{await window.storage.set(k,JSON.stringify(v));}catch{}}

function calcScenario(wg,ppk,co,spp,spd){
  return SCENARIOS.map(sc=>{
    const rb=sc.rawFn(co),pc=sc.pkgFn(co),g=(rb/ppk)*1000,n=Math.floor(wg/g),doz=n/12,rev=doz*spd,profit=rev-n*rb-n*pc;
    return{label:sc.label,rawBudget:rb,pkgCost:pc,profitPerPkt:spp-rb-pc,grams:g,numPkts:n,dozens:doz,revenue:rev,profit};
  });
}
function usedGrams(packets,rawItems){
  const m={};rawItems.forEach(r=>{m[r.id]=0;});
  packets.forEach(p=>{if(p.rawId&&m[p.rawId]!==undefined)m[p.rawId]+=(p.gramsPerPkt20*p.qty20)+(p.gramsPerPkt50*p.qty50);});
  return m;
}

const C={
  bg:"#f0faf4",card:"#ffffff",border:"#d4edda",borderLight:"#e8f5e9",
  primary:"#2e7d52",primaryLight:"#43a66e",primaryPale:"#e8f5ee",
  accent:"#00897b",accentPale:"#e0f2f1",
  gold:"#f59e0b",goldPale:"#fffbeb",
  red:"#ef4444",redPale:"#fef2f2",
  text:"#1a2e22",textMid:"#4a6b55",textLight:"#8aab93",
  green:"#16a34a",greenPale:"#dcfce7",
  teal:"#0d9488",tealPale:"#ccfbf1",
  shadow:"rgba(46,125,82,0.08)",
};
const card={background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:"20px",boxShadow:`0 2px 12px ${C.shadow}`};
const inp={background:"#f8fdfb",border:`1.5px solid ${C.border}`,color:C.text,padding:"10px 14px",borderRadius:10,fontSize:13,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color .2s"};
const lbl={display:"flex",flexDirection:"column",gap:6,fontSize:11,color:C.textMid,fontWeight:600,letterSpacing:.5};
const btn=(bg,col="#fff")=>({background:bg,color:col,border:"none",padding:"11px 20px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",letterSpacing:.5,transition:"opacity .15s",width:"100%"});
const smBtn={background:C.primaryPale,color:C.primary,border:`1px solid ${C.border}`,width:26,height:26,borderRadius:8,cursor:"pointer",fontSize:14,fontFamily:"monospace",display:"flex",alignItems:"center",justifyContent:"center"};

export default function App(){
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState("Dashboard");
  const [rawItems,setRawItems]=useState(DEFAULT_RAW);
  const [rawForm,setRawForm]=useState({name:"",weightGrams:"",pricePerKg:""});
  const [wrap,setWrap]=useState(DEFAULT_WRAP);
  const [packets,setPackets]=useState([]);
  const [pForm,setPForm]=useState({rawId:"",qty20:"",qty50:"",g20:"",g50:""});
  const [editId,setEditId]=useState(null);
  const [eForm,setEForm]=useState({qty20:"",qty50:"",g20:"",g50:""});
  const [calcForm,setCalcForm]=useState({rawId:"",wg:""});

  useEffect(()=>{(async()=>{
    const[ri,wr,pk]=await Promise.all([load("amjad:rawItems",DEFAULT_RAW),load("amjad:wrapping3",DEFAULT_WRAP),load("amjad:packets2",[])]);
    setRawItems(ri);setWrap(wr);setPackets(pk);setReady(true);
  })();},[]);
  useEffect(()=>{if(ready)save("amjad:rawItems",rawItems);},[rawItems,ready]);
  useEffect(()=>{if(ready)save("amjad:wrapping3",wrap);},[wrap,ready]);
  useEffect(()=>{if(ready)save("amjad:packets2",packets);},[packets,ready]);

  const usedMap=useMemo(()=>usedGrams(packets,rawItems),[packets,rawItems]);
  const totalP20=useMemo(()=>packets.reduce((s,p)=>s+(p.qty20||0),0),[packets]);
  const totalP50=useMemo(()=>packets.reduce((s,p)=>s+(p.qty50||0),0),[packets]);
  const totalPkts=totalP20+totalP50;
  const totalRev=useMemo(()=>(totalP20/12)*SELL_PER_DOZEN_20+(totalP50/12)*SELL_PER_DOZEN_50,[totalP20,totalP50]);

  // ── Wrapping consumption ──────────────────────────────────────────────────
  // Stapler pins
  const totalPinsStock  = wrap.stapler_boxes * PINS_PER_BOX;
  const totalPinsUsed   = totalPkts * PINS_PER_PACKET;
  const totalPinsRem    = Math.max(0, totalPinsStock - totalPinsUsed);
  const staplerBoxesRem = totalPinsRem / PINS_PER_BOX;

  // Bags 20
  const bags20PricePerKg = wrap.bags20_price || 1300;
  const bags20StockG  = wrap.bags20_kg * 1000;
  const bags20UsedG   = totalP20 * BAG20_GPB;
  const bags20RemG    = Math.max(0, bags20StockG - bags20UsedG);
  const bags20RemPkts = Math.floor(bags20RemG / BAG20_GPB);
  const bags20CPB     = (BAG20_GPB / 1000) * bags20PricePerKg;

  // Bags 50
  const bags50PricePerKg = wrap.bags50_price || 1300;
  const bags50StockG  = wrap.bags50_kg * 1000;
  const bags50UsedG   = totalP50 * BAG50_GPB;
  const bags50RemG    = Math.max(0, bags50StockG - bags50UsedG);
  const bags50RemPkts = Math.floor(bags50RemG / BAG50_GPB);
  const bags50CPB     = (BAG50_GPB / 1000) * bags50PricePerKg;

  // Cards
  const cardPricePerPack = wrap.card_price || 300;
  const cardsTotal  = wrap.card_packs * CARDS_PER_PACK;
  const cardsUsed   = totalPkts * CARDS_PER_PACKET;
  const cardsRem    = Math.max(0, cardsTotal - cardsUsed);
  const cardPacksRem= cardsRem / CARDS_PER_PACK;

  // Packet form helpers
  const selRaw=rawItems.find(r=>r.id===parseInt(pForm.rawId));
  const selRemG=selRaw?Math.max(0,selRaw.weightGrams-(usedMap[selRaw.id]||0)):0;
  const fg20=parseFloat(pForm.g20)||0,fg50=parseFloat(pForm.g50)||0,fq20=parseInt(pForm.qty20)||0,fq50=parseInt(pForm.qty50)||0;
  const pFormUsed=fq20*fg20+fq50*fg50,pFormRem=selRemG-pFormUsed;
  const newPkts=fq20+fq50;
  const newPinsNeeded=newPkts*PINS_PER_PACKET, newCardsNeeded=newPkts*CARDS_PER_PACKET;
  const newBags20Needed=fq20*BAG20_GPB, newBags50Needed=fq50*BAG50_GPB;

  function wUpdate(key,val){setWrap(w=>({...w,[key]:val}));}
  function addRaw(){if(!rawForm.name||!rawForm.weightGrams||!rawForm.pricePerKg)return;setRawItems(p=>[...p,{id:Date.now(),name:rawForm.name,weightGrams:parseFloat(rawForm.weightGrams),pricePerKg:parseFloat(rawForm.pricePerKg)}]);setRawForm({name:"",weightGrams:"",pricePerKg:""});}
  function addPacket(){if(!selRaw||(!fq20&&!fq50)||pFormRem<0)return;setPackets(p=>[...p,{id:Date.now(),rawId:selRaw.id,rawName:selRaw.name,qty20:fq20,qty50:fq50,gramsPerPkt20:fg20,gramsPerPkt50:fg50,date:new Date().toLocaleDateString("en-PK")}]);setPForm({rawId:"",qty20:"",qty50:"",g20:"",g50:""});}
  function startEdit(p){setEditId(p.id);setEForm({qty20:p.qty20,qty50:p.qty50,g20:p.gramsPerPkt20,g50:p.gramsPerPkt50});}
  function saveEdit(id){setPackets(p=>p.map(x=>x.id===id?{...x,qty20:parseInt(eForm.qty20)||0,qty50:parseInt(eForm.qty50)||0,gramsPerPkt20:parseFloat(eForm.g20)||0,gramsPerPkt50:parseFloat(eForm.g50)||0}:x));setEditId(null);}
  function delPacket(id){setPackets(p=>p.filter(x=>x.id!==id));if(editId===id)setEditId(null);}

  const ci=rawItems.find(r=>r.id===parseInt(calcForm.rawId)),cw=parseFloat(calcForm.wg);
  const cr20=ci&&cw>0?calcScenario(cw,ci.pricePerKg,COSTS.p20,PER_PACKET_20,SELL_PER_DOZEN_20):null;
  const cr50=ci&&cw>0?calcScenario(cw,ci.pricePerKg,COSTS.p50,PER_PACKET_50,SELL_PER_DOZEN_50):null;

  const totalWrapCost=(wrap.stapler_boxes*(wrap.stapler_price||0))+(wrap.bags20_kg*(wrap.bags20_price||0))+(wrap.bags50_kg*(wrap.bags50_price||0))+(wrap.card_packs*(wrap.card_price||0));

  if(!ready)return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${C.primaryPale},${C.accentPale})`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <div style={{width:48,height:48,borderRadius:"50%",border:`4px solid ${C.border}`,borderTop:`4px solid ${C.primary}`,animation:"spin 1s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{color:C.primary,fontWeight:700,fontSize:14,letterSpacing:1}}>Loading Amjad Dukan…</span>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.text}}>
      <style>{`input:focus,select:focus{border-color:${C.primary}!important;box-shadow:0 0 0 3px ${C.primaryPale};}button:hover{opacity:.88;}::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-track{background:${C.borderLight};}::-webkit-scrollbar-thumb{background:${C.primary};border-radius:4px;}`}</style>

      <header style={{background:`linear-gradient(135deg,${C.primary} 0%,${C.accent} 100%)`,padding:"0 24px",boxShadow:"0 4px 20px rgba(46,125,82,.25)",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",alignItems:"center",gap:16,height:68}}>
          <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🏪</div>
          <div>
            <div style={{fontSize:20,fontWeight:800,color:"#fff",letterSpacing:.5}}>Amjad Dukan</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.7)",letterSpacing:2,textTransform:"uppercase"}}>Packet Business · امجد دکان</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:12}}>
            {[[SELL_PER_DOZEN_20,"20Rs"],[SELL_PER_DOZEN_50,"50Rs"]].map(([doz,lbl2])=>(
              <div key={lbl2} style={{background:"rgba(255,255,255,.15)",borderRadius:10,padding:"6px 14px",textAlign:"center",backdropFilter:"blur(10px)"}}>
                <div style={{fontSize:8,color:"rgba(255,255,255,.65)",letterSpacing:1.5,textTransform:"uppercase"}}>{lbl2} / dozen</div>
                <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>{fmt(doz)}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <nav style={{background:C.card,borderBottom:`1px solid ${C.border}`,boxShadow:`0 2px 8px ${C.shadow}`,position:"sticky",top:68,zIndex:99}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",overflowX:"auto",padding:"0 8px"}}>
          {TABS.map(t=>{const active=tab===t.id;return(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:7,padding:"14px 18px",background:"transparent",border:"none",cursor:"pointer",fontSize:12,fontWeight:active?700:500,color:active?C.primary:C.textMid,fontFamily:"inherit",whiteSpace:"nowrap",borderBottom:active?`2.5px solid ${C.primary}`:"2.5px solid transparent",transition:"all .2s",letterSpacing:.3}}>
              <span style={{fontSize:14}}>{t.icon}</span>{t.id}
            </button>
          );})}
        </div>
      </nav>

      <main style={{maxWidth:960,margin:"0 auto",padding:"24px 16px 40px"}}>

        {/* ══ DASHBOARD ══ */}
        {tab==="Dashboard"&&(
          <div>
            <PageTitle icon="◈" title="Overview" sub="Your business at a glance"/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:24}}>
              <KpiCard icon="🟡" label="20Rs Packets" value={totalP20} sub={`${(totalP20/12).toFixed(1)} dozen`} color={C.gold} pale={C.goldPale}/>
              <KpiCard icon="🟠" label="50Rs Packets" value={totalP50} sub={`${(totalP50/12).toFixed(1)} dozen`} color={C.accent} pale={C.accentPale}/>
              <KpiCard icon="💰" label="Total Revenue" value={fmt(totalRev)} sub="if all sold" color={C.green} pale={C.greenPale}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
              <PricingCard type="20" sell={PER_PACKET_20} raw="6–7.5" pkg="1.5–2" profit="3.83–5.83" color={C.gold} pale={C.goldPale}/>
              <PricingCard type="50" sell={PER_PACKET_50} raw="24–28" pkg="2.5–3.5" profit="3.5–8.5" color={C.accent} pale={C.accentPale}/>
            </div>
            <SectionTitle>Raw Materials Stock</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>
              {rawItems.map(r=>{const used=usedMap[r.id]||0,rem=Math.max(0,r.weightGrams-used),pct=r.weightGrams>0?rem/r.weightGrams:1;return(
                <div key={r.id} style={card}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div><div style={{fontWeight:700,fontSize:14}}>{r.name}</div><div style={{fontSize:11,color:C.textLight,marginTop:2}}>{fmt(r.pricePerKg)}/kg</div></div>
                    <Pill color={pct>0.5?C.green:pct>0.2?C.gold:C.red} pale={pct>0.5?C.greenPale:pct>0.2?C.goldPale:C.redPale}>{fmtG(rem)} left</Pill>
                  </div>
                  <ProgressBar pct={pct}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textLight,marginTop:6}}>
                    <span>Stock: {fmtG(r.weightGrams)}</span><span>Used: {fmtG(used)}</span>
                  </div>
                </div>
              );})}
            </div>
            <SectionTitle>Wrapping Stock</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
              <WrapMini icon="📌" label="Stapler Pins" rem={totalPinsRem.toLocaleString()} unit="pins" pct={totalPinsStock>0?totalPinsRem/totalPinsStock:1}/>
              <WrapMini icon="🟡" label="Bags 20Rs" rem={`${bags20RemPkts}`} unit="bags" pct={bags20StockG>0?bags20RemG/bags20StockG:1}/>
              <WrapMini icon="🟠" label="Bags 50Rs" rem={`${bags50RemPkts}`} unit="bags" pct={bags50StockG>0?bags50RemG/bags50StockG:1}/>
              <WrapMini icon="🏷" label="Cards" rem={`${cardsRem}`} unit="cards" pct={cardsTotal>0?cardsRem/cardsTotal:1}/>
            </div>
          </div>
        )}

        {/* ══ RAW STOCK ══ */}
        {tab==="Raw Stock"&&(
          <div>
            <PageTitle icon="⊞" title="Raw Stock" sub="Manage your raw materials"/>
            <div style={{...card,marginBottom:24}}>
              <div style={{fontSize:14,fontWeight:700,color:C.primary,marginBottom:16}}>+ Add New Item</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <label style={lbl}>Item Name<input style={inp} placeholder="e.g. Salt, Walnut…" value={rawForm.name} onChange={e=>setRawForm(p=>({...p,name:e.target.value}))}/></label>
                <label style={lbl}>Weight (grams)<input style={inp} type="number" placeholder="e.g. 800" value={rawForm.weightGrams} onChange={e=>setRawForm(p=>({...p,weightGrams:e.target.value}))}/></label>
                <label style={lbl}>Price per KG (Rs)<input style={inp} type="number" placeholder="e.g. 200" value={rawForm.pricePerKg} onChange={e=>setRawForm(p=>({...p,pricePerKg:e.target.value}))}/></label>
              </div>
              {rawForm.name&&rawForm.weightGrams&&rawForm.pricePerKg&&(
                <div style={{marginTop:12,padding:"10px 14px",background:C.greenPale,borderRadius:10,fontSize:11,color:C.green,fontWeight:600}}>💡 Stock cost: {fmt((parseFloat(rawForm.weightGrams)/1000)*parseFloat(rawForm.pricePerKg))}</div>
              )}
              <button onClick={addRaw} style={{...btn(C.primary),marginTop:14,width:"auto",padding:"11px 28px"}}>+ Add to Stock</button>
            </div>
            <SectionTitle>Current Stock ({rawItems.length} items)</SectionTitle>
            {rawItems.length===0&&<Empty text="No items added yet."/>}
            <div style={{display:"grid",gap:12}}>
              {rawItems.map(r=>{const used=usedMap[r.id]||0,rem=Math.max(0,r.weightGrams-used),pct=r.weightGrams>0?rem/r.weightGrams:1;return(
                <div key={r.id} style={{...card,display:"flex",gap:16,alignItems:"center"}}>
                  <div style={{width:44,height:44,borderRadius:12,background:C.primaryPale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🌿</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <span style={{fontWeight:700,fontSize:14}}>{r.name}</span>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <Pill color={pct>0.5?C.green:pct>0.2?C.gold:C.red} pale={pct>0.5?C.greenPale:pct>0.2?C.goldPale:C.redPale}>{fmtG(rem)} left</Pill>
                        <button onClick={()=>setRawItems(p=>p.filter(x=>x.id!==r.id))} style={{background:C.redPale,color:C.red,border:"none",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:11}}>✕ Remove</button>
                      </div>
                    </div>
                    <ProgressBar pct={pct}/>
                    <div style={{display:"flex",gap:20,fontSize:11,color:C.textMid,marginTop:6}}>
                      <span>Total: <b>{fmtG(r.weightGrams)}</b></span>
                      <span>Used: <b style={{color:C.gold}}>{fmtG(used)}</b></span>
                      <span>Remaining: <b style={{color:pct>0.2?C.green:C.red}}>{fmtG(rem)}</b></span>
                      <span style={{marginLeft:"auto"}}>{fmt(r.pricePerKg)}/kg · <b style={{color:C.primary}}>{fmt((r.weightGrams/1000)*r.pricePerKg)}</b></span>
                    </div>
                  </div>
                </div>
              );})}
            </div>
          </div>
        )}

        {/* ══ MAKE PACKETS ══ */}
        {tab==="Make Packets"&&(
          <div>
            <PageTitle icon="⊡" title="Make Packets" sub="Record production — wrapping materials deducted automatically"/>

            {/* Wrapping availability warning */}
            {newPkts>0&&(
              <div style={{...card,marginBottom:16,background:C.primaryPale,border:`1px solid ${C.primary}30`}}>
                <div style={{fontWeight:700,color:C.primary,fontSize:12,marginBottom:10}}>📦 Wrapping needed for {newPkts} packet{newPkts!==1?"s":""}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                  {[
                    ["📌 Pins",newPinsNeeded,totalPinsRem,"pins"],
                    ["🟡 Bags 20Rs",fq20,bags20RemPkts,"bags"],
                    ["🟠 Bags 50Rs",fq50,bags50RemPkts,"bags"],
                    ["🏷 Cards",newCardsNeeded,cardsRem,"cards"],
                  ].map(([label,need,avail,unit])=>{const ok=avail>=need;return(
                    <div key={label} style={{background:ok?C.greenPale:C.redPale,borderRadius:10,padding:"9px 10px",textAlign:"center"}}>
                      <div style={{fontSize:10,color:C.textLight,marginBottom:3}}>{label}</div>
                      <div style={{fontWeight:700,fontSize:13,color:ok?C.green:C.red}}>need {need}</div>
                      <div style={{fontSize:10,color:C.textMid}}>{avail} avail</div>
                    </div>
                  );})}
                </div>
              </div>
            )}

            <div style={{...card,marginBottom:24}}>
              <label style={{...lbl,marginBottom:14}}>Select Raw Material
                <select style={inp} value={pForm.rawId} onChange={e=>setPForm(p=>({...p,rawId:e.target.value}))}>
                  <option value="">— Choose a material —</option>
                  {rawItems.map(r=>{const rem=Math.max(0,r.weightGrams-(usedMap[r.id]||0));return <option key={r.id} value={r.id}>{r.name} — {fmtG(rem)} remaining</option>;})}
                </select>
              </label>
              {selRaw&&(
                <div style={{background:C.primaryPale,borderRadius:12,padding:"12px 16px",marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontWeight:700,color:C.primary,fontSize:13}}>{selRaw.name}</span>
                    <Pill color={selRemG<100?C.red:C.green} pale={selRemG<100?C.redPale:C.greenPale}>{fmtG(selRemG)} available</Pill>
                  </div>
                  <ProgressBar pct={selRaw.weightGrams>0?selRemG/selRaw.weightGrams:1}/>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                {[["20Rs Packet",C.gold,C.goldPale,"g20","qty20","🟡"],["50Rs Packet",C.accent,C.accentPale,"g50","qty50","🟠"]].map(([lbl2,col,pale,gk,qk,ico])=>(
                  <div key={lbl2} style={{background:pale,borderRadius:14,padding:"16px",border:`1.5px solid ${col}30`}}>
                    <div style={{fontWeight:700,color:col,marginBottom:12,fontSize:13}}>{ico} {lbl2}</div>
                    <label style={{...lbl,marginBottom:10}}>Grams per packet<input style={inp} type="number" placeholder="e.g. 50" value={pForm[gk]} onChange={e=>setPForm(p=>({...p,[gk]:e.target.value}))}/></label>
                    <label style={lbl}>Number of packets<input style={inp} type="number" placeholder="qty" value={pForm[qk]} onChange={e=>setPForm(p=>({...p,[qk]:e.target.value}))}/></label>
                    {parseFloat(pForm[gk])>0&&parseInt(pForm[qk])>0&&(
                      <div style={{marginTop:8,fontSize:11,color:col,fontWeight:600}}>Uses: {fmtG(parseFloat(pForm[gk])*parseInt(pForm[qk]))}</div>
                    )}
                  </div>
                ))}
              </div>
              {selRaw&&(fq20||fq50)&&(
                <div style={{marginTop:14,padding:"12px 16px",background:pFormRem<0?C.redPale:C.greenPale,borderRadius:12,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  <div style={{fontSize:11}}><span style={{color:C.textLight}}>Raw used</span><br/><b style={{fontSize:14,color:C.text}}>{fmtG(pFormUsed)}</b></div>
                  <div style={{fontSize:11}}><span style={{color:C.textLight}}>After production</span><br/><b style={{fontSize:14,color:pFormRem<0?C.red:C.green}}>{fmtG(Math.max(0,pFormRem))}</b></div>
                  <div style={{fontSize:11}}><span style={{color:C.textLight}}>Revenue if sold</span><br/><b style={{fontSize:14,color:C.green}}>{fmt((fq20/12)*SELL_PER_DOZEN_20+(fq50/12)*SELL_PER_DOZEN_50)}</b></div>
                </div>
              )}
              {pFormRem<0&&<div style={{marginTop:10,padding:"10px 14px",background:C.redPale,borderRadius:10,fontSize:12,color:C.red,fontWeight:600}}>⚠ Not enough raw stock! Reduce quantities.</div>}
              <button onClick={addPacket} disabled={pFormRem<0} style={{...btn(C.primary),marginTop:14,width:"auto",padding:"12px 32px",opacity:pFormRem<0?.4:1}}>✓ Record Production</button>
            </div>

            <SectionTitle>Production Log ({packets.length} entries)</SectionTitle>
            {packets.length===0&&<Empty text="No packets recorded yet."/>}
            <div style={{display:"grid",gap:12}}>
              {[...packets].reverse().map(p=>(
                <div key={p.id} style={{...card,border:editId===p.id?`2px solid ${C.primary}`:undefined}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:editId===p.id?14:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:36,height:36,borderRadius:10,background:C.primaryPale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>📦</div>
                      <div><div style={{fontWeight:700,fontSize:13}}>{p.rawName}</div><div style={{fontSize:10,color:C.textLight}}>{p.date}</div></div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      {editId!==p.id&&<button onClick={()=>startEdit(p)} style={{...btn(C.primaryPale,C.primary),width:"auto",padding:"7px 14px",fontSize:11}}>✏ Edit</button>}
                      <button onClick={()=>delPacket(p.id)} style={{...btn(C.redPale,C.red),width:"auto",padding:"7px 12px",fontSize:11}}>✕</button>
                    </div>
                  </div>
                  {editId===p.id?(
                    <div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                        {[["🟡 20Rs","g20","qty20",C.gold,C.goldPale],["🟠 50Rs","g50","qty50",C.accent,C.accentPale]].map(([lbl3,gk,qk,col,pale])=>(
                          <div key={lbl3} style={{background:pale,borderRadius:12,padding:"12px",border:`1.5px solid ${col}40`}}>
                            <div style={{fontWeight:700,color:col,marginBottom:10,fontSize:12}}>{lbl3}</div>
                            <label style={{...lbl,marginBottom:8}}>g/pkt<input style={inp} type="number" value={eForm[gk]} onChange={e=>setEForm(f=>({...f,[gk]:e.target.value}))}/></label>
                            <label style={lbl}>Qty<input style={inp} type="number" value={eForm[qk]} onChange={e=>setEForm(f=>({...f,[qk]:e.target.value}))}/></label>
                          </div>
                        ))}
                      </div>
                      <div style={{display:"flex",gap:10}}>
                        <button onClick={()=>saveEdit(p.id)} style={{...btn(C.green),width:"auto",padding:"10px 24px"}}>✓ Save</button>
                        <button onClick={()=>setEditId(null)} style={{...btn(C.borderLight,C.textMid),width:"auto",padding:"10px 20px"}}>Cancel</button>
                      </div>
                    </div>
                  ):(
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      {[[p.qty20,p.gramsPerPkt20,C.gold,C.goldPale,"20Rs",SELL_PER_DOZEN_20],[p.qty50,p.gramsPerPkt50,C.accent,C.accentPale,"50Rs",SELL_PER_DOZEN_50]].map(([qty,gpkt,col,pale,lbl4,doz])=>(
                        <div key={lbl4} style={{background:pale,borderRadius:12,padding:"12px 14px"}}>
                          <div style={{fontSize:10,color:col,fontWeight:700,marginBottom:4}}>{lbl4} PACKETS</div>
                          <div style={{fontSize:24,fontWeight:800,color:col}}>{qty}</div>
                          <div style={{fontSize:10,color:C.textMid,marginTop:3}}>{gpkt}g/pkt · {fmtG(qty*gpkt)} raw</div>
                          <div style={{fontSize:10,color:C.textMid}}>{(qty/12).toFixed(1)} doz · {fmt((qty/12)*doz)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ WRAPPING ══ */}
        {tab==="Wrapping"&&(
          <div>
            <PageTitle icon="◻" title="Wrapping Materials" sub="Stock, prices & auto-deduction per packet produced"/>

            {/* Usage rules info */}
            <div style={{...card,marginBottom:20,background:C.primaryPale,border:`1px solid ${C.primary}25`}}>
              <div style={{fontWeight:700,color:C.primary,fontSize:12,marginBottom:10}}>📋 Auto-deduction rules per packet</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {[["📌 Stapler pins",`${PINS_PER_PACKET} pins/pkt`,`${PINS_PER_BOX} pins/box`],["🟡 Bag (20Rs)",`${BAG20_GPB.toFixed(2)}g/pkt`,`12 bags = ${BAG20_12W}g`],["🟠 Bag (50Rs)",`${BAG50_GPB.toFixed(2)}g/pkt`,`12 bags = ${BAG50_12W}g`],["🏷 Card",`${CARDS_PER_PACKET} card/pkt`,`${CARDS_PER_PACK}/pack`]].map(([ic,r1,r2])=>(
                  <div key={ic} style={{background:"white",borderRadius:10,padding:"10px",textAlign:"center"}}>
                    <div style={{fontSize:12,marginBottom:4}}>{ic}</div>
                    <div style={{fontSize:11,fontWeight:700,color:C.primary}}>{r1}</div>
                    <div style={{fontSize:10,color:C.textLight}}>{r2}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:"grid",gap:14}}>
              {/* ── Stapler ── */}
              <WrapCard
                icon="📌" title="Stapler Boxes" borderColor={C.textMid}
                note={`${PINS_PER_BOX} pins per box · ${PINS_PER_PACKET} pins per packet`}
                fields={[
                  {label:"Price per Box (Rs)",key:"stapler_price",val:wrap.stapler_price,placeholder:"e.g. 30"},
                  {label:"Boxes in stock",key:"stapler_boxes",val:wrap.stapler_boxes,placeholder:"e.g. 2",isQty:true},
                ]}
                onField={(k,v)=>wUpdate(k,v)}
                stats={[
                  ["Total pins",`${totalPinsStock.toLocaleString()}`],
                  ["Pins used",`${totalPinsUsed.toLocaleString()}`],
                  ["Pins left",`${totalPinsRem.toLocaleString()}`],
                  ["Boxes left",`${staplerBoxesRem.toFixed(2)}`],
                ]}
                pct={totalPinsStock>0?totalPinsRem/totalPinsStock:1}
                color={C.textMid} pale="#f1f5f9"
                totalCost={(wrap.stapler_boxes||0)*(wrap.stapler_price||0)}
              />

              {/* ── Bags 20 ── */}
              <WrapCard
                icon="🟡" title="Plastic Bags — 20Rs Packets" borderColor={C.gold}
                note={`${BAG20_GPB.toFixed(2)}g per bag · 12 bags = ${BAG20_12W}g`}
                fields={[
                  {label:"Price per KG (Rs)",key:"bags20_price",val:wrap.bags20_price,placeholder:"e.g. 1300"},
                  {label:"Stock purchased (kg)",key:"bags20_kg",val:wrap.bags20_kg,placeholder:"e.g. 1"},
                ]}
                onField={(k,v)=>wUpdate(k,v)}
                stats={[
                  ["Total bags",`${Math.floor(bags20StockG/BAG20_GPB)}`],
                  ["Used",`${totalP20}`],
                  ["Remaining",`${bags20RemPkts} bags`],
                  ["Cost/bag",`Rs ${bags20CPB.toFixed(4)}`],
                ]}
                pct={bags20StockG>0?bags20RemG/bags20StockG:1}
                color={C.gold} pale={C.goldPale}
                totalCost={(wrap.bags20_kg||0)*(wrap.bags20_price||0)}
              />

              {/* ── Bags 50 ── */}
              <WrapCard
                icon="🟠" title="Plastic Bags — 50Rs Packets" borderColor={C.accent}
                note={`${BAG50_GPB.toFixed(2)}g per bag · 12 bags = ${BAG50_12W}g`}
                fields={[
                  {label:"Price per KG (Rs)",key:"bags50_price",val:wrap.bags50_price,placeholder:"e.g. 1300"},
                  {label:"Stock purchased (kg)",key:"bags50_kg",val:wrap.bags50_kg,placeholder:"e.g. 1"},
                ]}
                onField={(k,v)=>wUpdate(k,v)}
                stats={[
                  ["Total bags",`${Math.floor(bags50StockG/BAG50_GPB)}`],
                  ["Used",`${totalP50}`],
                  ["Remaining",`${bags50RemPkts} bags`],
                  ["Cost/bag",`Rs ${bags50CPB.toFixed(4)}`],
                ]}
                pct={bags50StockG>0?bags50RemG/bags50StockG:1}
                color={C.accent} pale={C.accentPale}
                totalCost={(wrap.bags50_kg||0)*(wrap.bags50_price||0)}
              />

              {/* ── Cards ── */}
              <WrapCard
                icon="🏷" title="Cards / Labels" borderColor={C.green}
                note={`${CARDS_PER_PACK} cards per pack · ${CARDS_PER_PACKET} card per packet`}
                fields={[
                  {label:"Price per Pack (Rs)",key:"card_price",val:wrap.card_price,placeholder:"e.g. 300"},
                  {label:"Packs in stock",key:"card_packs",val:wrap.card_packs,placeholder:"e.g. 1",isQty:true},
                ]}
                onField={(k,v)=>wUpdate(k,v)}
                stats={[
                  ["Total cards",`${cardsTotal}`],
                  ["Used",`${cardsUsed}`],
                  ["Remaining",`${cardsRem}`],
                  ["Packs left",`${cardPacksRem.toFixed(2)}`],
                ]}
                pct={cardsTotal>0?cardsRem/cardsTotal:1}
                color={C.green} pale={C.greenPale}
                totalCost={(wrap.card_packs||0)*(wrap.card_price||0)}
              />

              {/* Grand total */}
              <div style={{...card,background:`linear-gradient(135deg,${C.primaryPale},${C.accentPale})`,border:`1px solid ${C.primary}30`}}>
                <div style={{fontWeight:800,fontSize:14,color:C.primary,marginBottom:12}}>📊 Total Wrapping Investment</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[["📌 Stapler",fmt((wrap.stapler_boxes||0)*(wrap.stapler_price||0))],["🟡 Bags 20Rs",fmt((wrap.bags20_kg||0)*(wrap.bags20_price||0))],["🟠 Bags 50Rs",fmt((wrap.bags50_kg||0)*(wrap.bags50_price||0))],["🏷 Cards",fmt((wrap.card_packs||0)*(wrap.card_price||0))]].map(([k2,v2])=>(
                    <div key={k2} style={{background:"rgba(255,255,255,.7)",borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:12,color:C.textMid}}>{k2}</span><b style={{fontSize:12,color:C.text}}>{v2}</b>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12,background:C.primary,borderRadius:12,padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{color:"rgba(255,255,255,.8)",fontSize:12,fontWeight:600}}>Grand Total</span>
                  <span style={{color:"#fff",fontSize:18,fontWeight:800}}>{fmt(totalWrapCost)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ INVENTORY ══ */}
        {tab==="Inventory"&&(
          <div>
            <PageTitle icon="≡" title="Inventory" sub="Complete stock overview"/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:24}}>
              <KpiCard icon="🟡" label="20Rs Packets" value={totalP20} sub={`${(totalP20/12).toFixed(1)} dozen`} color={C.gold} pale={C.goldPale}/>
              <KpiCard icon="🟠" label="50Rs Packets" value={totalP50} sub={`${(totalP50/12).toFixed(1)} dozen`} color={C.accent} pale={C.accentPale}/>
              <KpiCard icon="💰" label="Revenue" value={fmt(totalRev)} sub="if all sold" color={C.green} pale={C.greenPale}/>
            </div>
            <SectionTitle>Packet Log</SectionTitle>
            <div style={{...card,marginBottom:16,overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{borderBottom:`2px solid ${C.border}`}}>{["Date","Material","20Rs","50Rs","Raw Used","Revenue"].map(h=><th key={h} style={{textAlign:"left",color:C.textLight,fontWeight:600,padding:"8px 12px",fontSize:11,letterSpacing:.5}}>{h}</th>)}</tr></thead>
                <tbody>
                  {packets.map((p,i)=>(
                    <tr key={p.id} style={{borderBottom:`1px solid ${C.borderLight}`,background:i%2===0?"transparent":C.bg}}>
                      <td style={{padding:"10px 12px",color:C.textMid,fontSize:11}}>{p.date}</td>
                      <td style={{padding:"10px 12px",fontWeight:600}}>{p.rawName}</td>
                      <td style={{padding:"10px 12px"}}><Pill color={C.gold} pale={C.goldPale}>{p.qty20} ({p.gramsPerPkt20}g)</Pill></td>
                      <td style={{padding:"10px 12px"}}><Pill color={C.accent} pale={C.accentPale}>{p.qty50} ({p.gramsPerPkt50}g)</Pill></td>
                      <td style={{padding:"10px 12px",color:C.textMid,fontSize:11}}>{fmtG(p.qty20*p.gramsPerPkt20+p.qty50*p.gramsPerPkt50)}</td>
                      <td style={{padding:"10px 12px"}}><b style={{color:C.green}}>{fmt((p.qty20/12)*SELL_PER_DOZEN_20+(p.qty50/12)*SELL_PER_DOZEN_50)}</b></td>
                    </tr>
                  ))}
                  {packets.length===0&&<tr><td colSpan={6} style={{padding:"24px",textAlign:"center",color:C.textLight}}>No packets recorded yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <SectionTitle>Raw Materials</SectionTitle>
            <div style={{...card,marginBottom:16,overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{borderBottom:`2px solid ${C.border}`}}>{["Item","Total","Used","Remaining","Rs/kg","Value"].map(h=><th key={h} style={{textAlign:"left",color:C.textLight,fontWeight:600,padding:"8px 12px",fontSize:11}}>{h}</th>)}</tr></thead>
                <tbody>
                  {rawItems.map((r,i)=>{const u=usedMap[r.id]||0,rem=Math.max(0,r.weightGrams-u),pct=r.weightGrams>0?rem/r.weightGrams:1;return(
                    <tr key={r.id} style={{borderBottom:`1px solid ${C.borderLight}`,background:i%2===0?"transparent":C.bg}}>
                      <td style={{padding:"10px 12px",fontWeight:600}}>{r.name}</td>
                      <td style={{padding:"10px 12px",color:C.textMid}}>{fmtG(r.weightGrams)}</td>
                      <td style={{padding:"10px 12px"}}><span style={{color:C.gold,fontWeight:600}}>{fmtG(u)}</span></td>
                      <td style={{padding:"10px 12px"}}><Pill color={pct>0.5?C.green:pct>0.2?C.gold:C.red} pale={pct>0.5?C.greenPale:pct>0.2?C.goldPale:C.redPale}>{fmtG(rem)}</Pill></td>
                      <td style={{padding:"10px 12px",color:C.textMid}}>{fmt(r.pricePerKg)}</td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:C.primary}}>{fmt((r.weightGrams/1000)*r.pricePerKg)}</td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
            <SectionTitle>Wrapping Materials</SectionTitle>
            <div style={{...card,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["📌 Stapler pins",`${totalPinsRem.toLocaleString()} of ${totalPinsStock.toLocaleString()}`],["🟡 Bags (20Rs)",`${bags20RemPkts} bags remaining`],["🟠 Bags (50Rs)",`${bags50RemPkts} bags remaining`],["🏷 Cards",`${cardsRem} of ${cardsTotal} remaining`]].map(([k2,v2])=>(
                <div key={k2} style={{background:C.bg,borderRadius:10,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:C.textMid}}>{k2}</span><b style={{fontSize:12,color:C.primary}}>{v2}</b>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ CALCULATOR ══ */}
        {tab==="Calculator"&&(
          <div>
            <PageTitle icon="∑" title="Profit Calculator" sub="Estimate returns before production"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
              <PricingCard type="20" sell={PER_PACKET_20} raw="6–7.5" pkg="1.5–2" profit="3.83–5.83" color={C.gold} pale={C.goldPale}/>
              <PricingCard type="50" sell={PER_PACKET_50} raw="24–28" pkg="2.5–3.5" profit="3.5–8.5" color={C.accent} pale={C.accentPale}/>
            </div>
            <div style={{...card,marginBottom:20}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <label style={lbl}>Select Raw Material<select style={inp} value={calcForm.rawId} onChange={e=>setCalcForm(p=>({...p,rawId:e.target.value}))}><option value="">— Choose item —</option>{rawItems.map(r=><option key={r.id} value={r.id}>{r.name} ({fmt(r.pricePerKg)}/kg)</option>)}</select></label>
                <label style={lbl}>Weight to Use (grams)<input style={inp} type="number" placeholder="e.g. 1000" value={calcForm.wg} onChange={e=>setCalcForm(p=>({...p,wg:e.target.value}))}/></label>
              </div>
            </div>
            {ci&&cw>0&&cr20&&cr50&&(
              <div>
                <div style={{background:`linear-gradient(135deg,${C.primaryPale},${C.accentPale})`,borderRadius:14,padding:"14px 18px",marginBottom:20,display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontWeight:700,color:C.primary,fontSize:14}}>📦 {ci.name}</span>
                  <Pill color={C.primary} pale={C.primaryPale}>{fmtG(cw)}</Pill>
                  <Pill color={C.accent} pale={C.accentPale}>{fmt(ci.pricePerKg)}/kg</Pill>
                  <span style={{marginLeft:"auto",fontSize:13,fontWeight:700}}>Input cost: <span style={{color:C.primary}}>{fmt((cw/1000)*ci.pricePerKg)}</span></span>
                </div>
                {[[cr20,"🟡 20Rs Packets",C.gold,C.goldPale,SELL_PER_DOZEN_20],[cr50,"🟠 50Rs Packets",C.accent,C.accentPale,SELL_PER_DOZEN_50]].map(([res,title,col,pale,doz])=>(
                  <div key={title} style={{...card,marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                      <span style={{fontWeight:800,fontSize:14,color:col}}>{title}</span>
                      <Pill color={col} pale={pale}>{fmt(doz)}/dozen</Pill>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                      {res.map(sc=>(
                        <div key={sc.label} style={{background:pale,borderRadius:14,padding:"16px",border:`1px solid ${col}25`}}>
                          <div style={{fontSize:10,color:col,fontWeight:700,letterSpacing:1,marginBottom:10}}>{sc.label.toUpperCase()} SCENARIO</div>
                          {[["Raw/pkt",fmt(sc.rawBudget)],["Pkg/pkt",fmt(sc.pkgCost)],["g/pkt",`${sc.grams.toFixed(1)}g`],["Packets",sc.numPkts],["Dozens",sc.dozens.toFixed(1)],["Revenue",fmt(sc.revenue)]].map(([k2,v2])=>(
                            <div key={k2} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"3px 0",borderBottom:`1px solid ${col}15`}}>
                              <span style={{color:C.textLight}}>{k2}</span><b style={{color:C.text}}>{v2}</b>
                            </div>
                          ))}
                          <div style={{marginTop:12,background:sc.profit>0?C.greenPale:C.redPale,borderRadius:10,padding:"10px",textAlign:"center"}}>
                            <div style={{fontSize:9,color:C.textLight,marginBottom:2}}>NET PROFIT</div>
                            <div style={{fontSize:20,fontWeight:800,color:sc.profit>0?C.green:C.red}}>{fmt(sc.profit)}</div>
                            <div style={{fontSize:10,color:C.textMid}}>{fmt(sc.profitPerPkt)}/pkt</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!ci&&<Empty text="Select a raw material above to see profit calculations."/>}
          </div>
        )}
      </main>
    </div>
  );
}

// ── WrapCard ─────────────────────────────────────────────────────────────────
function WrapCard({icon,title,borderColor,note,fields,onField,stats,pct,color,pale,totalCost}){
  return(
    <div style={{...{background:"#ffffff",borderRadius:16,border:`1px solid #d4edda`,padding:"20px",boxShadow:`0 2px 12px rgba(46,125,82,0.08)`},borderLeft:`4px solid ${borderColor}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:44,height:44,borderRadius:12,background:pale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{icon}</div>
        <div>
          <div style={{fontWeight:700,fontSize:14,color:"#1a2e22"}}>{title}</div>
          <div style={{fontSize:11,color:"#8aab93",marginTop:2}}>{note}</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        {fields.map(f=>(
          <label key={f.key} style={{display:"flex",flexDirection:"column",gap:6,fontSize:11,color:"#4a6b55",fontWeight:600,letterSpacing:.5}}>
            {f.label}
            <input
              style={{background:"#f8fdfb",border:`1.5px solid #d4edda`,color:"#1a2e22",padding:"10px 14px",borderRadius:10,fontSize:13,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"}}
              type="number" placeholder={f.placeholder}
              value={f.val??""} 
              onChange={e=>onField(f.key, e.target.value===""?"":parseFloat(e.target.value)||0)}
            />
          </label>
        ))}
      </div>
      <ProgressBar pct={pct} color={color}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:12}}>
        {stats.map(([k,v])=>(
          <div key={k} style={{background:pale,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
            <div style={{fontSize:9,color:"#8aab93",marginBottom:2,letterSpacing:.5,textTransform:"uppercase"}}>{k}</div>
            <div style={{fontWeight:700,fontSize:12,color}}>{v}</div>
          </div>
        ))}
      </div>
      {totalCost>0&&(
        <div style={{marginTop:10,padding:"8px 12px",background:pale,borderRadius:8,fontSize:11,display:"flex",justifyContent:"space-between"}}>
          <span style={{color:"#4a6b55"}}>Total stock cost</span>
          <b style={{color}}>{`Rs ${Number(totalCost).toLocaleString("en-PK",{minimumFractionDigits:0,maximumFractionDigits:2})}`}</b>
        </div>
      )}
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function PageTitle({icon,title,sub}){return(<div style={{marginBottom:24}}><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}><span style={{fontSize:22,color:C.primary}}>{icon}</span><h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.text}}>{title}</h1></div><p style={{margin:0,fontSize:12,color:C.textLight,marginLeft:34}}>{sub}</p></div>);}
function SectionTitle({children}){return <div style={{fontWeight:700,fontSize:13,color:C.primary,marginBottom:12,marginTop:8,display:"flex",alignItems:"center",gap:8}}><span style={{width:3,height:16,background:C.primary,borderRadius:2,display:"inline-block"}}></span>{children}</div>;}
function KpiCard({icon,label,value,sub,color,pale}){return(<div style={{...{background:"#ffffff",borderRadius:16,border:`1px solid #d4edda`,padding:"20px",boxShadow:`0 2px 12px rgba(46,125,82,0.08)`},background:`linear-gradient(135deg,${pale},#fff)`,borderTop:`3px solid ${color}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}><span style={{fontSize:24}}>{icon}</span><span style={{fontSize:9,color:C.textLight,letterSpacing:1,fontWeight:600,textTransform:"uppercase"}}>{label}</span></div><div style={{fontSize:26,fontWeight:800,color}}>{value}</div><div style={{fontSize:11,color:C.textMid,marginTop:4}}>{sub}</div></div>);}
function PricingCard({type,sell,raw,pkg,profit,color,pale}){return(<div style={{...{background:"#ffffff",borderRadius:16,border:`1px solid #d4edda`,padding:"20px",boxShadow:`0 2px 12px rgba(46,125,82,0.08)`},borderTop:`3px solid ${color}`,background:`linear-gradient(135deg,${pale},#fff)`}}><div style={{fontWeight:800,fontSize:13,color,marginBottom:12}}>{type==="20"?"🟡":"🟠"} {type}Rs Packet</div>{[["Sell at",`Rs ${Number(sell).toLocaleString("en-PK",{minimumFractionDigits:0,maximumFractionDigits:2})}`],["Raw material",`Rs ${raw}`],["Packaging",`Rs ${pkg}`],["Our profit",`Rs ${profit}`]].map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${color}15`,fontSize:11}}><span style={{color:C.textMid}}>{k}</span><b style={{color:k==="Our profit"?C.green:C.text}}>{v}</b></div>))}</div>);}
function Pill({children,color,pale}){return <span style={{background:pale,color,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{children}</span>;}
function ProgressBar({pct,color}){const c=color||(pct>0.5?C.green:pct>0.2?C.gold:C.red);return(<div style={{height:6,background:C.borderLight,borderRadius:4,overflow:"hidden"}}><div style={{height:6,borderRadius:4,width:`${Math.max(0,Math.min(100,pct*100))}%`,background:c,transition:"width .4s ease"}}/></div>);}
function WrapMini({icon,label,rem,unit,pct}){const col=pct>0.5?C.green:pct>0.2?C.gold:C.red,pale=pct>0.5?C.greenPale:pct>0.2?C.goldPale:C.redPale;return(<div style={{...{background:"#ffffff",borderRadius:16,border:`1px solid #d4edda`,padding:"20px",boxShadow:`0 2px 12px rgba(46,125,82,0.08)`},textAlign:"center"}}><div style={{fontSize:24,marginBottom:6}}>{icon}</div><div style={{fontSize:10,color:C.textLight,fontWeight:600,marginBottom:4}}>{label}</div><div style={{fontSize:20,fontWeight:800,color:col}}>{rem}</div><div style={{fontSize:10,color:C.textMid,marginBottom:8}}>{unit}</div><ProgressBar pct={pct}/></div>);}
function Empty({text}){return(<div style={{textAlign:"center",padding:"40px 20px",color:C.textLight}}><div style={{fontSize:40,marginBottom:8}}>📭</div><div style={{fontSize:13}}>{text}</div></div>);}