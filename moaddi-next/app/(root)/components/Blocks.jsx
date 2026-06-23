"use client";
import StrapiImage from "@/(root)/components/StrapiImage";
import { BlocksRenderer } from "@strapi/blocks-react-renderer";
import Link from "next/link";
import React from "react";

const Blocks = ({ content, ...rest }) => {
  const WrapComponent = Object.keys(rest).length ? "div" : React.Fragment;
  return (
    <WrapComponent {...rest}>
      <BlocksRenderer
        content={content}
        blocks={{
          paragraph: ({ children }) => <p>{children}</p>,
          heading: ({ children, level }) => {
            switch (level) {
              case 1:
                return <h1>{children}</h1>;
              case 2:
                return <h2>{children}</h2>;
              case 3:
                return <h3>{children}</h3>;
              case 4:
                return <h4>{children}</h4>;
              case 5:
                return <h5>{children}</h5>;
              case 6:
                return <h6>{children}</h6>;
              default:
                return <h1>{children}</h1>;
            }
          },
          link: ({ children, url }) => <Link href={url}>{children}</Link>,
          image: ({ image }) => <StrapiImage src={image} />,
          quote: ({ children }) => (
            <p className="border-s-4 ps-2">{children}</p>
          ),
        }}
        modifiers={{
          bold: ({ children }) => <strong>{children}</strong>,
          italic: ({ children }) => <p className="italic">{children}</p>,
        }}
      />
    </WrapComponent>
  );
};

export default Blocks;
