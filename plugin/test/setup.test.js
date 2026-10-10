/** setup.js: taking the status line, keeping the user's own one, and giving it back. */
'use strict';

const assert = require('assert');
const fs = require('fs');
const { test } = require('node:test');
const { tempConfig, setup, settings, statusLine } = require('./helpers');

test('takes an empty status line slot and prints nothing in it', () => {
  const config = tempConfig();
  const note = setup(config, 'sync');
  assert.match(note, /restart Claude Code/);
  assert.match(settings(config).statusLine.command, /heron-limits\/statusline\.js"$/);
  assert.strictEqual(statusLine(config, { model: { id: 'claude-opus-5-5' } }), '');
  assert.strictEqual(setup(config, 'sync'), '', 'a second sync changes nothing and says nothing');
});

test("keeps the user's own status line, its output and its settings", () => {
  const config = tempConfig();
  const own = { type: 'command', command: 'echo "my line"', refreshInterval: 5, padding: 1 };
  fs.writeFileSync(config.settingsFile, JSON.stringify({ model: 'opus', statusLine: own }, null, 4));
  setup(config, 'first-run');
  const line = settings(config).statusLine;
  assert.deepStrictEqual([line.refreshInterval, line.padding], [5, 1]);
  assert.strictEqual(statusLine(config, {}), 'my line');

  const before = fs.readFileSync(config.settingsFile, 'utf8');
  setup(config, 'first-run');
  assert.strictEqual(fs.readFileSync(config.settingsFile, 'utf8'), before, 'first-run runs once');

  assert.match(setup(config, 'disable'), /Your own status line is back/);
  assert.deepStrictEqual(settings(config), { model: 'opus', statusLine: own });
  assert.ok(fs.readFileSync(config.settingsFile, 'utf8').includes('    "model"'), 'the indent stays');
  assert.ok(!fs.existsSync(config.dataDir));
});

test('a status line set later is taken again, and a failing one shows nothing', () => {
  const config = tempConfig();
  setup(config, 'sync');
  const file = settings(config);
  file.statusLine = { type: 'command', command: 'exit 3' };
  fs.writeFileSync(config.settingsFile, JSON.stringify(file));
  assert.match(setup(config, 'sync'), /restart/);
  assert.strictEqual(statusLine(config, {}), '');
});

test('leaves settings.json alone when it is not valid JSON', () => {
  const config = tempConfig();
  fs.writeFileSync(config.settingsFile, '{ broken');
  assert.strictEqual(setup(config, 'sync'), '');
  assert.strictEqual(fs.readFileSync(config.settingsFile, 'utf8'), '{ broken');
});
