"use client";
import CategoryCard from "@/(root)/components/CategoryCard";
import ProductCard from "@/(root)/components/ProductCard";
import { useGetList } from "@/(root)/hook/ra/useGetList";
import { Container } from "@/../components/ui/container";
import { useMediaQuery } from "@mui/material";
const containerVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 1,
      staggerChildren: 0.1,
    },
  },
};

const motionPropsFromBottom = {
  initial: { y: 5 },
  animate: { y: 0 },
};

const cards = {
  shops: CategoryCard,
  products: ProductCard,
};

const limit = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 5,
};

const CardGrid = ({
  items,
  card: { component, ...cardRest },
  rows,
  queryOptions,
  ...rest
}) => {
  const sm = useMediaQuery("(min-width: 448px)");
  const md = useMediaQuery("(min-width: 680px)");
  const lg = useMediaQuery("(min-width: 897px)");
  const xl = useMediaQuery("(min-width: 1128px)");
  const current = xl ? "xl" : lg ? "lg" : md ? "md" : sm ? "sm" : "xs";
  const Card = cards[component];

  const { isPending, error, data } = useGetList(`${component}Active`, {
    pagination: { page: 1, perPage: 10 },
    ...queryOptions,
  });
  // console.log(component, queryOptions);

  return (
    <Container
      // as={motion.div}
      // variants={containerVariants}
      // initial="initial"
      // whileInView="animate"
      className="my-3 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4"
      {...rest}
    >
      {/* {items
        .slice(0, rows ? rows[current] * limit[current] : Infinity)
        .map((item, i) => (
          <motion.div variants={motionPropsFromBottom} key={i}>
            <Card {...item} {...cardRest} />
          </motion.div>
        ))} */}

      {!isPending &&
        !error &&
        data
          .filter(({ isActive }) => isActive)
          .slice(0, rows ? rows[current] * limit[current] : Infinity)
          .map((item, i) => (
            // <motion.div variants={motionPropsFromBottom} key={i}>
            <Card key={i} {...item} {...cardRest} />
            // </motion.div>
          ))}
    </Container>
  );
};

export default CardGrid;
