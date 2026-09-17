import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('./playchive-tokens.json', import.meta.url), 'utf8'));
const css = readFileSync(new URL('./playchive-tokens.css', import.meta.url), 'utf8');
function luminance(hex) {
  assert.match(hex, /^#[\da-f]{6}$/i);
  const c = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
assert.equal(contrast('#FFFFFF', '#000000'), 21);
assert.equal(contrast('#2455DB', '#2455DB'), 1);
assert.equal(data.shades.length, 33);
assert.equal(new Set(data.shades.map(s => s.token)).size, 33);
let checks = 0;
function check(label, fg, bg, minimum = 4.5) {
  const value = contrast(fg, bg);
  assert.ok(value >= minimum, `${label}: ${value} < ${minimum}`);
  checks++;
}
for (const s of data.shades) {
  check(s.token, s.on, s.hex);
  assert.ok(Math.abs(contrast(s.on, s.hex) - s.contrast) < 1e-9);
  assert.ok(css.includes(`--${s.token}: ${s.hex};`));
  assert.ok(css.includes(`--on-${s.token}: ${s.on};`));
}
for (const [mode, t] of Object.entries(data.themes)) {
  for (const fg of ['text', 'muted']) {
    for (const bg of ['background', 'surface']) check(`${mode}/${fg}/${bg}`, t[fg], t[bg]);
  }
  for (const role of ['primary', 'secondary', 'tertiary']) {
    check(`${mode}/${role}`, t[`on${role[0].toUpperCase()}${role.slice(1)}`], t[role]);
  }
  for (const bg of ['background', 'surface']) check(`${mode}/border/${bg}`, t.border, t[bg], 3);
  const block = css.split(`[data-theme="${mode}"] {`)[1]?.split('}')[0];
  assert.ok(block);
  for (const [key, value] of Object.entries(t)) {
    const token = key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
    assert.ok(block.includes(`--${token}: ${value};`));
  }
}
console.log(`PASS: ${checks} contrast pairs; CSS/JSON synchronized.`);
console.log(`Shade minimum: ${Math.min(...data.shades.map(s => contrast(s.hex, s.on))).toFixed(6)}:1`);
