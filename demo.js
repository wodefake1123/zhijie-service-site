import { sampleCsv, prepareOrders, exportOrders } from './demo-data.mjs';

const input = document.querySelector('#demoInput');
const result = document.querySelector('#demoResult');
const empty = document.querySelector('#demoEmpty');
const message = document.querySelector('#demoMessage');
const errorMessage = document.querySelector('#demoError');
const table = document.querySelector('#demoRows');
const exportButton = document.querySelector('#exportDemo');
let currentRows = [];

function clearResult() {
  currentRows = [];
  errorMessage.hidden = true;
  errorMessage.textContent = '';
  input.removeAttribute('aria-invalid');
  result.hidden = true;
  empty.hidden = false;
  exportButton.disabled = true;
  table.replaceChildren();
}
input.addEventListener('input', () => {
  clearResult();
  message.textContent = '内容已修改，请重新检查。';
});
document.querySelector('#resetDemo').addEventListener('click', () => {
  input.value = sampleCsv;
  clearResult();
  message.textContent = '已恢复示例，可以重新检查。';
});
document.querySelector('#runDemo').addEventListener('click', () => {
  clearResult();
  const data = prepareOrders(input.value);
  if (data.error) {
    errorMessage.textContent = data.error;
    errorMessage.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    message.textContent = '';
    input.focus();
    return;
  }
  currentRows = data.rows;
  for (const row of currentRows) {
    const tr = document.createElement('tr');
    for (const value of [row.id || '—', row.product || '—', row.quantity || '—', row.message]) {
      const td = document.createElement('td');
      td.textContent = value;
      tr.append(td);
    }
    tr.lastElementChild.className = `demo-row-status ${row.status}`;
    table.append(tr);
  }
  document.querySelector('#demoValid').textContent = data.valid;
  document.querySelector('#demoDuplicate').textContent = data.duplicate;
  document.querySelector('#demoInvalid').textContent = data.invalid;
  empty.hidden = true;
  result.hidden = false;
  exportButton.disabled = data.valid === 0;
  message.textContent = `已检查 ${currentRows.length} 条：${data.valid} 条可导出，${data.duplicate} 条重复，${data.invalid} 条待确认。`;
  if (matchMedia('(max-width: 720px)').matches) {
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    document.querySelector('.demo-output-panel').scrollIntoView({ behavior, block: 'start' });
  }
});
exportButton.addEventListener('click', () => {
  if (!currentRows.some(row => row.status === 'valid')) return;
  const blob = new Blob([exportOrders(currentRows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'zhijie-demo-orders.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  message.textContent = '已生成有效记录 CSV，可在表格工具中打开。';
});
