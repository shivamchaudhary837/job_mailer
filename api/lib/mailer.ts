import nodemailer from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName?: string;
  fromEmail?: string;
}

export function createTransporter(config: SmtpConfig) {
  const host = config.host.trim();
  const port = Number(config.port);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465 ? true : port === 587 ? false : config.secure,
    requireTLS: port === 587,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 60000,
    auth: {
      user: config.user.trim(),
      pass: host.toLowerCase() === 'smtp.gmail.com' ? config.pass.replace(/\s/g, '') : config.pass,
    },
  });
}

export function smtpErrorMessage(error: any): string {
  if (error.code === 'EAUTH') return 'SMTP authentication failed. Check your email address and app password.';
  if (['ESOCKET', 'ECONNECTION', 'ETIMEDOUT', 'EDNS'].includes(error.code)) {
    return `Could not connect to the SMTP server (${error.code}). Check the host, port, and whether your network or VPN allows SMTP connections. ${error.message}`;
  }
  return error.message || 'SMTP request failed';
}

// Select a working connection before sending any messages; never retry delivery.
export async function createVerifiedTransporter(config: SmtpConfig) {
  const transporter = createTransporter(config);
  try {
    await transporter.verify();
    return transporter;
  } catch (error: any) {
    transporter.close();
    if (config.host.trim().toLowerCase() !== 'smtp.gmail.com' ||
        ![465, 587].includes(Number(config.port)) ||
        !['ESOCKET', 'ECONNECTION', 'ETIMEDOUT'].includes(error.code)) throw error;
    const alternate = createTransporter({ ...config, port: Number(config.port) === 465 ? 587 : 465 });
    try {
      await alternate.verify();
      return alternate;
    } catch (alternateError) {
      alternate.close();
      throw alternateError;
    }
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
