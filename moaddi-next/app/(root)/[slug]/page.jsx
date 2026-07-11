import { Container } from "@/../components/ui/container";
import { client } from "@/../services/contentClient";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

const page = async ({ params }) => {
  const { slug } = await params;
  const locale = await getLocale();
  const { body } = await client(`${locale}Pages`, slug);

  if (!body) notFound();

  return (
    <Container as="section" className="py-10">
      <div
        className="[&_a]:text-primary-text [&_blockquote]:border-secondary [&_a]:underline [&_a]:hover:underline [&_blockquote]:my-2 [&_blockquote]:border-s-3 [&_blockquote]:ps-1 [&_li]:mb-2 [&_ol]:list-decimal [&_ol]:ps-5 [&_ul]:list-disc [&_ul]:ps-5"
        dangerouslySetInnerHTML={{
          __html: body
            .replaceAll(/left/g, "start")
            .replaceAll(/right/g, "end")
            .replaceAll(/\<p\>\<\/p\>/g, "<br>"),
        }}
      />
    </Container>
  );
};

export default page;
