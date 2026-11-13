---
sidebar_position: 2
title: Privacy Policy
---

# Privacy Policy

_Last updated: 13 November 2026_

Bitbucket Review Reset does not collect, store or transmit any personal data. There is no
analytics, no tracking, no telemetry, and no server run by this project. Everything the
extension does happens locally in your browser.

## What the extension accesses

### Review state on pull request pages

When you open the popup on a Bitbucket Cloud pull request, the extension reads the
`localStorage` entries that **Bitbucket itself** wrote for that pull request and shows you what
they contain: the files marked as viewed, the last reviewed commit and when that entry expires.
When you reset the review state, from the popup, the keyboard shortcut or the page's context
menu, it deletes these entries, or only the parts or files you selected.

So that you can undo a reset, the deleted entries are kept for 10 minutes in the extension's
session storage (`storage.session`). It stays on your device, is never synced, and is emptied
when the browser closes. Nothing leaves your browser.

### Repository names

A pull request can be opened through a link that uses UUIDs instead of the workspace and
repository names. To turn such a link back into a readable one, the extension asks Bitbucket's
own API (`/!api/2.0/repositories/…`) for the repository name, from inside the Bitbucket tab and
with the session you are already signed in with. That request goes to `bitbucket.org` and
nowhere else.

### Your settings

Three preferences are stored: whether UUID links are redirected automatically, whether the page
reloads after a reset, and the interface language. They are saved with the browser's
`storage.sync` API, so if you have browser sync switched on, your browser copies them between your own devices through your browser account.
They contain no personal data.

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `activeTab` | Read the address of the current tab once you click the toolbar icon, press the keyboard shortcut or use the context menu entry, so the extension knows which pull request you are looking at. |
| `contextMenus` | Add **Reset review state of this pull request** to the page's context menu on pull requests. |
| `scripting` | Run a short function inside the Bitbucket tab to list and clear the review-state entries. |
| `storage` | Save the settings described above and, for 10 minutes, the entries of your last reset. |
| `https://bitbucket.org/*` | Let the extension work on Bitbucket pull request pages and rewrite UUID links. |

## Data sharing

None. No data is sold, shared, or passed on to third parties, and none is used for advertising,
profiling, or credit assessment.

## Source code

The extension is open source. You can read every line at
[github.com/tobiaswild/bitbucket-review-reset](https://github.com/tobiaswild/bitbucket-review-reset).

## Changes to this policy

If this policy changes, the updated version is published on this page with a new date.

## Contact

Questions or concerns: please open an issue at
[github.com/tobiaswild/bitbucket-review-reset/issues](https://github.com/tobiaswild/bitbucket-review-reset/issues).
