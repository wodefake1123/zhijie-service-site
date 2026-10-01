export const sampleCsv = '订单号,商品,数量\nZJ-001,桌面支架,2\nZJ-002,无线键盘,1\nZJ-001,桌面支架,2\nZJ-003,显示器,';

function readCsv(source) {
  const records = [];
  let record = [], cell = '', quoted = false, afterQuote = false;
  function finishCell() { record.push(cell.trim()); cell = ''; afterQuote = false; }
  function finishRecord() { finishCell(); if (record.some(Boolean)) records.push(record); record = []; }
  const text = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; afterQuote = true; }
      else cell += char;
    } else if (char === ',') finishCell();
    else if (char === '\n') finishRecord();
    else if (afterQuote) { if (char !== ' ' && char !== '\t') throw new Error('引号结束后应为逗号或换行。'); }
    else if (char === '"') {
      if (cell.trim()) throw new Error('字段中的引号需要用双引号包围，并写成两个引号。');
      cell = ''; quoted = true;
    } else cell += char;
  }
  if (quoted) throw new Error('有一处引号没有闭合，请检查输入。');
  finishRecord();
  return records;
}

export function prepareOrders(source) {
  if (!source.trim()) return { error: '请先输入订单数据，或点击“恢复示例”。' };
  if (source.length > 8000) return { error: '演示最多处理 8,000 个字符，请减少输入。' };
  let records;
  try { records = readCsv(source); }
  catch (error) { return { error: error.message }; }
  const header = records.shift();
  if (header?.join(',') !== '订单号,商品,数量') return { error: '第一行需要是：订单号,商品,数量。可点击“恢复示例”查看格式。' };
  if (!records.length) return { error: '表头下面还没有记录，请至少添加一条订单。' };
  if (records.length > 100) return { error: '交互演示最多处理 100 条记录，请减少输入。' };
  const seen = new Set();
  const rows = records.map((fields) => {
    const [id = '', product = '', quantity = ''] = fields;
    let status = 'valid', message = '可导出';
    if (fields.length !== 3) { status = 'invalid'; message = '字段数不正确'; }
    else if (!id || !product || !quantity) { status = 'invalid'; message = '缺少字段'; }
    else if (!/^\d+$/.test(quantity) || Number(quantity) < 1 || Number(quantity) > 10000) { status = 'invalid'; message = '数量需为 1–10000'; }
    else if (seen.has(id)) { status = 'duplicate'; message = '重复编号'; }
    else seen.add(id);
    return { id, product, quantity, status, message };
  });
  return {
    rows,
    valid: rows.filter(row => row.status === 'valid').length,
    duplicate: rows.filter(row => row.status === 'duplicate').length,
    invalid: rows.filter(row => row.status === 'invalid').length,
  };
}

export function exportOrders(rows) {
  const quote = value => {
    let text = String(value);
    // Keep user-entered spreadsheet formulas as text when the CSV is opened.
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const values = [['订单号', '商品', '数量'], ...rows.filter(row => row.status === 'valid').map(row => [row.id, row.product, Number(row.quantity)])];
  return '\uFEFF' + values.map(row => row.map(quote).join(',')).join('\r\n');
}
