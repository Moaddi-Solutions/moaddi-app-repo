import React from "react";

const StrapiImage = ({ src, ...rest }) => {
  return (
    <img
      src={
        `${process.env.NEXT_PUBLIC_STATIC}content/${src}` ||
        "/images/placeholder.webp"
      }
      {...rest}
    />
  );
};

export default StrapiImage;
