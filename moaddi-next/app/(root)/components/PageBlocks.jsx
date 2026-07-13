import Hero from "@/(root)/components/blocks/Hero";
// import Gallery from "@/(root)/components/blocks/Gallery";
// import Service from "@/(root)/components/blocks/Service";
import React from "react";

const PageBlocks = ({ blocks, ...rest }) => {
  const list = Array.isArray(blocks) ? blocks : [];

  // When a locale has no CMS blocks (e.g. the Italian dashboard is empty), the
  // Hero would otherwise never mount and its localized HERO_FALLBACK would be
  // lost. Render a propless Hero so every field falls back to the locale default.
  const hasHero = list.some(
    ({ __typename }) => __typename === "ComponentComponentsHero",
  );

  return (
    <>
      {!hasHero && <Hero />}
      {list.map(({ __typename, ...data }, i) => {
        switch (__typename) {
          case "ComponentComponentsHero":
            return <Hero key={i} {...data} />;
          // Gallery ("Free and fast delivery" band) intentionally hidden on home.
          // case "ComponentComponentsGallery":
          //   return <Gallery key={i} {...data} />;
          // case "ComponentComponentsService":
          //   return <Service key={i} {...data} />;
          case "ComponentComponentsDynamicBlock":
            if (!rest[data.name]) return null;
            return <React.Fragment key={i}>{rest[data.name]}</React.Fragment>;
          default:
            return null;
        }
      })}
    </>
  );
};

export default PageBlocks;
