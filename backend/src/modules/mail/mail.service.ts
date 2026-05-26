import mailConfig from '@config/mail.config';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  MailTemplateId,
  MailTemplateVars,
  renderMailTemplate,
} from './mail.templates';

export type SendMailInput = {
  to: string;
  template: MailTemplateId;
  vars?: MailTemplateVars;
};

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private lastVerifyError: string | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.verifyConnection();
  }

  /** Kiểm tra SMTP lúc start — lỗi hiện trên log Render. */
  async verifyConnection(): Promise<boolean> {
    this.lastVerifyError = null;
    if (!this.isConfigured()) {
      this.lastVerifyError = 'Thiếu SMTP_HOST, SMTP_USER hoặc SMTP_PASS';
      this.logger.warn(`[mail] ${this.lastVerifyError}`);
      return false;
    }
    try {
      const transport = this.getTransport();
      if (!transport) return false;
      await transport.verify();
      this.logger.log(
        `[mail] SMTP OK (${this.config.get<ReturnType<typeof mailConfig>>('mail')?.host})`,
      );
      return true;
    } catch (e) {
      this.lastVerifyError =
        e instanceof Error ? e.message : String(e ?? 'unknown');
      this.logger.error(`[mail] SMTP verify thất bại: ${this.lastVerifyError}`);
      return false;
    }
  }

  getLastVerifyError(): string | null {
    return this.lastVerifyError;
  }

  isConfigured(): boolean {
    const m = this.config.get<ReturnType<typeof mailConfig>>('mail');
    return Boolean(m?.host && m?.user && m?.pass);
  }

  appUrl(): string {
    return (
      this.config.get<ReturnType<typeof mailConfig>>('mail')?.appUrl ??
      'http://localhost:3000'
    );
  }

  private getTransport(): Transporter | null {
    if (this.transporter) return this.transporter;
    const m = this.config.get<ReturnType<typeof mailConfig>>('mail');
    if (!m?.host || !m.user || !m.pass) return null;
    const port = m.port || 587;
    this.transporter = nodemailer.createTransport({
      host: m.host,
      port,
      secure: m.secure || port === 465,
      auth: { user: m.user, pass: m.pass },
      requireTLS: port === 587,
      tls: { minVersion: 'TLSv1.2' },
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
    });
    return this.transporter;
  }

  async send(input: SendMailInput): Promise<boolean> {
    const { subject, html, text } = renderMailTemplate(input.template, {
      ...input.vars,
      appUrl: this.appUrl(),
    });
    return this.sendRaw({
      to: input.to,
      subject,
      html,
      text,
    });
  }

  async sendRaw(opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<boolean> {
    const m = this.config.get<ReturnType<typeof mailConfig>>('mail');
    const transport = this.getTransport();
    if (!transport) {
      this.logger.warn(
        `[mail:dev] SMTP chưa cấu hình → ${opts.to}: ${opts.subject}\n${opts.text}`,
      );
      return false;
    }
    try {
      const info = await transport.sendMail({
        from: m?.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });
      this.logger.log(
        `[mail] Đã gửi → ${opts.to} (${opts.subject}) id=${info.messageId ?? '—'}`,
      );
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(
        `Gửi mail thất bại → ${opts.to}: ${msg}`,
        e instanceof Error ? e.stack : undefined,
      );
      return false;
    }
  }
}
