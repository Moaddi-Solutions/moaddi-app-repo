import Hero from "@/(root)/components/blocks/Hero";
// import Gallery from "@/(root)/components/blocks/Gallery";
// import Service from "@/(root)/components/blocks/Service";
import React from "react";

const PageBlocks = ({ blocks, ...rest }) => {
  return blocks.map(({ __typename, ...data }, i) => {
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
    }
  });
};

export default PageBlocks;
