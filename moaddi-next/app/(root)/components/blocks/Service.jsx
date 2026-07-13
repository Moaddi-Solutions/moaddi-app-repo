import { Button } from "@/../components/ui/button";
import { Container } from "@/../components/ui/container";
import Link from "next/link";

const Service = ({
  heading = "",
  serviceDescription = "",
  button: {
    title,
    page: { url },
  },
  services,
}) => {
  heading = (heading ?? "").split("|");
  serviceDescription = (serviceDescription ?? "").split("|");
  return (
    <section className="bg-primary-200">
      <Container
        variant={"breakpoint"}
        className="grid grid-cols-1 !px-0 text-gray-800 lg:grid-cols-3 lg:gap-12"
      >
        <div className="col-span-2 py-12 max-sm:px-8">
          {/* <Blocks
            className="[&_a]:text-gray-500"
            content={serviceDescription}
          /> */}
          <h5>{serviceDescription[0]}</h5>
          <p className="mt-4">{serviceDescription[1]}</p>
          <Link href={url ?? ""}>
            <Button
              size={"xl"}
              variant={"bordered"}
              className="mt-4 hover:-translate-y-1 hover:shadow-xl"
            >
              {title}
            </Button>
          </Link>
        </div>
        <div className="flex h-fit flex-col gap-4 bg-white px-8 py-12 shadow-2xl">
          {/* <Blocks content={header} /> */}
          <h5>{heading[0]}</h5>
          <h6>{heading[1]}</h6>
          <ul className="text-primary-text ms-5 mt-2 list-disc">
            {services.map(({ title, page: { url } }, i) => (
              <li key={i}>
                <Link href={url ?? ""}>{title}</Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
};

export default Service;
