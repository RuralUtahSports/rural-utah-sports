// The team loader supplies the verified alignment book and the current team names.
(() => {
  const {read,ratio,recordsFor} = window.RUSSeasonData;
  let request = 0;
  document.addEventListener('click', async event => {
    const button = event.target.closest('button[data-season].rus-season-button');
    if (!button) return;
    const year = button.dataset.season, alignment = currentYearAlignments[year];
    const dialog = document.getElementById('seasonSheet');
    const body = document.getElementById('seasonSheetBody');
    const token = ++request;
    const selected = normalize(paramsTeam());
    const sameGroup = other => {
      if (alignment.standingsUrl) return other.standingsUrl === alignment.standingsUrl;
      if (!alignment.region) return other.classification === alignment.classification;
      return other.region === alignment.region && other.classification === alignment.classification;
    };
    const members = Object.entries(allAlignments).filter(([,years]) => years[year] && sameGroup(years[year]));
    const isLeague = alignment.region && !['Freelance','Independent'].includes(alignment.region) && alignment.standingsUrl;
    const classes = [...new Set(members.map(([,years]) => years[year].classification).filter(Boolean))];
    document.getElementById('seasonSheetTitle').textContent = year + (isLeague ? ' Region Standings' : ' Football');
    document.getElementById('seasonSheetContext').textContent = [classes.join(' / '),alignment.region].filter(Boolean).join(' · ');
    body.textContent = 'Loading season records…';
    document.getElementById('seasonRecapLink').href = 'season-recap.html?year=' + year;
    dialog.showModal();
    const [archiveResult, recordsResult] = await Promise.allSettled([read('historical-football-programs.json'),recordsFor(year)]);
    if (token !== request || !dialog.open) return;
    const archive = archiveResult.value || {}, records = recordsResult.value || {};
    const rows = members.map(([id]) => {
      const [overall, group, source] = records[id] || [];
      const name = programDetails[id]?.team || archive[id]?.name || id;
      return {id,name,overall,group,mark:source === 'opponents' ? '*' : '',swatch:color(programDetails[id]?.backgroundColor,'#737373')};
    });
    rows.sort((a,b) => (isLeague ? ratio(b.group)-ratio(a.group) : 0) || ratio(b.overall)-ratio(a.overall) || a.name.localeCompare(b.name));
    const groupTitle = year === '2026' ? 'Region' : 'Vs. region';
    const note = isLeague && year !== '2026' ? 'Vs. region counts RUS regular-season results against teams in this region. Official league tiebreakers may differ.' : '';
    const status = recordsResult.status === 'rejected' ? 'Season records could not be loaded. Close and reopen to retry.' :
      rows.some(r => !r.overall || (isLeague && !r.group)) ? 'A dash means RUS has no verified record for that field.' : '';
    const partial = rows.some(r => r.mark) ? '* Recorded games from opponents’ RUS schedules. Additional games may be missing.' : '';
    const coverage = !alignment.region ? 'Region unverified. Showing known teams in this classification.' : '';
    body.innerHTML = `<table><thead><tr><th scope="col">School</th>${isLeague ? '<th scope="col">'+groupTitle+'</th>' : ''}<th scope="col">Overall</th></tr></thead><tbody>${rows.map(r =>
      `<tr${r.id === selected ? ' class="selected-school"' : ''}><td><span aria-hidden="true" class="school-swatch" style="background:${r.swatch}"></span>${escapeHTML(r.name)}</td>${isLeague ? '<td>'+(r.group ? r.group+r.mark : '—')+'</td>' : ''}<td>${r.overall ? r.overall+r.mark : '—'}</td></tr>`
    ).join('')}</tbody></table><small>${[coverage,note,partial,status].filter(Boolean).join(' ')}</small>`;
  });
})();
