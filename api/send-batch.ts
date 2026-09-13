import { Request, Response } from 'express';
import { createVerifiedTransporter, smtpErrorMessage, sleep, SmtpConfig } from './lib/mailer';

interface Message {
  to: string;
  subject: string;
  html: string;
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { smtpConfig, messages, delayMs, attachment } = req.body as {
    smtpConfig: SmtpConfig;
    messages: Message[];
    delayMs: number;
    attachment?: { filename: string; content: string } | null;
  };

  if (!smtpConfig || !messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ ok: false, error: 'Invalid request body' });
  }

  // Basic safety caps
  if ([smtpConfig.user, smtpConfig.pass, smtpConfig.fromName].some(value => typeof value !== 'string' || !value.trim())) {
    return res.status(400).json({ ok: false, error: 'Username, App Password, and From Name are required.' });
  }

  if (messages.length > 20) {
    return res.status(400).json({ ok: false, error: 'Max 20 messages allowed per batch' });
  }
  
  const actualDelay = Math.min(Math.max(delayMs || 0, 0), 60000); // Cap 0-60s

  let attachments;
  if (attachment != null) {
    const maxBytes = 2 * 1024 * 1024;
    if (typeof attachment.filename !== 'string' || !/\.pdf$/i.test(attachment.filename) ||
        typeof attachment.content !== 'string' || attachment.content.length > 4 * Math.ceil(maxBytes / 3) ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(attachment.content)) {
      return res.status(400).json({ ok: false, error: 'Attach a valid PDF no larger than 2 MB.' });
    }
    const content = Buffer.from(attachment.content, 'base64');
    if (content.length > maxBytes || content.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return res.status(400).json({ ok: false, error: 'Attach a valid PDF no larger than 2 MB.' });
    }
    const filename = attachment.filename.split(/[\\/]/).pop()!.replace(/[\x00-\x1f\x7f]/g, '_');
    attachments = [{ filename, content, contentType: 'application/pdf', contentDisposition: 'attachment' as const }];
  }

  let transporter;
  const from = `${smtpConfig.fromName || smtpConfig.user} <${smtpConfig.fromEmail || smtpConfig.user}>`;
  const results = [];

  try {
    transporter = await createVerifiedTransporter(smtpConfig);
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      try {
        await transporter.sendMail({
          from,
          to: msg.to,
          subject: msg.subject,
          html: msg.html,
          attachments,
        });
        results.push({ to: msg.to, success: true });
      } catch (err: any) {
        console.error(`Error sending to ${msg.to}:`, err);
        results.push({ to: msg.to, success: false, errorMessage: smtpErrorMessage(err) });
      }

      // Delay between emails, but not after the last one
      if (i < messages.length - 1 && actualDelay > 0) {
        await sleep(actualDelay);
      }
    }

    return res.status(200).json({ ok: true, results });
  } catch (globalError: any) {
    console.error('Batch Send Global Error:', globalError);
    return res.status(500).json({ ok: false, error: smtpErrorMessage(globalError), results });
  } finally {
    transporter?.close();
  }
}
