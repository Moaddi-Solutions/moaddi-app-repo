import { Card } from "@/../components/ui/card";
import Link from "next/link";

export default function CategoryCard({ name, description, image, id }) {
  return (
    <Link href={`/shop/${id}`}>
      <Card className="min-h-[86px] flex-row items-center gap-3.5 rounded-xl p-3.5 transition-transform hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
        <div className="shrink-0">
          <img
            src={image?.src || "/images/placeholder.webp"}
            alt={name}
            width="56"
            height="56"
            className="bg-muted size-14 rounded-2xl object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-extrabold">{name}</p>
          <small className="text-muted-foreground line-clamp-2 font-semibold">
            {description}
          </small>
        </div>
      </Card>
    </Link>
  );
}
