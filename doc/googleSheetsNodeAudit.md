# Google Sheets Node Audit

## Status

- Node: Google Sheets
- Category: Action
- Current readiness: `Limited`
- Beta priority: High
- Audit date: 2026-04-12

## What Was Improved In This Pass

- Added searchable spreadsheet selection in the configuration dialog.
- Added searchable sheet selection in the configuration dialog.
- Reduced UI crowding by tightening the modal width and making the layout more resilient.
- Improved select/input overflow handling for long spreadsheet names, sheet names, and mapping rows.
- Replaced broken refresh button text rendering with proper refresh icons.
- Cleaned several garbled UI strings in the Google Sheets node files.
- Improved footer button layout for smaller screens.

## UI/UX Review

### Improved

- Spreadsheet selection is now much easier when users have many spreadsheets.
- Sheet selection is now easier when a workbook has many tabs.
- Long names are less likely to overflow the UI.
- Mapping rows are more readable and less cramped.
- Mobile and narrower modal widths should behave more predictably.

### Still Open

- Read-mode column selection still uses the basic selector instead of the same searchable picker pattern.
- The dialog still has a lot of configuration on one screen and could benefit from clearer step grouping.
- Source and saved-response selection are functional, but not yet optimized for long lists.
- The append/read sections could use a stronger summary panel that tells the user exactly what will happen.

## Product / Runtime Review

### Working Well

- Credential connection flow exists.
- Spreadsheet and sheet loading work off the selected Google credential.
- Column refresh exists for both append and read flows.
- Append mapping and read output mapping are both configurable.

### Risks / Follow-Up

- Need deeper QA on very large spreadsheets and sheets with many columns.
- Need validation review for custom range overrides.
- Need a more guided mapping experience for non-technical users.
- Need regression testing for append and read flows after the dialog changes.

## Recommended Next Steps

- Add searchable column selection for read-mode filters.
- Add a short “Setup / Mapping / Advanced” step treatment in the dialog.
- Add a lightweight preview summary:
  selected spreadsheet, selected sheet, action, and mapping status.
- Run focused QA on:
  - long spreadsheet names
  - many sheet tabs
  - many output columns
  - append with partial mappings
  - read with filter conditions
