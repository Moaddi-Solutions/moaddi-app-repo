import { CartProvider } from "@/(root)/context/cart-provider";
import { ChatProvider } from "@/(root)/context/chat-context";
import { client } from "@/../services/contentClient";
import enMessages from "@/../messages/en.json";
import { NextIntlClientProvider } from "next-intl";
import Script from "next/script";
import { Toaster } from "sonner";
import "../globals.css";
import "../chat-globals.css";

// The admin dashboard has no locale switcher — chat UI strings are pulled
// straight from the English bundle, scoped to the two namespaces the shared
// chat components (built for the customer-facing storefront) rely on.
const chatMessages = {
  Chat: enMessages.Chat,
  ContactChat: enMessages.ContactChat,
};

export async function generateMetadata() {
  const title = "Moaddi | Admin Dashboard";
  const description =
    "Moaddi Admin Dashboard for managing the application content";
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
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL),
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark");}catch(e){}`}
        </Script>
        <NextIntlClientProvider locale="en" messages={chatMessages}>
          <CartProvider>
            <ChatProvider>{children}</ChatProvider>
          </CartProvider>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
