(()=>{
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='rankings.html')return;
  const style=document.createElement('style');
  style.id='rus-rankings-mobile-fix';
  style.textContent=`
    @media(max-width:700px){
      .state25-row{
        grid-template-columns:48px minmax(0,1fr) auto!important;
        grid-template-areas:
          "rank team move"
          "rank class elo"
          "rank reason reason"!important;
        column-gap:10px!important;
        row-gap:7px!important;
        align-items:center!important;
        padding:14px 12px 14px 10px!important;
        min-height:0!important;
      }
      .state25-row>.rank-num{grid-area:rank;align-self:start;margin-top:1px}
      .state25-row>.movement{grid-area:move;justify-self:end;white-space:nowrap;font-size:12px;font-weight:900}
      .state25-row>.team-link{grid-area:team;min-width:0!important;width:100%!important;overflow:hidden}
      .state25-row .team-pill{max-width:100%!important;min-width:0!important;width:max-content;white-space:normal!important;overflow-wrap:anywhere;font-size:13px!important;padding:7px 9px!important}
      .state25-row>.state25-class{grid-area:class;text-align:left!important;font-size:10px!important;min-width:0}
      .state25-row>.state25-elo{grid-area:elo;text-align:right!important;font-size:12px!important;white-space:nowrap}
      .state25-row>.state25-reason{grid-area:reason!important;min-width:0!important;padding:2px 0 0!important;font-size:12px!important;line-height:1.45!important;white-space:normal!important;overflow-wrap:anywhere}
      .movement.up{color:#5ee28a!important}.movement.down{color:#ff7777!important}.movement.new{color:#5ee28a!important}.movement.same{color:#777!important}
      .state25-labels{display:none!important}
    }
    @media(max-width:390px){
      .state25-row{grid-template-columns:42px minmax(0,1fr) auto!important;column-gap:8px!important;padding-left:8px!important;padding-right:8px!important}
      .state25-row .team-pill{font-size:12px!important}
      .state25-row>.state25-reason{font-size:11.5px!important}
    }
  `;
  document.head.appendChild(style);
})();