# Security Policy

## Supported versions

Only the latest release of Bitbucket Review Reset receives security fixes.

## Reporting a vulnerability

Please do not report security vulnerabilities through public issues.

Use GitHub's private vulnerability reporting instead:
[Report a vulnerability](https://github.com/tobiaswild/bitbucket-review-reset/security/advisories/new).

Include as much of the following as you can:

- A description of the issue and its impact
- Steps to reproduce, or a proof of concept
- The affected version and browser

This is a personal project, so responses are on a best-effort basis. You will
be kept informed about the progress of a fix, and credited in the advisory
unless you prefer to stay anonymous.

## Scope

The extension only runs on `bitbucket.org` pages. It stores review progress
locally in the browser and only talks to Bitbucket's own API from the page.
It does not send data to any other server. Reports about the extension's
permissions, its content script, or its handling of locally stored data are
all in scope.
