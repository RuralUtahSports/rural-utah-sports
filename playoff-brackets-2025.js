(()=>{
const DATA={
'6A':{champion:'Corner Canyon',final:[['Corner Canyon',35,true],['Lone Peak',20,false]],semis:[[['Corner Canyon',59,true],['Mountain Ridge',20,false]],[['Skyridge',7,false],['Lone Peak',13,true]]]},
'5A':{champion:'Orem',final:[['Orem',42,true],['Springville',7,false]],semis:[[['West',7,false],['Orem',34,true]],[['Brighton',24,false],['Springville',30,true]]]},
'4A':{champion:'Ridgeline',final:[['Ridgeline',56,true],['Green Canyon',0,false]],semis:[[['Ridgeline',48,true],['Provo',22,false]],[['Crimson Cliffs',21,false],['Green Canyon',24,true]]]},
'3A':{champion:'Cedar',final:[['Cedar',41,true],['Manti',35,false]],semis:[[['Cedar',23,true],['Juab',16,false]],[['Morgan',28,false],['Manti',42,true]]]},
'2A':{champion:'San Juan',final:[['San Juan',57,true],['South Summit',10,false]],semis:[[['San Juan',51,true],['Summit Academy',27,false]],[['South Sevier',0,false],['South Summit',34,true]]]},
'1A':{champion:'Kanab',final:[['Kanab',24,true],['Beaver',13,false]],semis:[[['Kanab',43,true],['North Summit',19,false]],[['Beaver',24,true],['Duchesne',14,false]]]},
'8-Player':{champion:'Rich',final:[['Rich',21,true],['Milford',12,false]],semis:[[['Rich',50,true],['Whitehorse',8,false]],[['Milford',83,true],['Monticello',24,false]]]}
};
const root=document.getElementById('playoffBracketPreview');if(!root)return;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function teamRow(t){return `<div class="bracket-team ${t[2]?'winner':''}"><span class="bracket-name">${esc(t[0])}</span><span class="bracket-score">${esc(t[1])}</span></div>`}
function match(m){return `<div class="bracket-match">${m.map(teamRow).join('')}</div>`}
function render(cls){const d=DATA[cls];root.querySelectorAll('.bracket-tab').forEach(b=>b.classList.toggle('active',b.dataset.cls===cls));root.querySelector('.bracket-scroll').innerHTML=`<div class="bracket"><div><div class="bracket-round-title">Semifinals</div><div class="bracket-round">${d.semis.map(match).join('')}</div></div><div class="bracket-connector"></div><div><div class="bracket-round-title">Championship</div>${match(d.final)}<div class="champion-box" style="margin-top:20px"><div class="champion-label">2025 ${esc(cls)} Champion</div><div class="champion-team">${esc(d.champion)}</div><div class="champion-score">Final: ${esc(d.final[0][0])} ${esc(d.final[0][1])}, ${esc(d.final[1][0])} ${esc(d.final[1][1])}</div></div></div></div>`}
root.querySelectorAll('.bracket-tab').forEach(b=>b.addEventListener('click',()=>render(b.dataset.cls)));render('6A');
})();