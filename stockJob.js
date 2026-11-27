const cron = require('node-cron');
const Inventory = require('../models/Inventory');
const { sendMail } = require('../utils/mailer');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cell = 'padding:6px 12px;border:1px solid #ddd';

/**
 * Finds items with stock < threshold and emails the admin.
 * An item is only re-alerted after STOCK_ALERT_REPEAT_HOURS, and its alert state
 * resets as soon as it is restocked above the threshold.
 */
async function checkStock({ force = false } = {}) {
  // Restocked items become eligible for a fresh alert the next time they run low
  await Inventory.updateMany(
    { $expr: { $gte: ['$stock', '$threshold'] }, lastAlertAt: { $ne: null } },
    { lastAlertAt: null }
  );

  const low = await Inventory.find({ $expr: { $lt: ['$stock', '$threshold'] } }).sort({ category: 1, name: 1 });
  const repeatMs = (Number(process.env.STOCK_ALERT_REPEAT_HOURS) || 24) * 3600 * 1000;
  const due = force ? low : low.filter((i) => !i.lastAlertAt || Date.now() - i.lastAlertAt.getTime() > repeatMs);

  if (!due.length) return { lowCount: low.length, alerted: 0 };

  const to = process.env.ADMIN_EMAIL;
  if (!to) throw new Error('ADMIN_EMAIL is not set');

  const rows = due
    .map(
      (i) =>
        `<tr><td style="${cell}">${esc(i.category)}</td><td style="${cell}">${esc(i.name)}</td>` +
        `<td style="${cell}"><b>${i.stock}</b></td><td style="${cell}">${i.threshold}</td></tr>`
    )
    .join('');
  const html =
    `<p>These inventory items are below their minimum level:</p>` +
    `<table style="border-collapse:collapse"><tr><th style="${cell}">Type</th><th style="${cell}">Item</th>` +
    `<th style="${cell}">In stock</th><th style="${cell}">Minimum</th></tr>${rows}</table>` +
    `<p>Update stock from the admin inventory dashboard.</p>`;
  const text = due.map((i) => `- ${i.name} (${i.category}): ${i.stock} left, minimum ${i.threshold}`).join('\n');

  await sendMail({ to, subject: `Low stock: ${due.length} item(s) need restocking`, html, text: `Low stock alert\n${text}` });
  await Inventory.updateMany({ _id: { $in: due.map((i) => i._id) } }, { lastAlertAt: new Date() });
  return { lowCount: low.length, alerted: due.length };
}

function startStockJob() {
  const expr = process.env.STOCK_CHECK_CRON || '*/30 * * * *';
  if (!cron.validate(expr)) {
    console.error(`Invalid STOCK_CHECK_CRON "${expr}". Low-stock job not started.`);
    return;
  }
  cron.schedule(expr, () => checkStock().catch((e) => console.error('Stock check failed:', e.message)));
  console.log(`Low-stock job scheduled (${expr})`);
}

module.exports = { checkStock, startStockJob };
