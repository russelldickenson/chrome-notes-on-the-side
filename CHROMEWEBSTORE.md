# Chrome Web Store Listing — Chrome Notes Sidebar

> Last Updated: 2026-07-18

## Store Listing

**Extension Name** [REQUIRED]
Chrome Notes Sidebar


**Short Description** [REQUIRED]
A pale-yellow sticky notes manager that stays open on the right side of your browser. Supports bold, lists, and checklists.


**Detailed Description** [REQUIRED]
Chrome Notes Sidebar is an elegant and lightweight sticky notes manager designed to stay visible as you browse. By positioning itself in Chrome's side panel, it gives you a dedicated space to write down thoughts, manage tasks, and organize ideas side-by-side with your active tabs.

Key Features:
- Classic pale-yellow sticky notes layout with rounded corners and warm styling.
- Note Pinning: pin important notes to keep them sorted at the very top of your list, displaying a tilted pushpin indicator.
- Action Menu: hover over any card and click the ellipsis (three-dots) icon to access pin/unpin and deletion actions.
- Secure local storage: all notes are kept privately on your device.
- Direct editing: click any note to update its raw content.
- Markdown support: use double asterisks for bolding, hyphens for lists, and checkboxes for checklist items.
- Live checklists: check and uncheck tasks in view mode without entering edit mode.
- Deletion safety: confirmation overlay to prevent accidental note removals.
- High performance: zero tracking, no remote databases, and no battery-draining backgrounds.

How to use it:
1. Click the extension action icon in the Chrome toolbar to open the Notes Sidebar.
2. Click the "+" button to generate a new sticky note.
3. Type in plain text, tasks, or list items.
4. Format text by wrapping in **bold**, starting lines with - for bullets, or - [ ] for checklists.
5. Click outside the card or press Escape to save and render your formatted note.
6. Hover over a note card and click the ellipsis menu in the top right to pin the note or trigger deletion (with confirmation).

This extension stores notes entirely locally on your device using Chrome's secure storage. No data is collected, shared, or sent off-device.


**Category** [REQUIRED]
Productivity


**Single Purpose** [REQUIRED]
Manage private sticky notes with checklists in the Chrome side panel.


**Primary Language** [REQUIRED]
English


## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ⬜ Not created | |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |

### Screenshot Notes
* Screenshot 1: Show the side panel opened next to a regular webpage, displaying several yellow sticky notes with markdown content (bold headings, checkboxes, bullet items).
* Screenshot 2: Highlight a note card in edit mode showing raw markdown formatting next to a card in view mode showing checkboxes.


## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| sidePanel | permissions | Required to register and display the user's sticky notes dashboard in the persistent side panel of the browser. |
| storage | permissions | Required to securely store, retrieve, and synchronize the user's notes and checklist states locally. |


## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes


## Privacy Policy

**Privacy Policy URL** [RECOMMENDED]
https://github.com/russell/chrome-notes-sidebar/blob/main/PRIVACY.md


## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free


## Developer Info

**Publisher Name** [REQUIRED]
Russell

**Contact Email** [REQUIRED]
russell@example.com

**Support URL / Email** [RECOMMENDED]
https://github.com/russell/chrome-notes-sidebar/issues


## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.4.4 | 2026-07-18 | UI Fix: Adjusted note preview body text max-height from 2.6rem to 2.8rem to better accommodate multi-paragraph space rendering under line-clamp. | Draft |
| 1.4.3 | 2026-07-18 | UI Fix: Adjusted note preview body text max-height from 2.4rem to 2.6rem for slightly better paragraph layout spacing tolerance. | Draft |
| 1.4.2 | 2026-07-18 | Font Optimization: Bundled the Inter font locally (.woff2 files) in the extension to bypass default Chrome extension CSP and ensure 'Inter' renders correctly everywhere. | Draft |
| 1.4.1 | 2026-07-18 | UI Fix: Added strict max-height limit of 2.4rem to note preview body text, ensuring list items or paragraph blocks never bypass the 2-line visual limit on notes cards. | Draft |
| 1.4.0 | 2026-07-18 | Smart Markdown Editor: Added automatic bullet (`- `) and checkbox (`- [ ] `) prefix insertion when pressing Enter in edit mode, maintaining indentation and positioning the cursor instantly. | Draft |
| 1.3.6 | 2026-07-18 | UI Revert: Reverted note preview body text line-clamp back to 2 lines. | Draft |
| 1.3.5 | 2026-07-18 | UI Fix: Changed note preview body text line-clamp to 1 line for an even cleaner list view layout. | Draft |
| 1.3.4 | 2026-07-18 | UI Fix: Clamped note preview body text to 2 lines instead of 4 and removed max-height limit on note cards so that wrapping tags are never clipped. | Draft |
| 1.3.3 | 2026-07-18 | UI Fix: Changed tag badge max-width to 100% to prevent premature tag truncation when horizontal space is available. | Draft |
| 1.3.2 | 2026-07-18 | UI Polish: Set tag input field to auto-expand to fill all remaining horizontal space on the header row. | Draft |
| 1.3.1 | 2026-07-18 | Editor Tag Layout Refactoring: Moved the 'new tag' input field inline with the 'Tags' label, displaying only existing tag chips in the row below, creating a cleaner vertical layout. | Draft |
| 1.3.0 | 2026-07-18 | Data Loss Prevention Safeguards: Added pagehide listener to guarantee saving pending edits when sidepanel closes; introduced isNew flag to prevent empty existing notes from being deleted when cleared; added load verification guard to prevent overwriting notes database if initial read fails. | Draft |
| 1.2.3 | 2026-07-18 | Added 'New note' hover tooltip text to the add-note button. | Draft |
| 1.2.2 | 2026-07-18 | Quick Editing Shortcuts: Added double-click to transition notes into edit mode from both the notes grid preview and the editor view mode. Added [Cmd/Ctrl]+[Enter] keyboard shortcut to quickly save changes and switch from edit mode to view mode. | Draft |
| 1.2.1 | 2026-07-18 | Multi-tag Filtering & Wrapped Tag Layout: Added support for selecting multiple tags simultaneously (filtering notes that contain all selected tags). Changed tags list to wrap onto multiple lines instead of horizontally scrolling. Styled the 'All tags' button as a distinct rounded rectangle using the primary indigo theme color. | Draft |
| 1.2.0 | 2026-07-18 | Compact Header Design: Moved the 'new note' button inline with the tag filter bar, reduced header min-height to 48px with tighter paddings, and removed the redundant title block to maximize vertical space for notes. | Draft |
| 1.1.2 | 2026-07-18 | Removed the redundant header title and logo icon from the HTML layout since Chrome already provides a native title and icon in the side panel header; aligned the main actions header to the right. | Draft |
| 1.1.1 | 2026-07-18 | Added the extension's SVG icon to the heading in the sidepanel and updated the title to 'Chrome Notes Sidebar'. | Draft |
| 1.1.0 | 2026-07-11 | Replaced hover delete with vertical ellipsis actions menu; added note pinning (top-sorting + pushpin icon); added localStorage fallback; adjusted layout compact settings, paddings, and header styling. | Draft |
| 1.0.0 | 2026-07-10 | Initial release: sticky notes sidebar with markdown parsing and storage. | Published |


## Review Notes

### Known Issues / Limitations
None.
