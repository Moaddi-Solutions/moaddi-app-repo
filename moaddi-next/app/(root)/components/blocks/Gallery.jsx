import StrapiImage from "@/(root)/components/StrapiImage";
const Gallery = ({ items }) => {
  return (
    <div className="bg-primary-200 grid grid-cols-1 gap-1 overflow-hidden lg:grid-cols-3">
      {items.map((item, index) => (
        <Item key={index} {...item} />
      ))}
    </div>
  );
};

const Item = async ({ description, title, background }) => {
  const { src: backgroundUrl } = background;
  return (
    <div className="overflow-hidden">
      <div className="relative flex h-100 w-full cursor-pointer items-center justify-center overflow-hidden bg-cover bg-top px-12 text-center text-white hover:[&_img]:scale-102">
        <StrapiImage
          src={backgroundUrl}
          className="absolute h-full w-full object-cover object-center transition-transform duration-500"
        />
        <div className="bg-primary-950 absolute inset-0 opacity-75" />
        <div className="relative flex flex-col items-center justify-center">
          <h5 className="font-bold">{title}</h5>
          <p className="mt-2">{description}</p>
        </div>
      </div>
    </div>
  );
};

export default Gallery;
