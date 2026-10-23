# 2026 Rural Utah Sports Region Awards — publishing and security

The 2026 Region Awards Hub is at `/region-awards.html`, with a link on the locked All-Region rankings page. The site remains static on GitHub Pages; publishing goes to the existing Supabase project, not to localStorage.

## Included

- First Team: QB, RB, WR1, WR2, WR3, TE, FLEX, DL, DE, MLB, S, CB.
- Second Team: same 12 positions; an athlete cannot repeat across First/Second/Honorable Mention.
- Honorable Mention: up to two extra players per position, no duplicates; roster depth and reported production can mean fewer.
- Region MVP, Offensive Player of the Year, Defensive Player of the Year.
- Coach-stat/reporting warnings and strict-versus-broad position checks. Defensive stats are not position-specific; the locked roster position is the eligibility source.
- School representation totals, and editable PNG graphics with original local school logos (cached school logo map).
- No automatic social media captions.

## Ranked picks vs editorial awards

Recommendations are computed from the frozen October 23, 2026 regular-season snapshot. Missing coaching reports are not equivalent to zero production. No RUS editorial or coach-voted winners are claimed until a region is explicitly published. The historical locked ranking data is not edited by the Hub.

## Permanent publishing setup

Supabase tables:

- `public.rus_award_editors` — privileged editor user IDs, writable only by the Supabase project administrator.
- `public.rus_region_awards` — one awards record per season and region, with `draft` and `published` statuses. RLS exposes **published** rows to anonymous visitors; only approved, authenticated editors can save drafts or publish. All browser API calls use a **publishable** key, never an admin/service-role key.

To activate editing for a specific person:

1. Enable email sign-in in Supabase Authentication and allow the site URL `https://ruralutahsports.com/region-awards.html` under Authentication → URL Configuration.
2. The intended editor opens the Hub and signs in using their email code/link. Their authenticated Supabase user ID is shown on the page pending approval.
3. The project owner confirms the account identity in Supabase Authentication → Users, then adds that confirmed UUID to `public.rus_award_editors` (through the Supabase dashboard or a privileged SQL connection):

```sql
insert into public.rus_award_editors (user_id)
values ('CONFIRMED-AUTH-USER-UUID')
on conflict (user_id) do nothing;
```

Never grant the public browser the service-role key, never automatically approve new signups, and never make INSERT/UPDATE open to `anon` or all `authenticated` users. Do not identify an editor from a client-provided UUID without independently verifying the Supabase Auth identity.

No editors were initially seeded because this project's Auth account list did not contain a confirmed editor account at implementation time. Until the owner approves one, the site provides editable local previews and JSON backups, but Save to Website and Finalize & Publish remain disabled.

## Data lifecycle

- `Save Private Draft to Website` writes a reviewable draft for approved editors and removes the public version when changing an already published region back to draft, after a confirmation.
- `Finalize & Publish Region` requires all First-Team and Second-Team positions plus MVP/OPOY/DPOY and explicitly asks for confirmation.
- Public visitors can view already published teams, award winners, and PNGs; they cannot modify published selections.
- The editor can adjust manually and republish; local drafts do not overwrite published records automatically.
- All graphics from unfinalized selections are labeled **DRAFT**.

## Validation

- Source JS syntax tested.
- Selection algorithm tested over all 18 competitive regions: 12 first-team + 12 second-team suggestions per region and three suggested award winners, with no duplicate players across team tiers; honorable mention totals vary with available reported stats.
- Original school logo mapping covers all 117 schools in the competitive-region snapshot.
- Supabase anonymous SELECT tested with role `anon`; no unpublished records exposed.
- Supabase Security Advisor found no warnings on the two new awards tables. Pre-existing advisory notices on unrelated application tables were not modified.

## Next season

The data adapter and year are currently pinned to 2026. Before using this page for a new football season, create a new locked regular-season snapshot, update the adapter/year, and retain season-specific archived records in Supabase.
