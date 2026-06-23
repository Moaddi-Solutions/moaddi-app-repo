import { Button } from "@/../components/ui/button";
import { Card } from "@/../components/ui/card";
import { MoveRight } from "lucide-react";
import Link from "next/link";

export default function CategoryCard({ name, description, image, id }) {
  return (
    <Link href={`/shop/${id}`}>
      <Card className="relative rounded-xl border p-0 hover:[&>img]:scale-102">
        <img
          src={image?.src || "/images/placeholder.webp"}
          alt={name}
          width="400"
          height="200"
          className="absolute h-full w-full rounded-xl object-cover transition-transform duration-400"
        />
        <div className="z-1 grid h-full gap-1 p-3 text-white">
          <h6 className="font-semibold">{name}</h6>
          <small className="font-semibold">{description}</small>
          <Button
            variant={"outline"}
            className="mt-3 h-6 w-fit rounded-full bg-white/30"
          >
            <MoveRight className="rtl:-scale-x-[1]" />
          </Button>
        </div>
      </Card>
    </Link>
  );
}
