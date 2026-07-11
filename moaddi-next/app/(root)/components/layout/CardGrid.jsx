"use client";
import CategoryCard from "@/(root)/components/CategoryCard";
import ProductCard from "@/(root)/components/ProductCard";
import { useGetList } from "@/(root)/hook/ra/useGetList";
import { Card } from "@/../components/ui/card";
import { Container } from "@/../components/ui/container";
import { Skeleton } from "@/../components/ui/skeleton";
import { useEffect, useState } from "react";
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

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

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
  const visibleCount = rows
    ? rows[current] * limit[current]
    : (queryOptions?.limit ?? 10);

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

      {isPending &&
        Array.from({ length: visibleCount }).map((_, i) => (
          <CardGridSkeleton key={i} component={component} />
        ))}
      {!isPending &&
        !error &&
        data
          .filter(({ isActive }) => isActive)
          .slice(0, visibleCount)
          .map((item, i) => (
            // <motion.div variants={motionPropsFromBottom} key={i}>
            <Card key={i} {...item} {...cardRest} />
            // </motion.div>
          ))}
    </Container>
  );
};

const CardGridSkeleton = ({ component }) => {
  if (component === "shops") {
    return (
      <Card className="min-h-[86px] flex-row items-center gap-3.5 rounded-xl p-3.5">
        <Skeleton className="size-14 shrink-0 rounded-2xl bg-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3 bg-muted" />
          <Skeleton className="h-3 w-full bg-muted" />
          <Skeleton className="h-3 w-4/5 bg-muted" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-0 rounded-xl p-3">
      <Skeleton className="h-29.5 w-full rounded-xl bg-muted" />
      <Skeleton className="mt-2.5 h-4 w-3/4 bg-muted" />
      <div className="mt-2 flex items-center justify-between">
        <Skeleton className="h-4 w-20 bg-muted" />
        <Skeleton className="size-8 rounded-[10px] bg-muted" />
      </div>
    </Card>
  );
};

export default CardGrid;
