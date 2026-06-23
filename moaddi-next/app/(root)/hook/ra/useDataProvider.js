// import { useQueryClient } from "@tanstack/react-query";
// import { useContext } from "react";
// import { DataProviderContext } from "react-admin";

// /**
//  * Hook for getting a dataProvider
//  *
//  * Gets a dataProvider object, which behaves just like the real dataProvider
//  * (same methods returning a Promise). But it's actually a Proxy object,
//  * which validates the response format, and logs the user out upon error
//  * if authProvider.checkError() rejects.
//  *
//  * @return dataProvider
//  *
//  * @example Basic usage
//  *
//  * import * as React from 'react';
//  * import { useState } from 'react';
//  * import { useDataProvider } from 'react-admin';
//  *
//  * const PostList = () => {
//  *      const [posts, setPosts] = useState([])
//  *      const dataProvider = useDataProvider();
//  *      useEffect(() => {
//  *          dataProvider.getList('posts', { filter: { status: 'pending' }})
//  *            .then(({ data }) => setPosts(data));
//  *      }, [])
//  *
//  *      return (
//  *          <Fragment>
//  *              {posts.map((post, key) => <PostDetail post={post} key={key} />)}
//  *          </Fragment>
//  *     );
//  * }
//  *
//  * @example Handling all states (loading, error, success)
//  *
//  * import { useState, useEffect } from 'react';
//  * import { useDataProvider } from 'react-admin';
//  *
//  * const UserProfile = ({ userId }) => {
//  *     const dataProvider = useDataProvider();
//  *     const [user, setUser] = useState();
//  *     const [loading, setLoading] = useState(true);
//  *     const [error, setError] = useState();
//  *     useEffect(() => {
//  *         dataProvider.getOne('users', { id: userId })
//  *             .then(({ data }) => {
//  *                 setUser(data);
//  *                 setLoading(false);
//  *             })
//  *             .catch(error => {
//  *                 setError(error);
//  *                 setLoading(false);
//  *             })
//  *     }, []);
//  *
//  *     if (loading) return <Loading />;
//  *     if (error) return <Error />
//  *     if (!user) return null;
//  *
//  *     return (
//  *         <ul>
//  *             <li>Name: {user.name}</li>
//  *             <li>Email: {user.email}</li>
//  *         </ul>
//  *     )
//  * }
//  */

// const populateQueryCache = ({
//   data,
//   queryClient,
//   staleTime = 1000, // ms
// }) => {
//   // setQueryData doesn't accept a stale time option
//   // So we set an updatedAt in the future to make sure the data isn't considered stale
//   const updatedAt = Date.now() + staleTime;
//   Object.keys(data).forEach((resource) => {
//     data[resource].forEach((record) => {
//       if (!record || record.id == null) return;
//       queryClient.setQueryData(
//         [resource, "getOne", { id: String(record.id) }],
//         record,
//         { updatedAt },
//       );
//     });
//     const recordIds = data[resource].map((record) => String(record.id));
//     queryClient.setQueryData(
//       [resource, "getMany", { ids: recordIds }],
//       data[resource],
//       { updatedAt },
//     );
//   });
// };

// const arrayReturnTypes = ["getList", "getMany", "getManyReference"];

// export const useDataProvider = () => {
//   const dataProvider = useContext(DataProviderContext);
//   const queryClient = useQueryClient();

//   // const logoutIfAccessDenied = useLogoutIfAccessDenied();

//   const dataProviderProxy = new Proxy(dataProvider, {
//     get: (_, name) => {
//       if (typeof name === "symbol" || name === "then") {
//         return;
//       }
//       if (name === "supportAbortSignal") {
//         return dataProvider.supportAbortSignal;
//       }
//       return (...args) => {
//         const type = name.toString();

//         if (typeof dataProvider[type] !== "function") {
//           throw new Error(`Unknown dataProvider function: ${type}`);
//         }

//         try {
//           return dataProvider[type]
//             .apply(dataProvider, args)
//             .then((response) => {
//               // if (
//               //     process.env.NODE_ENV === 'development' &&
//               //     reactAdminFetchActions.includes(type)
//               // ) {
//               //     validateResponseFormat(response, type);
//               // }
//               if (response?.meta?.prefetched) {
//                 populateQueryCache({
//                   data: response?.meta.prefetched,
//                   queryClient,
//                 });
//               }
//               return response;
//             })
//             .catch((error) => {
//               if (
//                 process.env.NODE_ENV !== "production" &&
//                 // do not log AbortErrors
//                 !isAbortError(error)
//               ) {
//                 console.error(error);
//               }
//             //   return logoutIfAccessDenied(error).then((loggedOut) => {
//             //     if (loggedOut)
//             //       return {
//             //         data: arrayReturnTypes.includes(type) ? [] : {},
//             //       };
//             //     throw error;
//             //   });
//             });
//         } catch (e) {
//           if (process.env.NODE_ENV !== "production") {
//             console.error(e);
//           }
//           throw new Error(
//             "The dataProvider threw an error. It should return a rejected Promise instead.",
//           );
//         }
//       };
//     },
//   });
//   return dataProviderProxy;
// };

// const isAbortError = (error) =>
//   error instanceof DOMException && error.name === "AbortError";
