import { Card } from "@/../components/ui/card";
import Link from "next/link";

export default function VendorCard({ _id, name }) {
  return (
    <Link href={`/vendor/${_id}`}>
      <Card className="rounded-xl border">
        <div className="grid h-full gap-1 px-4">
          <p className="font-semibold ">{name}</p>
        </div>
      </Card>
    </Link>
  );
}
