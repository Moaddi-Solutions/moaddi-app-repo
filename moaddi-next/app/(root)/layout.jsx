import Footer from "@/(root)/components/Footer";
import Header from "@/(root)/components/Header";
import PurchaseStatusNotifier from "@/(root)/components/PurchaseStatusNotifier";
import { CartProvider } from "@/(root)/context/cart-provider";
import AdminContextProvider from "@/(root)/context/ra/AdminContextProvider";
import { SocketContextProvider } from "@/(root)/context/Socket";
import { ThemeContextProvider } from "@/(root)/context/Theme";
import rtlRules from "@/../i18n/rtl";
import { client } from "@/../services/contentClient";
import { KumaRegistry } from "@kuma-ui/next-plugin/registry";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Cairo } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["latin", "arabic"],
  weight: ["300", "400", "600", "700", "800"],
});

// const website = {
//   en: websiteEn,
//   ar: websiteAr,
// };

export async function generateMetadata() {
  const locale = await getLocale();
  const { name: title, description } = await client(`${locale}Site`);
  const {
    shareImage: { src: shareImageUrl },
    metaTitle,
    metaDescription,
  } = await client(`${locale}Seo`);
  const {
    favicon: { src: faviconUrl },
  } = await client("site");

  return {
    title,
    description,
    icons: {
      icon: `${process.env.NEXT_PUBLIC_STATIC}/content/${faviconUrl}`,
      shortcut: `${process.env.NEXT_PUBLIC_STATIC}/content/${faviconUrl}`,
      apple: `${process.env.NEXT_PUBLIC_STATIC}/content/${faviconUrl}`,
    },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: process.env.NEXT_PUBLIC_SITE_URL,
      siteName: title,
      images: [
        {
          url: `${process.env.NEXT_PUBLIC_STATIC}/content/${shareImageUrl}`,
          width: 1200,
          height: 630,
          alt: metaTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      images: [`${process.env.NEXT_PUBLIC_STATIC}/content/${shareImageUrl}`],
    },
    alternates: {
      canonical: process.env.NEXT_PUBLIC_SITE_URL,
      languages: {
        "en-US": "/en",
        "ar-SA": "/ar",
      },
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL),
  };
}

export default async function RootLayout({ children }) {
  const messages = await getMessages();
  const locale = await getLocale();
  const headerLinks = await client(`${locale}HeaderLinks`);
  const { body, title, links, bottomLinks } = await client(
    `${locale}FooterBody`,
  );
  const {
    logo: { src: logoUrl },
    socialMedia,
  } = await client("site");
  const header = {
    items: headerLinks,
    logo: logoUrl,
    socialMedia,
  };
  const footer = {
    body,
    title,
    links,
    bottomLinks,
    socialMedia,
  };

  return (
    <html lang={locale} dir={rtlRules[locale] ? "rtl" : "ltr"}>
      <body className={`${cairo.variable} bg-background font-sans antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark");}catch(e){}`}
        </Script>
        <NextIntlClientProvider messages={messages}>
          <ThemeContextProvider>
            <KumaRegistry>
                <CartProvider>
                  <AdminContextProvider>
                    <SocketContextProvider>
                      <div
                        data-vaul-drawer-wrapper
                        className="flex min-h-screen flex-col"
                      >
                        <Header {...header} />
                        <div className="flex-1">{children}</div>
                        <Footer {...footer} />
                      </div>
                      <PurchaseStatusNotifier />
                    </SocketContextProvider>
                  </AdminContextProvider>
                </CartProvider>
            </KumaRegistry>
          </ThemeContextProvider>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
