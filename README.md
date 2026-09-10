# English Writing Assessment V3

## Frontend
- `index.html` = Student Panel
- `teacher.html` = Teacher Panel
- `js/config.js` = paste the Apps Script Web App URL

## Backend
Upload `apps-script/Code.gs` and `apps-script/appsscript.json` to Google Apps Script.

## Current database / teacher settings
Spreadsheet ID:
`1hviwAh6woruUzHfaLC1Xy2C3R0XGrm_VvdpezqpeJwE`

Teacher panel key:
`koderahasia`

Google Docs Template ID and Drive Output Folder ID are intentionally left blank until you provide them.

## GitHub Pages URLs
Student:
`https://USERNAME.github.io/REPOSITORY/`

Teacher:
`https://USERNAME.github.io/REPOSITORY/teacher.html`

The teacher page is separate from the student page so the teacher panel does not load the student anti-copy/paste script. This fixes the issue where the teacher could not copy Google Docs / Drive IDs or document URLs.

## Important
The teacher key is a shared secret, not Google account authentication. For higher security, use Google Workspace authentication or another identity provider later.
