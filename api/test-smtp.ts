import { Request, Response } from 'express';
import { createVerifiedTransporter, smtpErrorMessage, SmtpConfig } from './_lib/mailer';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { host, port, secure, user, pass, fromName } = req.body || {};

  if (!host || !port || [user, pass, fromName].some(value => typeof value !== 'string' || !value.trim())) {
    return res.status(400).json({ ok: false, error: 'SMTP host, port, Username, App Password, and From Name are required.' });
  }

  const config: SmtpConfig = { host, port, secure, user, pass, fromName };
  let transporter;

  try {
    transporter = await createVerifiedTransporter(config);
    await transporter.sendMail({
      from: { name: fromName.trim(), address: user.trim() },
      to: user.trim(),
      subject: 'Job Mailer Test',
      text: 'This is a test email from the Job Outreach Mailer app. Your SMTP configuration is working!',
    });

    return res.status(200).json({ ok: true, message: 'Test email sent successfully' });
  } catch (error: any) {
    console.error('SMTP Test Error:', error);
    return res.status(500).json({ ok: false, error: smtpErrorMessage(error) });
  } finally {
    transporter?.close();
  }
}
