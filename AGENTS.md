# Rural Utah Sports project instructions

These instructions apply to all work in this repository.

## Authentic assets and site design

- Never recreate school logos using AI. Use authentic school logo files only.
- Preserve existing website features when making changes. Check affected features for regressions.
- Prioritize mobile-friendly layouts and Rural Utah Sports (RUS) branding.

## Sports data accuracy

- Verify sports statistics and game results using reliable sources, including Deseret News and MaxPreps. Record the sources used when reporting data changes.
- Never invent statistics or game results. If a fact cannot be verified, identify the uncertainty instead of presenting it as confirmed.

## Testing and verification

- Test changes before submitting them. Run the existing automated tests and report failures, including pre-existing failures; do not hide failures or claim unrun checks passed.
- From the repository root, run `node --test tests/*.test.cjs`, `node scripts/test-shared-runtime.cjs`, and `node scripts/test-search-runtime.cjs`. Run additional relevant checks for the affected features.
- Verify that changes actually work using evidence appropriate to the change. For website behavior or layout changes, exercise the affected pages and mobile layouts; a successful edit or syntax check alone does not establish that a feature works.
- Report what was verified, the results, and any limitations or checks that could not be completed. Do not simply claim the work is finished.

## Review and release

- Create a GitHub pull request for the user's review and approval when submitting changes.
- Include a clear description of the changes and the testing results, failures, and limitations in the pull request.
- Never merge a pull request or deploy changes without the user's explicit authorization.
