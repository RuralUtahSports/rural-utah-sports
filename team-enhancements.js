(() => {
  'use strict';
  let runtime = document.querySelector('script[data-rus-team-enhancements-runtime]');
  if (!runtime) {
    runtime = document.createElement('script');
    runtime.src = 'team-enhancements-runtime.js?v=20260826-player-records2';
    runtime.async = false;
    runtime.dataset.rusTeamEnhancementsRuntime = '1';
    document.head.append(runtime);
  }
  const loadExtras = () => {
    const files = [
      'team-logo-header.js?v=20260819-teamfix2',
      'school-sponsor.js?v=20260819-sponsor4',
      'team-page-fixes.js?v=20260819-teamfix2',
      'js/team-stat-records.js?v=20260826-teamrecords1'
    ];
    files.forEach(file => {
      const script = document.createElement('script');
      script.src = file;
      script.async = true;
      document.head.append(script);
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadExtras, { once: true });
  else loadExtras();
})();
