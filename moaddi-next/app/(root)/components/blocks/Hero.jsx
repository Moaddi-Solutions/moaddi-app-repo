import StrapiImage from "@/(root)/components/StrapiImage";
import { Button } from "@/../components/ui/button";
import { Container } from "@/../components/ui/container";
import rtlRules from "@/../i18n/rtl";
import { cx } from "@kuma-ui/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as motion from "motion/react-client";
import { useLocale } from "next-intl";
import Link from "next/link";

const motionPropsFromBottom = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
};

const motionPropsFromTop = {
  initial: { y: -40 },
  whileInView: { y: 0 },
};

const Hero = ({
  features,
  heading,
  description,
  button: {
    title,
    page: { url: buttonUrl },
  },
  foreground,
  background,
}) => {
  heading = (heading ?? "").split("|");
  const locale = useLocale();
  const dir = rtlRules[locale];

  return (
    <section className="relative">
      <Container
        as={motion.div}
        {...motionPropsFromTop}
        className=" flex flex-col items-start justify-between gap-8 py-10"
      >
        <div className="w-7/10">
          <h2 className="text-stroke-1 text-primary-50 font-bold">
            {heading[0]}
          </h2>
          <h5
            className={"text-stroke-1 text-primary-200 mt-5 w-70/100 font-bold"}
          >
            {heading[1]}
          </h5>
        </div>
        <p className="max-w-lg text-lg text-white">{description}</p>
        <Link href={buttonUrl}>
          <Button
            size={null}
            className={`rounded-none ps-3 ltr:hover:[&_svg]:translate-x-1 rtl:hover:[&_svg]:-translate-x-1`}
          >
            <p className="w-30">{title}</p>
            {dir ? (
              <ChevronLeft
                className="bg-primary-600 size-9 px-2 transition-transform"
                size={16}
              />
            ) : (
              <ChevronRight
                className="bg-primary-600 size-9 px-2 transition-transform"
                size={16}
              />
            )}
          </Button>
        </Link>
      </Container>
      {/* {dir ? (
        <img
          className="absolute start-0 top-0 -z-30 h-full w-full object-cover object-right"
          // src={background}
          src={`/images/banner1.rtl.webp`}
        />
      ) : (
        <img
          className="absolute start-0 top-0 -z-30 h-full w-full object-cover object-right"
          // src={background}
          src={`/images/banner1.webp`}
        />
      )} */}
      <StrapiImage
        className="absolute start-0 top-0 -z-30 h-full w-full object-cover object-right"
        src={background.src}
      />
      <div
        className={cx(
          `from-primary-800 absolute start-0 top-0 bottom-0 -z-1 w-8/10 to-transparent ${dir ? "bg-linear-to-l" : "bg-linear-to-r"}`,
        )}
      />
      <Container
        variant={"breakpoint"}
        className="flex w-full justify-between gap-12 bg-white p-6 shadow-xl max-lg:max-w-7xl max-md:flex-col"
        as={motion.div}
        {...motionPropsFromBottom}
      >
        {features.map((feature, i) => (
          <Feature key={i} {...feature} />
        ))}
      </Container>
    </section>
  );
};

const Feature = ({ title, description, icon }) => {
  return (
    <div className="flex flex-1 gap-4 md:justify-center">
      <StrapiImage
        className="bg-primary h-16 w-16 rounded-full"
        src={icon.src}
        width={64}
        height={64}
        alt={title}
      />
      <div className="flex flex-col items-start justify-center">
        <h2 className="text-primary text-lg font-bold">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
};

export default Hero;
