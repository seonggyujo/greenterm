#!/usr/bin/env node
/**
 * heron-limits status line. Claude Code runs it with the status line input on stdin (setup.js
 * points `statusLine` in settings.json at a copy of it).
 *   1. Inside a Heron pane: writes the usage limits and the context use for Heron (heron-file.js).
 *   2. Prints what the user's own status line prints (previous.js), or nothing.
 * Never throws: whatever fails, the status line stays as it was.
 */
'use strict';

const heronFile = require('./heron-file');
const previous = require('./previous');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => (raw += chunk));
process.stdin.on('end', () => {
  try {
    heronFile.write(JSON.parse(raw));
  } catch (e) {}
  // Exit once written: the user's status line may have left a child running.
  previous.run(raw, out => process.stdout.write(out || '', () => process.exit(0)));
});
