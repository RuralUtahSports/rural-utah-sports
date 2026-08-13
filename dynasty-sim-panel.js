(()=>{
  if(!/simulators\.html$/i.test(location.pathname.split('/').pop()||''))return;
  const install=()=>{
    const tabs=document.querySelector('.tabs'),greatest=document.getElementById('greatest');
    if(!tabs||!greatest||document.getElementById('dynasty-sim'))return;
    const tab=document.createElement('button');
    tab.className='tab';tab.dataset.tab='dynasty-sim';tab.textContent='Dynasty Simulator';
    tabs.append(tab);
    const panel=document.createElement('section');
    panel.id='dynasty-sim';panel.className='panel';
    panel.innerHTML='<div id="dynastySimRoot"><div class="loading">Loading Dynasty Simulator...</div></div>';
    greatest.insertAdjacentElement('afterend',panel);
    tab.onclick=()=>{if(typeof window.showTab==='function')window.showTab('dynasty-sim');else{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===tab));document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x===panel))}};
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
