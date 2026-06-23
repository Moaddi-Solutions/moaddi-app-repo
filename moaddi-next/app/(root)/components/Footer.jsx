import { SocialMediaIcons } from "@/(root)/components/SocialMediaIcons";
import { Container } from "@/../components/ui/container";
import { grouped } from "@/../lib/utils";
import { css, cx } from "@kuma-ui/core";
import Link from "next/link";
import Typography from "./Typography";

const Footer = ({ body, title, links, bottomLinks, socialMedia }) => {
  const groupedLinks = grouped(links, "category");
  const bodyText = (body ?? "").split("|");
  return (
    <footer className="bg-primary-800 text-primary-100 [&_a]:transition-all">
      <Container className="relative flex flex-col items-center justify-center pt-8">
        {/* <div className="bg-primary absolute -top-8 flex w-full items-center justify-between rounded-md px-6 py-4 font-bold text-white md:w-5/6 lg:w-4xl">
          Ready to get Started ?
          <Button variant="outlined" color="white">
            Contact us
          </Button>
        </div> */}
        <div className="flex items-center gap-4 max-md:flex-col md:gap-8 lg:mx-16">
          <div className="flex-1">
            <h4>Moaddi solution</h4>
            <p className="mt-4 font-bold">{bodyText[0]}</p>
            <p>{bodyText[1]}</p>
            {/* <Blocks
              className={"pt-6 [&_p]:text-xs md:[&_p]:text-sm"}
              content={body}
            /> */}
            <SocialMediaIcons
              items={socialMedia}
              variant="outlined"
              className="z-10 mt-6"
            />
          </div>
          <div className="mt-6 flex w-full flex-1 justify-around gap-4 max-md:justify-between md:mb-15">
            {groupedLinks.map(([category, links]) => (
              <div
                key={category}
                className="[&_a]:text-secondary-200 [&_a]:hover:text-secondary-300 flex flex-col gap-2"
              >
                <Typography className="mb-2 font-semibold" variant="body2">
                  {category}
                </Typography>
                {links.map(({ title, url, article }, i) => {
                  const { slug } = article ?? {};
                  return (
                    <Link key={i} href={slug || url}>
                      <small>{title}</small>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Container>
      <div
        className={cx(
          "relative mt-6 flex w-full justify-center overflow-hidden",
          css`
            height: 3rem;
          `,
        )}
      >
        <div
          className={cx(
            "bg-primary-500 absolute",
            css`
              width: 102%;
              height: 110%;
              border-top-left-radius: 50%;
              border-top-right-radius: 50%;
            `,
          )}
        />
      </div>
      <div className={cx("bg-primary-500")}>
        <Container
          variant={"breakpoint"}
          className="flex justify-between pb-12 max-md:flex-col max-md:gap-4 max-md:text-center"
        >
          <small className="py-1">{title}</small>
          <div className="[&_a]:text-secondary-50 [&_a]:hover:text-secondary-200 flex flex-wrap gap-4 max-md:justify-center">
            {bottomLinks.map(({ title, url }) => (
              <Link key={title} href={url}>
                <small>{title}</small>
              </Link>
            ))}
          </div>
        </Container>
        {/* <a
          href="https://fortis-team.vercel.app/"
          className="!text-secondary-50 hover:!text-secondary-200 block py-3 text-center"
        >
          Website by Fortis
        </a> */}
      </div>
    </footer>
  );
};

export default Footer;
