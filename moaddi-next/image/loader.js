// order is Important
const breakpoints = {
  xs: 64,
  sm: 300,
  md: 600,
  lg: 1200,
  xl: 1440,
};
export default function strapiLoader({ src, width }) {
  let { hash, ext, width: originalWidth } = JSON.parse(src);
  let url = `/uploads/${hash}${ext}`;
  if (ext != ".svg" && width < originalWidth) {
    const breakpoint = Object.entries(breakpoints).find(
      ([_, value]) => value >= width,
    );
    if (breakpoint) url = `/uploads/${breakpoint[0]}_${hash}${ext}`;
  }
  return `${process.env.NEXT_PUBLIC_STRAPI_URL}${url}`;
}
