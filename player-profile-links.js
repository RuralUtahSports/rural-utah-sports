(()=>{
'use strict';
const path=(location.pathname.split('/').pop()||'').toLowerCase();
if(path!=='team.html')return;
function linkPlayers(){document.querySelectorAll('tr[data-player-id]').forEach(row=>{const id=row.dataset.playerId;if(!id)return;const cell=row.querySelector('.rus-player');if(!cell||cell.querySelector('a.rus-player-profile'))return;let nameNode=[...cell.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());if(!nameNode)return;const name=nameNode.textContent.trim();const a=document.createElement('a');a.className='rus-player-profile';a.href=`player.html?id=${encodeURIComponent(id)}`;a.textContent=name;a.style.color='#fff';a.style.textDecoration='none';a.style.borderBottom='1px dotted #777';a.addEventListener('mouseenter',()=>{a.style.color='#F14D07';a.style.borderColor='#F14D07'});a.addEventListener('mouseleave',()=>{a.style.color='#fff';a.style.borderColor='#777'});nameNode.replaceWith(a)})}
linkPlayers();
const obs=new MutationObserver(linkPlayers);obs.observe(document.body,{childList:true,subtree:true});
})();
