import { baseUrl } from "@/../services/serverAddresses";
import React from "react";

const StrapiImage = ({ src, ...rest }) => {
  const imageSrc = resolveContentImage(src);

  return (
    <img
      src={imageSrc}
      {...rest}
    />
  );
};

const resolveContentImage = (src) => {
  const value = typeof src === "string" ? src : src?.src ?? src?.url;
  if (!value) return "/images/placeholder.webp";
  if (/^https?:\/\//.test(value)) return value;
  if (value.startsWith("/content/")) return `${baseUrl().replace(/\/$/, "")}${value}`;
  return `${baseUrl()}content/${String(value).replace(/\\/g, "/").replace(/^\/+/, "")}`;
};

export default StrapiImage;
