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

Open a PR, click the toolbar icon, review the listed keys and hit **Reset review state**. The page reloads afterwards.
