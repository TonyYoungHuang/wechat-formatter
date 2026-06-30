import nodemailer from "nodemailer";

type AuthEmailInput = {
  to: string;
  name?: string | null;
  link: string;
};

type EmailDeliveryResult = {
  configured: boolean;
  sent: boolean;
};

function smtpPort() {
  const parsed = Number(process.env.SMTP_PORT || 587);
  return Number.isFinite(parsed) ? parsed : 587;
}

function smtpSecure(port = smtpPort()) {
  if (process.env.SMTP_SECURE) {
    return process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1";
  }

  return port === 465;
}

function smtpFrom() {
  return process.env.SMTP_FROM || process.env.EMAIL_FROM || "排版猫 <admin@paibanmao.cn>";
}

export function emailDeliveryConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && smtpFrom());
}

function createTransporter() {
  const port = smtpPort();

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: smtpSecure(port),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

function shellHtml(title: string, body: string, actionText: string, actionUrl: string) {
  return `
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;background:#f5fbf7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#102033;">
    <div style="max-width:560px;margin:0 auto;padding:32px 18px;">
      <div style="font-size:20px;font-weight:800;color:#061626;margin-bottom:18px;">排版猫</div>
      <div style="border:1px solid #b8f0d2;border-radius:14px;background:#ffffff;padding:26px;">
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.35;color:#061626;">${title}</h1>
        <p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:#385066;">${body}</p>
        <a href="${actionUrl}" style="display:inline-block;border-radius:10px;background:#00a86b;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;">${actionText}</a>
        <p style="margin:22px 0 0;font-size:12px;line-height:1.7;color:#6b7c8f;">如果按钮打不开，请复制下面的链接到浏览器：</p>
        <p style="word-break:break-all;margin:6px 0 0;font-size:12px;line-height:1.7;color:#385066;">${actionUrl}</p>
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#7b8a9a;">这封邮件由排版猫自动发送，请勿直接回复。</p>
    </div>
  </body>
</html>`;
}

async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<EmailDeliveryResult> {
  if (!emailDeliveryConfigured()) {
    return { configured: false, sent: false };
  }

  await createTransporter().sendMail({
    from: smtpFrom(),
    to: input.to,
    replyTo: process.env.SMTP_REPLY_TO || undefined,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return { configured: true, sent: true };
}

export function sendVerificationEmail(input: AuthEmailInput) {
  const name = input.name?.trim() || "你好";
  const subject = "验证你的排版猫邮箱";
  const body = `${name}，欢迎使用排版猫。请点击下面的按钮完成邮箱验证，验证链接 24 小时内有效。`;

  return sendEmail({
    to: input.to,
    subject,
    text: `${body}\n\n${input.link}`,
    html: shellHtml(subject, body, "验证邮箱", input.link),
  });
}

export function sendPasswordResetEmail(input: AuthEmailInput) {
  const name = input.name?.trim() || "你好";
  const subject = "重置你的排版猫密码";
  const body = `${name}，我们收到了你的密码重置请求。请点击下面的按钮设置新密码，链接 1 小时内有效。如果不是你本人操作，可以忽略这封邮件。`;

  return sendEmail({
    to: input.to,
    subject,
    text: `${body}\n\n${input.link}`,
    html: shellHtml(subject, body, "重置密码", input.link),
  });
}
