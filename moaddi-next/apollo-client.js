import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

const createApolloClient = () => {
  return new ApolloClient({
    cache: new InMemoryCache(),

    link: new HttpLink({
      uri: `${process.env.NEXT_PUBLIC_STRAPI_URL}/graphql`,
      headers: {
        Authorization: `Bearer ${process.env.NEXT_READ_ONLY_STRAPI_TOKEN}`,
      },
      ...(process.env.NODE_ENV === "development" && {
        fetchOptions: {
          next: {
            revalidate: 0,
          },
        },
      }),
    }),
  });
};

export default createApolloClient;
