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
                      <div style={{fontSize:10,c
