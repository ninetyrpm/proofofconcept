const STATUS = [
  ['Cursed Imagination','this would be deeply stupid'],
  ['Questionable Commitment','fuck, I am actually doing this'],
  ['Prototype','well, technically it is a drink'],
  ['Suspiciously Viable','oh fuck, this actually works'],
  ['Serviceable','I would serve this on purpose'],
  ['Validated','other people are defending it now'],
  ['Peer Review','someone qualified has to sign off on this nonsense'],
  ['Locked','the panel signed off on it']
];

const cocktails = [
  {
    id:'POC-001', slug:'gym-sock', name:'Gym Sock', status:'Suspiciously Viable', revision:'0.3', class:'Savory sour', lastTested:'11 Aug 2026',
    summary:'A tropical-rum sour with enough fish sauce to sound punitive and not enough to taste that way.',
    shorthand:'Paranubes · lime · chile · maple · fish sauce',
    intent:'Make the ingredient list sound substantially worse than the finished drink. The fish sauce should provide body and umami without announcing itself aromatically.',
    ingredients:[['2 oz','Paranubes'],['1 oz','lime juice'],['0.5 oz','Ancho Reyes'],['0.5 oz','maple syrup'],['1 barspoon','fish sauce']],
    method:'Shake hard with ice and strain. Current presentation remains under development.',
    observations:'Aroma is dominated by Paranubes funk and grass rather than fish sauce. Slightly cloudy yellow appearance. Sweetness arrives early, acidity follows, and the savory component fills out the body without becoming overtly fishy.',
    allergens:['FISH'], safety:'Contains fish sauce. Disclose fish allergen before service. Refrigerate opened fish sauce according to manufacturer guidance.',
    revisions:[['0.1','11 Aug 2026','Cachaça / lime / Ancho Reyes / simple / fish sauce proposed.'],['0.2','11 Aug 2026','Paranubes substituted for cachaça; maple syrup substituted for simple.'],['0.3','11 Aug 2026','First physical test. Build judged unexpectedly drinkable; top-note fish sauce application considered.']]
  },
  {
    id:'POC-002', slug:'fucking-merlot', name:'Fucking Merlot', status:'Serviceable', revision:'1.0', class:'Wine impostor', lastTested:'11 Aug 2026',
    summary:'A wine-strength brandy cocktail designed to trigger a brief and unnecessary argument with Merlot.',
    shorthand:'Brandy · black cherry · tea · citric acid',
    intent:'Create a red-wine-adjacent sensory cue that makes the drinker briefly ask whether this is Merlot, then realize that it is not, without sacrificing pleasure to the joke.',
    ingredients:[['1.75 oz','Torres 10 brandy'],['1 oz','black cherry juice'],['0.75 oz','Irish breakfast concentrate'],['pinch','citric acid'],['2–3 drops','chocolate bitters'],['2 drops','saline']],
    method:'Combine, chill, and dilute appropriately. Serve as a five-ounce wine-style pour. No simple syrup required when using naturally sweet black cherry juice.',
    observations:'Color is appropriately wine-like. Tea supplies tannin and structure; cherry supplies fruit and enough sugar. Chocolate bitters must remain extremely restrained. Vanilla is optional at no more than one drop if a stronger oak cue is desired.',
    allergens:[], safety:'No major priority allergen is inherent in the reference build, but branded bitters and prepared ingredients must still be checked for manufacturer-specific allergen statements.',
    revisions:[['0.4','11 Aug 2026','Brandy build established; lemon removed in favor of citric acid to avoid explicit citrus character.'],['0.8','11 Aug 2026','Chocolate bitters reduced; extra simple eliminated.'],['1.0','11 Aug 2026','Working reference spec accepted as serviceable. Awaiting validation and peer review.']]
  },
  {
    id:'POC-003', slug:'latke', name:'Latke', status:'Questionable Commitment', revision:'0.2', class:'Potato sour', lastTested:'—',
    summary:'An apple-brandy sour attempting to move the potato out of the drink and into the architecture.',
    shorthand:'Apple brandy · lemon · potato foam · onion',
    intent:'Translate the flavor logic of a latke into a cocktail without making mashed potato function as a slurry ingredient.',
    ingredients:[['1.5 oz','apple brandy'],['0.75 oz','lemon juice'],['TBD','caramelized onion syrup'],['TBD','potato foam']],
    method:'Working concept only. Sour base beneath a separately engineered potato foam element.',
    observations:'Primary development question: whether separating the potato into a foam preserves the gag while allowing a technically coherent drink beneath it.',
    allergens:[], safety:'Allergy profile depends on the final foam and syrup formulation. If dairy, egg, soy, or other stabilizers are used, disclosure becomes mandatory.',
    revisions:[['0.1','13 Aug 2026','Apple brandy / lemon / mashed potato / aromatic bitters proposed as a sour.'],['0.2','13 Aug 2026','Potato separated from the liquid build and reassigned to a foam element. Caramelized onion syrup identified as promising direction.']]
  },
  {
    id:'POC-004', slug:'pea-soup', name:'Pea Soup', status:'Questionable Commitment', revision:'0.3', class:'Ritual shot', lastTested:'—',
    summary:'A wasabi-to-herbal-bitter sequence whose success criterion is social contagion, not comfort.',
    shorthand:'Wasabi · herbal bitter · bad decisions',
    intent:'Produce an experience that begins with refusal, confirms the drinker’s fears in the moment, then resolves into enough coherence that they voluntarily tell someone else to try it.',
    ingredients:[['1 pea','wasabi'],['1 shot','herbal bitter — under study']],
    method:'Service ritual remains under development. Current question: rapid swallow versus brief oral dwell.',
    observations:'Malört establishes the intended threat but may not create the most coherent experience. Jägermeister is being considered as a more complementary herbal base.',
    allergens:[], safety:'Wasabi products may contain mustard and other declared allergens depending on formulation. Brand-specific ingredient labels must be checked before service.',
    revisions:[['0.1','11 Aug 2026','Wasabi pea followed by Malört proposed.'],['0.2','11 Aug 2026','Success criterion reframed around the “that sucked, but…” reaction.'],['0.3','11 Aug 2026','Jägermeister proposed for comparative testing; service timing remains unresolved.']]
  },
  {
    id:'POC-005', slug:'martinned', name:'Martinned', status:'Cursed Imagination', revision:'0.1', class:'Martini trespass', lastTested:'—',
    summary:'A dry martini that has been informed, unnecessarily, by sardines.',
    shorthand:'Gin · dry vermouth · sardine oil · orange bitters',
    intent:'Use sardine-derived fat as a recognizable but controlled savory accent in a genuinely martini-like structure.',
    ingredients:[['2.5 oz','gin'],['0.5 oz','dry vermouth'],['0.25 oz','sardine oil — provisional'],['2 dashes','orange bitters']],
    method:'Concept formulation only. Lemon twist proposed.',
    observations:'Primary technical problem is obtaining and dosing sardine oil without either wasting expensive conservas or turning the service environment into a fish market.',
    allergens:['FISH'], safety:'Contains fish. Oil sourcing, storage, oxidation, sanitation, and dosage require explicit protocol before any physical test or service.',
    revisions:[['0.1','11 Aug 2026','Initial gin / vermouth / sardine oil / orange bitters build proposed.']]
  },
  {
    id:'POC-006', slug:'pickleball', name:'Pickleball', status:'Cursed Imagination', revision:'0.1', class:'Hostile ritual', lastTested:'—',
    summary:'Malört, pickle brine, then Malört again: a three-act service sequence based on the premise that nobody wants it.',
    shorthand:'Malört · pickle brine · Malört',
    intent:'Turn an aggressively undesirable ingredient pairing into a concise social ritual whose structure is the joke: bitter, brine, bitter, with no attempt to disguise what is happening.',
    ingredients:[['1 shot','Malört'],['1 shot','pickle brine'],['1 shot','Malört']],
    method:'Concept only. Serve as three sequential shots: Malört, pickle-brine chaser, then a second Malört shot.',
    observations:'No physical test is documented. The concept currently lives or dies on pacing, shot size, and whether the brine provides enough relief to make the return to Malört funny rather than merely repetitive.',
    allergens:[], safety:'Check the ingredient statement for the specific pickle brine used and disclose any declared allergens. Use food-safe brine stored according to the source product instructions; do not treat communal or reused service brine as automatically safe.',
    revisions:[['0.1','13 Aug 2026','Three-part Malört / pickle brine / Malört service ritual proposed. Name established around the premise that no one wants it.']]
  },
  {
    id:'POC-007', slug:'cow-piss', name:'Cow Piss', status:'Cursed Imagination', revision:'0.1', class:'Cultured highball-ish', lastTested:'—',
    summary:'A yogurt-and-lime rum drink whose name commits far more aggressively to the Calpico lineage than the recipe presently deserves.',
    shorthand:'Fat-washed white rum · Midori · lime · yogurt',
    intent:'Build a bright, cultured-dairy cocktail that makes the Calpico reference legible while remaining drinkable enough that the name feels like the most alarming part.',
    ingredients:[['TBD','fat-washed white rum'],['TBD','Midori'],['TBD','lime juice'],['TBD','yogurt']],
    method:'Concept formulation only. Final proportions, fat-wash medium, dilution, and whether the yogurt is incorporated, clarified, or used texturally remain unresolved.',
    observations:'The etymology is doing useful conceptual work, but the drink itself still needs a technical architecture. The main development problem is integrating dairy tang and texture without producing a heavy or unstable mixture.',
    allergens:['MILK'], safety:'Contains milk through yogurt. The fat used for the rum wash must also be identified and disclosed before service. Dairy handling, refrigeration, cross-contamination, and final holding time require a written protocol before testing for others.',
    revisions:[['0.1','11 Aug 2026','Fat-washed white rum / Midori / lime / yogurt proposed. Name tied to the original naming lineage of Calpico.']]
  },
  {
    id:'POC-008', slug:'nomad', name:"Noma'd", status:'Cursed Imagination', revision:'0.1', class:'Fermentation cosplay', lastTested:'—',
    summary:'Funky rum, lacto-fermented fruit, and exactly enough truffle oil to make everyone nervous about the tweezers.',
    shorthand:'Funky rum · lacto-fermented berries · simple · truffle oil',
    intent:'Use fermentation and a nearly homeopathic dose of truffle oil to create a drink that gestures toward high-concept fermentation culture without becoming a parody that tastes primarily of truffle.',
    ingredients:[['2 oz','funky rum'],['0.5 oz','simple syrup'],['TBD','lacto-fermented berries'],['1 tiny drop','truffle oil']],
    method:'Concept formulation only. Final berry quantity, fermentation protocol, acid balance, and presentation remain unresolved.',
    observations:'The concept depends on restraint. The fermented berries need to provide acidity, fruit, and funk; the truffle oil should register as an unsettling aromatic detail rather than the dominant flavor.',
    allergens:[], safety:'The lacto-fermentation protocol is not yet documented, so this build should not be reproduced for service as written. Any fermented fruit must be produced with a validated food-safe method, documented handling and storage, and clear discard criteria. Check the truffle-oil ingredient statement for carrier oils or declared allergens.',
    revisions:[['0.1','11 Aug 2026','Funky rum / simple / lacto-fermented berries / one tiny drop of truffle oil proposed.']]
  }
];

const panel = [
  {name:'Local Judge 01', role:'Bartender / Louisville, KY', reviews:0, note:'Founding panel — invitation pending'},
  {name:'Local Judge 02', role:'Bar industry / Louisville, KY', reviews:0, note:'Founding panel — invitation pending'},
  {name:'Local Judge 03', role:'Chef / beverage nerd / Louisville, KY', reviews:0, note:'Founding panel — invitation pending'},
  {name:'Open Seat', role:'Rotating industry reviewer', reviews:0, note:'Panel size is intentionally variable'},
  {name:'Open Seat', role:'Guest reviewer', reviews:0, note:'Regional / national expansion later'},
  {name:'Open Seat', role:'Guest reviewer', reviews:0, note:'Old decisions may be re-examined'}
];

const graveyard = [
  {id:'POD-001', name:'Islay Storm Highball', cause:'A substitution cascade — Madeira for cream sherry, tonic for soda — produced a rough drink that required emergency lemon juice to become palatable.', tag:'Abandoned prototype'},
  {id:'POD-002', name:'Reserved Plot', cause:'Future failures deserve permanent records: what was attempted, what failed, whether the concept or execution died, and what should not be repeated.', tag:'Plot available'}
];

let state = { view:'archive', slug:null, filter:'ALL' };

function esc(s=''){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function statusClass(s){ return s==='Locked'?'locked':s==='Peer Review'?'review':''; }

function shell(content, opts={}){
  const counts = {archive:cocktails.length,panel:panel.length,graveyard:graveyard.length};
  return `<div class="shell ${opts.graveyard?'graveyard':''}">
    <aside class="sidebar">
      <div>
        <div class="brand" data-go="archive"><div class="brand-kicker">experimental beverage institute</div><div class="brand-mark"><span>PROOF OF</span><span>CONCEPT</span></div><div class="brand-sub">Questionable beverages, empirically investigated.</div></div>
        <nav class="nav">
          ${navButton('archive','Research Index',counts.archive)}
          ${navButton('status','Status Protocol','08')}
          ${navButton('panel','The Panel',counts.panel)}
          ${navButton('graveyard','The Graveyard',counts.graveyard)}
          ${navButton('submit','Submit a Problem','→')}
        </nav>
      </div>
      <div class="sidebar-foot"><div class="sidebar-note">LOCKED = passed peer review.<br>Not frozen. Not sacred. Open to modification, derivatives, and future re-evaluation.</div><div class="version">POC / PROTOTYPE 0.1</div></div>
    </aside>
    <main class="main">
      <header class="topbar"><div class="crumb"><button class="mobile-menu" data-go="archive">POC / </button><span class="status-light"></span>${esc(opts.crumb||'Research index')}</div><div class="topbar-right">Louisville, KY / panel not yet convened</div></header>
      ${content}
    </main>
  </div>`;
}

function navButton(view,label,count){ return `<button data-go="${view}" class="${state.view===view?'active':''}"><span class="nav-label">${label}</span><span class="nav-count">${count}</span></button>`; }

function archivePage(){
 const filterOptions=['ALL','Cursed Imagination','Questionable Commitment','Suspiciously Viable','Serviceable'];
 const visible = state.filter==='ALL'?cocktails:cocktails.filter(c=>c.status===state.filter);
 return shell(`<div class="page">
   <section class="hero">
    <div class="hero-left"><div class="eyebrow">POC / research archive / founded under questionable circumstances</div><h1 class="hero-title"><span>PROOF</span><span>OF</span><span class="orange">CONCEPT</span></h1><p class="hero-deck">An evidence archive for beverage ideas that should have been stopped much earlier in the process.</p><div class="hero-rule">EDITORIAL RULE 01<br><strong>THE WEIRD INGREDIENT MUST HAVE A JOB.</strong></div></div>
    <div class="hero-right"><div class="hero-ledger"><div class="ledger-row"><span>active records</span><strong>${cocktails.length}</strong></div><div class="ledger-row"><span>locked records</span><strong>0</strong></div><div class="ledger-row"><span>panel reviews</span><strong>0</strong></div><div class="ledger-row"><span>known casualties</span><strong>${graveyard.length}</strong></div></div><div class="hero-note"><div class="eyebrow">handwritten addition / probably important</div><p class="scribble">The goal is not to prove the idea was sensible. <span class="under">Only that it worked.</span></p></div></div>
   </section>
   <section class="section"><div class="section-head"><div><div class="eyebrow">01 / active research</div><h2 class="section-title">The Archive</h2></div><div class="section-note">Current builds, half-built thoughts, and decisions that seemed defensible at the time.</div></div>
    <div class="archive-tools">${filterOptions.map(f=>`<button class="filter ${state.filter===f?'active':''}" data-filter="${esc(f)}">${esc(f)}</button>`).join('')}</div>
    <div class="archive-list">${visible.map(recordRow).join('') || '<div class="empty-state">No records at this stage. Yet.</div>'}</div>
   </section>
   <section class="section"><div class="section-head"><div><div class="eyebrow">02 / development protocol</div><h2 class="section-title">From bad thought to evidence</h2></div><div class="section-note">Status tracks evidence, not enthusiasm. “Locked” is the first point at which somebody else has to sign their name to this.</div></div>${stageTrack()}</section>
   <div class="callout-strip"><div class="stamp">not a menu</div><p>This archive documents development. A record may be incomplete, rejected, superseded, unsafe to reproduce, or simply an idea that has not yet earned the dignity of ice.</p></div>
 </div>`, {crumb:'Research index'});
}

function recordRow(c){ return `<article class="record" data-record="${c.slug}" tabindex="0"><div class="record-id">${c.id}</div><div class="record-name">${esc(c.name)}</div><div class="record-ingredients">${esc(c.shorthand)}</div><div class="status ${statusClass(c.status)}">${esc(c.status)}</div></article>`; }
function stageTrack(){ return `<div class="stage-track">${STATUS.map(([n,note],i)=>`<div class="stage internal" data-note="${esc(note)}"><div class="stage-num">0${i+1}</div><div class="stage-name">${esc(n)}</div></div>`).join('')}</div>`; }

function statusPage(){ return shell(`<div class="page"><section class="section" style="padding-top:52px"><div class="eyebrow">Protocol / status ladder</div><h1 class="section-title">Evidence before canon</h1><p class="prose">Every record advances through the same development ladder. The ladder describes what has actually happened to the drink, not how emotionally attached anyone is to the idea.</p>${stageTrack()}</section><section class="section"><div class="section-head"><div><div class="eyebrow">Locked / definition</div><h2 class="section-title">Approved, not embalmed</h2></div></div><div class="callout-strip"><div class="stamp">LOCKED</div><p>A specific recipe revision has passed peer review and is recognized as an approved reference build. It remains open to modification, derivatives, and future re-evaluation by a different panel.</p></div><p class="prose">A later revision can return to development while an older locked revision remains part of the permanent record. A future panel may also re-review an old locked build; the new verdict is appended to history rather than erasing the earlier one.</p></section></div>`,{crumb:'Status protocol'}); }

function recordPage(slug){
 const c=cocktails.find(x=>x.slug===slug); if(!c) return archivePage();
 return shell(`<div class="page">
  <section class="record-head"><div class="record-head-left"><div class="eyebrow">${c.id} / active specimen</div><h1 class="record-title">${esc(c.name)}</h1><p class="record-summary">${esc(c.summary)}</p>${c.status==='Locked'?'<div class="stamp-lock">locked</div>':''}</div><div class="record-head-right"><div class="meta-grid">${meta('status',c.status)}${meta('revision',c.revision)}${meta('class',c.class)}${meta('last tested',c.lastTested)}${meta('peer review','not yet')}${meta('reference build',c.status==='Locked'?'yes':'no')}</div></div></section>
  <section class="detail-grid"><div class="detail-main"><div class="eyebrow">current build / ${esc(c.revision)}</div><h2 class="subhead">Specification</h2><div class="spec-list">${c.ingredients.map(([q,i])=>`<div class="spec-row"><div class="spec-qty">${esc(q)}</div><div class="spec-ing">${esc(i)}</div></div>`).join('')}</div><div class="eyebrow">method</div><p class="prose">${esc(c.method)}</p><div class="eyebrow" style="margin-top:30px">design intent</div><p class="prose"><strong>Objective:</strong> ${esc(c.intent)}</p><div class="eyebrow" style="margin-top:30px">observations</div><p class="prose">${esc(c.observations)}</p></div>
   <aside class="detail-side"><div class="note-card"><div class="eyebrow">margin note / current status</div><p>${esc(STATUS.find(x=>x[0]===c.status)?.[1]||'')}</p></div><div class="warning"><div class="field-label">Safety / allergy disclosure</div><p>${c.allergens.length?`PRIORITY FLAGS: ${c.allergens.join(', ')}<br><br>`:''}${esc(c.safety)}</p></div><div class="note-card" style="margin-top:22px; transform:rotate(.7deg)"><div class="eyebrow">review state</div><p>No panel verdict exists for this revision. It cannot be marked LOCKED.</p></div></aside></section>
  <section class="section"><div class="section-head"><div><div class="eyebrow">development record</div><h2 class="section-title">Revision history</h2></div><div class="section-note">Nothing is cleaned up after the fact. The embarrassing decisions are part of the evidence.</div></div><div class="timeline">${c.revisions.map(r=>`<div class="timeline-item"><div class="timeline-ver">v${esc(r[0])}</div><div class="timeline-date">${esc(r[1])}</div><div class="timeline-copy">${esc(r[2])}</div></div>`).join('')}</div></section>
 </div>`,{crumb:`Research index / ${c.id}`});
}
function meta(l,v){return `<div class="meta-item"><div class="field-label">${esc(l)}</div><div class="field-value">${esc(v)}</div></div>`;}

function panelPage(){ return shell(`<div class="page"><section class="section" style="padding-top:52px"><div class="section-head"><div><div class="eyebrow">Peer review body / rolling membership</div><h1 class="section-title">The Panel</h1></div><div class="section-note">Reviewers are identified. Membership can expand, contract, and change over time. Old drinks are allowed to face new judges.</div></div><div class="panel-grid">${panel.map((j,i)=>`<article class="judge"><div class="judge-no">PANEL SEAT ${String(i+1).padStart(2,'0')}</div><div class="judge-name">${esc(j.name)}</div><div class="judge-role">${esc(j.role)}</div><div class="judge-stat"><span>${esc(j.note)}</span><span>${j.reviews} REVIEWS</span></div></article>`).join('')}</div></section><section class="section"><div class="section-head"><div><div class="eyebrow">Review ledger</div><h2 class="section-title">Institutional memory</h2></div><div class="section-note">A review is a dated event tied to a specific recipe revision and a named panel. New verdicts append; they do not rewrite history.</div></div><div class="review-table"><div class="empty-state">The founding panel has not convened. This is currently the only respectable statistic on the site.</div></div></section></div>`,{crumb:'The panel'}); }

function graveyardPage(){ return shell(`<div class="page"><section class="grave-hero"><div class="eyebrow">Terminal records / do not resuscitate casually</div><h1 class="grave-title">The <span>Graveyard</span></h1><p class="prose" style="color:#c8cbcd">Rejected, abandoned, superseded, and safety-terminated concepts remain documented. Failure is research output.</p></section><section class="section"><div class="graves">${graveyard.map(g=>`<article class="grave"><div class="grave-tag">${esc(g.tag)}</div><div class="grave-id">${esc(g.id)}</div><div class="grave-name">${esc(g.name)}</div><div class="eyebrow">cause of death</div><p class="grave-cause">${esc(g.cause)}</p></article>`).join('')}</div></section></div>`,{crumb:'The graveyard',graveyard:true}); }

function submitPage(){ return shell(`<div class="page"><section class="section" style="padding-top:52px"><div class="section-head"><div><div class="eyebrow">External research / intake prototype</div><h1 class="section-title">Submit a problem</h1></div><div class="section-note">Guest submissions are applications to the research program, not automatic publication. Provenance stays attached to the record.</div></div><form id="submission-form" class="form-grid"><div class="form-field"><label>Working title</label><input placeholder="e.g. an idea you should have kept to yourself" /></div><div class="form-field"><label>Submitter / attribution</label><input placeholder="Name or credited alias" /></div><div class="form-field full"><label>Premise / intended experience</label><textarea placeholder="What is this drink trying to make happen?"></textarea></div><div class="form-field full"><label>Current recipe or physical concept</label><textarea placeholder="Quantities, ingredients, method. It is acceptable to admit that none of this exists yet."></textarea></div><div class="form-field"><label>Current development state</label><select>${STATUS.slice(0,6).map(x=>`<option>${esc(x[0])}</option>`).join('')}</select></div><div class="form-field"><label>Known priority allergens</label><input placeholder="Fish, milk, egg, sesame, nuts…" /></div><div class="form-field full"><label>Safety / handling notes</label><textarea placeholder="Perishable ingredients, raw ingredients, infusion hazards, storage, unusual concentrations, anything the next person needs to know before making it."></textarea></div><div class="form-field full"><button class="submit-btn" type="submit">Prototype only — do not actually submit</button></div></form></section></div>`,{crumb:'Guest submission intake'}); }

function render(){
 let html;
 if(state.view==='record') html=recordPage(state.slug);
 else if(state.view==='status') html=statusPage();
 else if(state.view==='panel') html=panelPage();
 else if(state.view==='graveyard') html=graveyardPage();
 else if(state.view==='submit') html=submitPage();
 else html=archivePage();
 document.getElementById('app').innerHTML=html;
 bind();
 window.scrollTo({top:0,behavior:'instant'});
}

function go(view,slug=null){ state.view=view; state.slug=slug; try { history.pushState({view,slug},'', view==='archive'?'/' : view==='record'?`/cocktails/${slug}`:`/${view}`); } catch (_) {} render(); }
function bind(){
 document.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>go(el.dataset.go)));
 document.querySelectorAll('[data-record]').forEach(el=>{ const f=()=>go('record',el.dataset.record); el.addEventListener('click',f); el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')f();}); });
 document.querySelectorAll('[data-filter]').forEach(el=>el.addEventListener('click',()=>{state.filter=el.dataset.filter;render();}));
 const form=document.getElementById('submission-form'); if(form) form.addEventListener('submit',e=>{e.preventDefault(); alert('Prototype only. Submission transport has intentionally not been implemented.');});
}
function routeFromPath(){ const p=location.pathname.split('/').filter(Boolean); if(!p.length){state.view='archive';return;} if(p[0]==='cocktails'&&p[1]){state.view='record';state.slug=p[1];return;} if(['status','panel','graveyard','submit'].includes(p[0])){state.view=p[0];return;} state.view='archive'; }
window.addEventListener('popstate',()=>{routeFromPath();render();});
routeFromPath(); render();
