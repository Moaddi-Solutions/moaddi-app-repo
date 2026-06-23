import Blocks from "@/(root)/components/Blocks";
import StrapiImage from "@/(root)/components/StrapiImage";
import { Container } from "@/../components/ui/container";
import Link from "next/link";

const Article = ({
  title,
  description,
  body,
  cover,
  category: { articles },
}) => {
  return (
    <>
      <div className="from-primary-800 to-primary-400/20 relative bg-linear-to-t">
        <StrapiImage
          className="absolute -z-1 h-full w-full object-cover"
          src={cover}
          fill
        />
        <div className="flex flex-col gap-5 py-32 text-center text-white">
          <h3 className="font-bold text-shadow-lg/20">{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <Container className="my-6 flex py-6 text-gray-800 shadow-2xl max-md:flex-col">
        <div className="space-y-4">
          <Blocks content={body} />
        </div>
        <div className="max-md:mt-4 max-md:border-t-2 max-md:pt-4 md:ms-8 md:border-s-2 md:ps-8">
          <h6 className="mb-2 whitespace-nowrap">Related articles</h6>
          <div className="flex flex-col gap-1">
            {articles.map(({ title, slug }) => (
              <Link
                className="hover:text-primary-700 font-light "
                href={slug}
                key={slug}
              >
                {title}
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
};

export default Article;
