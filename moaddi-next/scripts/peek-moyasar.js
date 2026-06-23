fetch("https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.7/dist/moyasar.umd.js")
  .then((r) => r.text())
  .then((t) => {
    const idx = t.indexOf("promise based callback");
    console.log(t.slice(idx - 800, idx + 200));
  });
