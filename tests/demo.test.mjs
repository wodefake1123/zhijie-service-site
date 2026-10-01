import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleCsv, prepareOrders, exportOrders } from '../demo-data.mjs';

test('sample marks duplicate and incomplete orders rather than exporting them', () => {
  const result = prepareOrders(sampleCsv);
  assert.equal(result.valid, 2);
  assert.equal(result.duplicate, 1);
  assert.equal(result.invalid, 1);
  const csv = exportOrders(result.rows);
  assert.equal(csv.split('\r\n').length, 3);
  assert.ok(!csv.includes('显示器'));
});
test('quoted CSV fields, escaped quotes, BOM and CRLF preserve content', () => {
  const result = prepareOrders('\uFEFF订单号,商品,数量\r\nA,"键盘,黑色",2\r\nB,"桌面""支架",1\r\n');
  assert.equal(result.valid, 2);
  assert.equal(result.rows[0].product, '键盘,黑色');
  assert.equal(result.rows[1].product, '桌面"支架');
  assert.ok(exportOrders(result.rows).includes('"桌面""支架"'));
});
test('missing fields, wrong column counts and invalid quantities stay out of exports', () => {
  const result = prepareOrders('订单号,商品,数量\nA,键盘,0\nB,键盘,1.5\nC,,2\nD,键盘,1,额外\nE,键盘,-1\nF,键盘,10001');
  assert.equal(result.valid, 0);
  assert.equal(result.invalid, 6);
});
test('malformed input gives actionable errors and enforces demo limits', () => {
  for (const input of ['', '姓名,商品,数量\nA,B,1', '订单号,商品,数量', '订单号,商品,数量\nA,"B,1', '订单号,商品,数量\nA,"B"x,1', 'x'.repeat(8001), '订单号,商品,数量\n' + 'A,B,1\n'.repeat(101)]) {
    assert.ok(prepareOrders(input).error);
  }
});
test('export neutralizes spreadsheet formula prefixes and quotes CSV fields', () => {
  const result = prepareOrders('订单号,商品,数量\n=1+1,@demo,1');
  const csv = exportOrders(result.rows);
  assert.ok(csv.includes('"\'=1+1"'));
  assert.ok(csv.includes('"\'@demo"'));
});
