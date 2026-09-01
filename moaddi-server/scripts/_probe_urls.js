(async () => {
  for (const url of [
    "http://127.0.0.1:8086/test",
    "http://127.0.0.1:8086/api/v1/machines",
    "http://127.0.0.1:8086/api/v1/machines/active",
    "http://127.0.0.1:8086/api/v1/products",
  ]) {
    try {
      const r = await fetch(url);
      const t = await r.text();
      console.log(url, "=>", r.status, t.slice(0, 160).replace(/\s+/g, " "));
    } catch (e) {
      console.log(url, "=> ERR", e.message, String(e.cause || ""));
    }
  }
})();
