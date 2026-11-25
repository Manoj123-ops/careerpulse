import nodemailer from 'nodemailer';

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export function parseRequestBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export function createSmtpTransporter({ smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass }) {
  const portNum = Number(smtpPort) || 465;
  const useSecure = smtpSecure !== undefined ? Boolean(smtpSecure) : portNum === 465;
  return nodemailer.createTransport({
    host: smtpHost || 'smtp.gmail.com',
    port: portNum,
    secure: useSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export async function verifySmtpConnection(payload) {
  const { smtpUser, smtpPass } = payload || {};
  if (!smtpUser || !smtpPass) {
    const err = new Error('SMTP username and password/app-password are required.');
    err.statusCode = 400;
    throw err;
  }
  const transporter = createSmtpTransporter(payload);
  await transporter.verify();
  return { ok: true, message: 'SMTP connection verified successfully.' };
}

export async function sendSmtpMail(payload) {
  const {
    smtpUser,
    smtpPass,
    fromName,
    to,
    cc,
    subject,
    textBody,
    htmlBody,
    attachmentFilename,
    attachmentBase64,
  } = payload || {};

  if (!smtpUser || !smtpPass) {
    const err = new Error('SMTP username and password/app-password are required.');
    err.statusCode = 400;
    throw err;
  }
  if (!to || !subject || !textBody) {
    const err = new Error('Recipient email (to), subject, and email body are required.');
    err.statusCode = 400;
    throw err;
  }

  const transporter = createSmtpTransporter(payload);
  const attachments = [];
  if (attachmentBase64 && attachmentFilename) {
    attachments.push({
      filename: attachmentFilename,
      content: attachmentBase64,
      encoding: 'base64',
      contentType: 'application/pdf',
    });
  }

  const info = await transporter.sendMail({
    from: fromName ? `"${fromName}" <${smtpUser}>` : smtpUser,
    to,
    cc: cc || undefined,
    subject,
    text: textBody,
    html: htmlBody || undefined,
    attachments,
  });

  return {
    ok: true,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
}
