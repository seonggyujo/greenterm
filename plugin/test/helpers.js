/**
 * Test helpers: a throwaway Claude Code config folder per test, and runners for setup.js and the
 * installed status line inside it.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const PLUGIN = path.join(__dirname, '..');

const made = [];
process.on('exit', () => made.forEach(dir => fs.rmSync(dir, { recursive: true, force: true })));

function tempDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  made.push(dir);
  return dir;
}

function tempConfig() {
  const dir = tempDir('heron-limits-');
  return {
    dir,
    settingsFile: path.join(dir, 'settings.json'),
    dataDir: path.join(dir, 'heron-limits'),
    agentDir: tempDir('heron-agents-'),
    env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: dir, HERON_PANE: '', HERON_AGENT_DIR: '' }),
  };
}

function setup(config, action) {
  return execFileSync('node', [path.join(PLUGIN, 'setup.js'), action], { env: config.env, encoding: 'utf8' });
}

function settings(config) {
  return JSON.parse(fs.readFileSync(config.settingsFile, 'utf8'));
}

/** Runs the installed status line with `input`, optionally inside Heron pane `pane`. */
function statusLine(config, input, pane) {
  const env = Object.assign({}, config.env, pane ? { HERON_PANE: pane, HERON_AGENT_DIR: config.agentDir } : {});
  return execFileSync('node', [path.join(config.dataDir, 'statusline.js')], { env, input: JSON.stringify(input), encoding: 'utf8' });
}

module.exports = { tempConfig, setup, settings, statusLine };
