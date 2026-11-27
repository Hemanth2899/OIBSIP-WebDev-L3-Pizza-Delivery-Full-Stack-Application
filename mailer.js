const nodemailer = require('nodemailer');

let transporter;
function getTransporter() {
  if (transporter !== undefined) return transporter;
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    transporter = null;
  }
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n[MAIL - SMTP not configured] To: ${to}\nSubject: ${subject}\n${text || html}\n`);
    return;
  }
  await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html, text });
}

module.exports = { sendMail };
