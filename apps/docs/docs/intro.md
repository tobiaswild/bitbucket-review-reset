---
sidebar_position: 1
slug: /
---

# Introduction

Bitbucket Review Reset is a Chrome extension that clears the locally stored review progress ("viewed" files and last reviewed commit) for the Bitbucket Cloud pull request in the current tab.

## How it works

Bitbucket keeps this in `localStorage` under three keys per PR:

- `{workspace}/{repo}/{id}:files-reviewed-state`
- `last-reviewed-commit:{workspace}/{repo}/{id}`
- `__storejs_expire_mixin_last-reviewed-commit:{workspace}/{repo}/{id}`

## Usage

Open a PR, click the toolbar icon, review the listed keys and hit **Reset review state**. The page reloads afterwards, unless you turn that off in the settings. Without the reload, Bitbucket shows the cleared state the next time the page loads.

Faster without the popup: click **Reset review** in the bottom left corner of a pull request twice (the button can be hidden in the settings), press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> on a pull request, or right-click the page and choose **Reset review state of this pull request**. <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>U</kbd> undoes the last reset; while that is possible, the context menu also offers **Undo last reset of this pull request**. The shortcuts can be changed in the browser's extension shortcut settings, linked from the extension's settings page.

To reset only part of the state, untick **files marked as viewed** or the **last reviewed** commit before hitting the button. Under **Show files** you can also pick single files and mark them as not viewed again, e.g. to look at one file once more.

Changed your mind? For 10 minutes after a reset, the popup offers **Undo last reset** on the same PR and writes the removed entries back.
