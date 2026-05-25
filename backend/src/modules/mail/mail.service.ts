import mailConfig from '@config/mail.config';
import { Injectable, Logger } from '@nestjs/common';
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
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

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
    this.transporter = nodemailer.createTransport({
      host: m.host,
      port: m.port,
      secure: m.secure,
      auth: { user: m.user, pass: m.pass },
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
      await transport.sendMail({
        from: m?.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });
      return true;
    } catch (e) {
      this.logger.error(`Gửi mail thất bại → ${opts.to}`, e);
      return false;
    }
  }
}
