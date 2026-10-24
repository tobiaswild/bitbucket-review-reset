---
sidebar_position: 2
title: Privacy Policy
---

# Privacy Policy

_Last updated: 24 October 2026_

Bitbucket Review Reset does not collect, store or transmit any personal data. There is no
analytics, no tracking, no telemetry, and no server run by this project. Everything the
extension does happens locally in your browser.

## What the extension accesses

### Review state on pull request pages

When you open the popup on a Bitbucket Cloud pull request, the extension lists the
`localStorage` entries that **Bitbucket itself** wrote for that pull request, and deletes them
when you press **Reset review state**. The entry names and their sizes are shown to you in the
popup. Nothing is copied out of the tab.

### Repository names

A pull request can be opened through a link that uses UUIDs instead of the workspace and
repository names. To turn such a link back into a readable one, the extension asks Bitbucket's
own API (`/!api/2.0/repositories/…`) for the repository name, from inside the Bitbucket tab and
with the session you are already signed in with. That request goes to `bitbucket.org` and
nowhere else.

### Your settings

Two preferences are stored: whether UUID links are redirected automatically, and the interface
language. They are saved with the browser's `storage.sync` API, so if you have browser sync
switched on, your browser copies them between your own devices through your browser account.
They contain no personal data.

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `activeTab` | Read the address of the current tab once you click the toolbar icon, so the extension knows which pull request you are looking at. |
| `scripting` | Run a short function inside the Bitbucket tab to list and clear the review-state entries. |
| `storage` | Save the two settings described above. |
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
