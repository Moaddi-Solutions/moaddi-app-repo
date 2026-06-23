const myFatoraClient = (path, { method = "POST", data } = {}) =>
  fetch(process.env.EXPO_PUBLIC_MYFATORA_API_ENDPOINT + "/v2/" + path, {
    method,
    ...(data && {
      body: JSON.stringify(data),
    }),
    headers: {
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_MYFATORA_API_TOKEN}`,
      ...(data && {
        "Content-Type": "application/json",
      }),
    },
  }).then((r) => r.json());

export { myFatoraClient };
