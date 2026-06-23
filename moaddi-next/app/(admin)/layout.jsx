import { client } from "@/../services/contentClient";

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
      <body>{children}</body>
    </html>
  );
}
