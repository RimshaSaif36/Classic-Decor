const fs = require('fs');
const path = require('path');

function filePath(name) {
  return path.resolve(__dirname, '..', 'data', name + '.json');
}

function ensureFile(name, defaultData) {
  const fp = filePath(name);
  if (!fs.existsSync(path.dirname(fp))) fs.mkdirSync(path.dirname(fp), { recursive: true });
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, JSON.stringify(defaultData, null, 2));
}

function read(name) {
  ensureFile(name, []);
  const data = fs.readFileSync(filePath(name), 'utf-8');
  return JSON.parse(data || '[]');
}

function write(name, data) {
  ensureFile(name, []);
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
}

module.exports = { read, write };
