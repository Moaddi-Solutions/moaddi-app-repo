import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import { useRecordContext } from "ra-core";

const DocsBody = () => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <article className="prose prose-sm max-w-none font-sans dark:prose-invert">
      <h1 className="text-xl font-extrabold text-foreground">{record.id}</h1>
      <div
        className="rounded-xl border border-border bg-background p-4 text-sm leading-7 text-foreground"
        dangerouslySetInnerHTML={{ __html: record.body ?? "" }}
      />
    </article>
  );
};

const DocsShow = () => (
  <AdminShow title="Docs">
    <DocsBody />
  </AdminShow>
);

export default DocsShow;
