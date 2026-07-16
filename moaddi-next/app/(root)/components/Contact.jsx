"use client";

import { Button } from "@/../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/../components/ui/card";
import { Container } from "@/../components/ui/container";
import { Input } from "@/../components/ui/input";
import { Label } from "@/../components/ui/label";
import { Textarea } from "@/../components/ui/textarea";
import { Mail, MessageSquareText, Send, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

const CONTACT_EMAIL = "info@moaddi.net";

export default function Contact() {
  const t = useTranslations("ContactUs");
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const subject = form.subject.trim() || t("defaultSubject");
    const body = [
      form.name.trim() && `${t("emailBodyName")}: ${form.name.trim()}`,
      form.email.trim() && `${t("emailBodyEmail")}: ${form.email.trim()}`,
      "",
      form.message.trim(),
    ]
      .filter((line) => line !== false)
      .join("\n");

    window.location.href = `mailto:${CONTACT_EMAIL}?${new URLSearchParams({
      subject,
      body,
    }).toString()}`;
  };

  return (
    <main className="bg-background">
      <Container as="section" className="py-10 md:py-14">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1fr)] lg:items-start">
          <div className="flex flex-col gap-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
              <MessageSquareText className="size-3.5" aria-hidden="true" />
              {t("eyebrow")}
            </div>
            <div className="flex flex-col gap-3">
              <h1 className="max-w-[12ch] text-4xl leading-[1.02] font-extrabold tracking-tight text-foreground md:text-6xl">
                {t("title")}
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
                {t("description")}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <ContactInfo
                icon={Mail}
                label={t("emailLabel")}
                value={CONTACT_EMAIL}
                href={`mailto:${CONTACT_EMAIL}`}
              />
              <ContactInfo
                icon={ShieldCheck}
                label={t("responseLabel")}
                value={t("responseValue")}
              />
            </div>
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-extrabold">
                {t("formTitle")}
              </CardTitle>
              <CardDescription>{t("formDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label={t("nameLabel")} htmlFor="contact-name">
                    <Input
                      id="contact-name"
                      name="name"
                      autoComplete="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder={t("namePlaceholder")}
                    />
                  </FormField>
                  <FormField label={t("emailInputLabel")} htmlFor="contact-email">
                    <Input
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder={t("emailPlaceholder")}
                    />
                  </FormField>
                </div>
                <FormField label={t("subjectLabel")} htmlFor="contact-subject">
                  <Input
                    id="contact-subject"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder={t("subjectPlaceholder")}
                  />
                </FormField>
                <FormField label={t("messageLabel")} htmlFor="contact-message">
                  <Textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={7}
                    maxLength={1400}
                    value={form.message}
                    onChange={handleChange}
                    placeholder={t("messagePlaceholder")}
                  />
                </FormField>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button type="submit" className="sm:w-fit">
                    <Send data-icon="inline-start" aria-hidden="true" />
                    {t("sendButton")}
                  </Button>
                  <Button variant="outline" asChild className="sm:w-fit">
                    <Link href={`mailto:${CONTACT_EMAIL}`}>
                      <Mail data-icon="inline-start" aria-hidden="true" />
                      {t("emailButton")}
                    </Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </Container>
    </main>
  );
}

function FormField({ label, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function ContactInfo({ icon: Icon, label, value, href }) {
  const content = (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4 text-card-foreground">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold text-muted-foreground">
          {label}
        </span>
        <span className="block truncate text-sm font-extrabold">{value}</span>
      </span>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block transition-opacity hover:opacity-85">
      {content}
    </Link>
  );
}
