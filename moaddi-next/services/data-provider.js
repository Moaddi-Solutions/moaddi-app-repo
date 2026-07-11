import { resolveApiBaseUrl } from "@/../lib/api-base";
import { normalizeDashboardRole } from "@/../lib/dashboard-role";
import { getLocalStorageItem } from "@/../lib/utils";
import { client } from "@/../services/contentClient";
import * as events from "@/../services/events";
import revalidateContent from "@/../services/revalidateContent";
import {
  activeMachinesAPI,
  addUserAPI,
  allPendingRequests,
  contentAPI,
  contentUploadAPI,
  getCustomerAPI,
  getVendorsAPI,
  groupAPI,
  groupsAPI,
  machineAPI,
  machinesAPI,
  MachinesByGroup,
  MachinesByProduct,
  MachinesByShop,
  MachinesByVendor,
  paymentProvidersAPI,
  paymentProviderToggleAPI,
  platformOptionsAPI,
  productAPI,
  productsAPI,
  transactionAPI,
  transactionsAPI,
  walletAPI,
  walletsAPI,
  walletsMeAPI,
  withdrawalAPI,
  withdrawalsAPI,
  currenciesAPI,
  ProductsByMachine,
  ProductsByVendor,
  purchaseAPI,
  purchasesAPI,
  purchaseByCustomer,
  purchaseByInvoice,
  shopAPI,
  shopsAPI,
  userAPI,
  VendorsByShop,
} from "@/../services/serverAddresses";

let getRequest;
let putRequest;
let deleteRequest;
let postRequest;

const sortFn =
  ({ field, order }) =>
  (a, b) =>
    (order == "ASC" ? 1 : -1) *
    (Number.isFinite(a[field])
      ? a[field] - (b[field] ?? 0)
      : String(a[field] ?? "").localeCompare(String(b[field] ?? "")));

const staticBaseUrl = () => resolveApiBaseUrl().replace(/\/+$/, "");

const normalizeAssetPath = (path) =>
  String(path ?? "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

const contentAssetUrl = (path) =>
  `${staticBaseUrl()}/content/${normalizeAssetPath(path)}`;

export const Fit = {
  data: (data) => ({
    data,
  }),
  _id: ({ _id, ...rest } = {}) => ({
    _id,
    id: _id,
    ...rest,
  }),
  image: ({ image, ...rest } = {}) => {
    let src;
    if (image) {
      src = `${staticBaseUrl()}/${normalizeAssetPath(image)}`;
    }
    return {
      ...(image && { image: { src } }),
      ...rest,
    };
  },
};
const Api = {
  machinesActive: {
    getList: (offset, limit) =>
      getRequest(
        `${activeMachinesAPI()}?${new URLSearchParams({
          offset,
          limit,
        })}`,
      ),
  },
  machines: {
    create: (data) => postRequest(machinesAPI(), data),
    getList: (offset, limit) =>
      getRequest(
        `${machinesAPI()}?${new URLSearchParams({
          offset,
          limit,
        })}`,
      ),
    getOne: (id) =>
      getRequest(
        `${machineAPI(id)}?${new URLSearchParams({ getBoxes: "false" })}`,
      ),
    getManyReference: {
      vendorId: (vendorId) =>
        getRequest(MachinesByVendor(vendorId)).then(({ data, total }) => ({
          data: data.map(Fit._id),
          total,
        })),
      productId: (productId) =>
        getRequest(MachinesByProduct(productId)).then(({ data, total }) => ({
          data: data.map(Fit._id),
          total,
        })),
      shopId: (shopId) =>
        getRequest(MachinesByShop(shopId)).then(({ data, total }) => ({
          data: data.map(Fit._id),
          total,
        })),
      groupId: (groupId) =>
        getRequest(MachinesByGroup(groupId)).then(({ data, total }) => ({
          data: data.map(Fit._id),
          total,
        })),
    },
    update: (id, data) => putRequest(machineAPI(id), data),
    delete: (id) => deleteRequest(machineAPI(id)),
  },
  vendors: {
    create: (data) => postRequest(addUserAPI(), data),
    getList: (offset, limit) =>
      getRequest(
        `${getVendorsAPI()}?${new URLSearchParams({
          offset,
          limit,
        })}`,
      ),
    getOne: (id) => getRequest(userAPI(id)),
    getManyReference: {
      shopId: (shopId) =>
        getRequest(VendorsByShop(shopId)).then(({ data, total }) => ({
          data: data.map(Fit._id),
          total,
        })),
    },
    update: (id, data) => putRequest(userAPI(id), data),
    delete: (id) => deleteRequest(userAPI(id)),
  },
  customers: {
    getList: (offset, limit) =>
      getRequest(
        `${getCustomerAPI()}?${new URLSearchParams({
          offset,
          limit,
        })}`,
      ),
    getOne: (id) => getRequest(userAPI(id)),
    update: (id, data) => putRequest(userAPI(id), data),
    delete: (id) => deleteRequest(userAPI(id)),
  },
  products: {
    create: ({ image, ...data }) => {
      const formData = new FormData();
      formData.append("data", JSON.stringify(data));
      if (image?.rawFile) formData.append("image", image.rawFile);
      return postRequest(productAPI(), formData);
    },
    getList: (offset, limit, filter) =>
      getRequest(
        `${productAPI()}?${new URLSearchParams({
          offset,
          limit,
          filter: JSON.stringify(filter),
          native: "true",
        })}`,
      ),
    getOne: (id) =>
      getRequest(
        `${productsAPI(id)}?${new URLSearchParams({ native: "true" })}`,
      ),
    getManyReference: {
      machineId: (machineId) =>
        getRequest(ProductsByMachine(machineId)).then(({ data, total }) => ({
          data: data.map(Fit._id),
          total,
        })),
      vendorId: (vendorId) =>
        getRequest(ProductsByVendor(vendorId)).then(({ data, total }) => ({
          data: data.map(Fit._id),
          total,
        })),
    },
    update: (id, { image, ...data }) => {
      const formData = new FormData();
      formData.append("data", JSON.stringify(data));
      if (image?.rawFile) formData.append("image", image.rawFile);
      return putRequest(productsAPI(id), formData);
    },
    delete: (id) => deleteRequest(productsAPI(id)),
  },
  currencies: {
    getList: (_offset, _limit, _filter) =>
      getRequest(currenciesAPI()).then((body) => {
        const codes = body.data ?? [];
        return {
          data: codes.map((code) => ({ id: code, name: code })),
          total: codes.length,
        };
      }),
  },
  productsActive: {
    getList: (offset, limit, filter) =>
      getRequest(
        `${productAPI()}-active?${new URLSearchParams({
          offset,
          limit,
          filter: JSON.stringify(filter),
        })}`,
      ),
  },
  shops: {
    create: ({ image, ...data }) => {
      const formData = new FormData();
      formData.append("data", JSON.stringify(data));
      if (image?.rawFile) formData.append("image", image.rawFile);
      return postRequest(shopsAPI(), formData);
    },
    getList: (offset, limit) =>
      getRequest(
        `${shopsAPI()}?${new URLSearchParams({
          offset,
          limit,
        })}`,
      ),
    getOne: (id) => getRequest(shopAPI(id)),
    update: (id, { image, ...data }) => {
      const formData = new FormData();
      formData.append("data", JSON.stringify(data));
      if (image?.rawFile) formData.append("image", image.rawFile);
      return putRequest(shopAPI(id), formData);
    },
    delete: (id) => deleteRequest(shopAPI(id)),
  },
  paymentProviders: {
    getList: () =>
      getRequest(paymentProvidersAPI()).then(({ data, total }) => ({
        data: data.filter((p) => p.isActive),
        total: data.filter((p) => p.isActive).length,
      })),
    getOne: (id) =>
      getRequest(paymentProvidersAPI()).then(({ data }) =>
        data.find((p) => p.id === id) ?? { id, name: id, isActive: false },
      ),
  },
  paymentProvidersAll: {
    getList: () => getRequest(paymentProvidersAPI()),
    getOne: (id) =>
      getRequest(paymentProvidersAPI()).then(({ data }) =>
        data.find((p) => p.id === id) ?? { id, name: id, isActive: false },
      ),
    update: (id) => putRequest(paymentProviderToggleAPI(id), {}),
  },
  platformOptions: (() => {
    const normalize = ({ platformFeePercent, ...rest } = {}) => ({
      ...rest,
      id: "platform",
      platformFeePercent: parseFloat(
        platformFeePercent?.$numberDecimal ?? platformFeePercent ?? 0,
      ),
    });
    return {
      getOne: () => getRequest(platformOptionsAPI()).then(normalize),
      update: (_id, { id: __, paymentProviders: ___, ...data }) =>
        putRequest(platformOptionsAPI(), data).then(normalize),
    };
  })(),
  groups: {
    create: (data) => postRequest(groupsAPI(), data),
    getList: (offset, limit) =>
      getRequest(
        `${groupsAPI()}?${new URLSearchParams({
          offset,
          limit,
        })}`,
      ),
    getOne: (id) => getRequest(groupAPI(id)),
    update: (id, data) => putRequest(groupAPI(id), data),
    delete: (id) => deleteRequest(groupAPI(id)),
  },
  shopsActive: {
    getList: (offset, limit, filter) =>
      getRequest(
        `${shopsAPI()}-active?${new URLSearchParams({
          offset,
          limit,
          filter: JSON.stringify(filter),
        })}`,
      ),
  },
  purchases: {
    getOne: (id) => getRequest(purchaseAPI(id)),
    update: (id, data) => putRequest(purchaseAPI(id), data),
    getManyReference: {
      customerId: (customerId) =>
        getRequest(purchaseByCustomer(customerId)).then(({ data, total }) => ({
          data: data.map(Fit._id),
          total,
        })),
      invoiceId: (invoiceId) => getRequest(purchaseByInvoice(invoiceId)),
    },
  },
  payments: {
    getList: (offset, limit, filter = {}) => {
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(limit),
      });
      if (filter?.status) params.set("status", String(filter.status));
      if (filter?.paymentProvider)
        params.set("paymentProvider", String(filter.paymentProvider));
      if (filter?.customerId)
        params.set("customerId", String(filter.customerId));
      return getRequest(`${purchasesAPI()}?${params}`);
    },
    // expand=1 → server returns products/machine/shop/customer so a direct
    // load / refresh of the detail page is as rich as the list row.
    getOne: (id) => getRequest(`${purchaseAPI(id)}?expand=1`),
  },
  invoices: {
    getList: (offset, limit, filter = {}) => {
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(limit),
        hasInvoice: "1",
      });
      if (filter?.status) params.set("status", String(filter.status));
      if (filter?.paymentProvider)
        params.set("paymentProvider", String(filter.paymentProvider));
      if (filter?.customerId)
        params.set("customerId", String(filter.customerId));
      return getRequest(`${purchasesAPI()}?${params}`);
    },
    getOne: (id) => getRequest(`${purchaseAPI(id)}?expand=1`),
  },
  notifications: {
    getList: (offset, limit) =>
      getRequest(
        `${allPendingRequests()}?${new URLSearchParams({
          offset,
          limit,
        })}`,
      ),
  },
  /* -----------------content------------------ */
  content: {
    upload: async (...files) => {
      files = files.filter((file) => file);
      if (!files.length) return { files };
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));
      return postRequest(contentUploadAPI(), formData);
    },
  },
  websites: {
    getOne: (id) =>
      client("site").then(({ logo, favicon, ...rest }) => ({
        id,
        logo: {
          src: contentAssetUrl(logo.src),
          prevSrc: logo.src,
        },
        favicon: {
          src: contentAssetUrl(favicon.src),
          prevSrc: favicon.src,
        },
        ...rest,
      })),
    update: (id, { favicon, logo, image: ___, ...data }) =>
      Api.content.upload(favicon.rawFile, logo.rawFile).then(({ files }) =>
        putRequest(contentAPI("site"), {
          logo: {
            src:
              files.find(({ originalname }) => originalname == logo.title)
                ?.filename ?? logo.prevSrc,
          },
          favicon: {
            src:
              files.find(({ originalname }) => originalname == favicon.title)
                ?.filename ?? favicon.prevSrc,
          },
          ...data,
        }),
      ),
    getList: (offset, limit) => [],
    create: (data) => ({}),
    delete: (id) => ({}),
  },
  block: {
    getList: (locale, offset, limit) =>
      client(`${locale}HomeBlocks`).then((response) => {
        const data = response.filter(
          ({ __typename }) => __typename != "ComponentComponentsDynamicBlock",
        );
        return {
          data,
          total: data.length,
        };
      }),
    Hero: {
      // Hero is now text/link-only (kicker, title, button, store links, stats,
      // floatingCards). No images, so no upload/transform is needed.
      getOne: (locale) => client(`${locale}HomeBlocks`, "Hero"),
      update: (locale, { image: ___, ...rest }) =>
        putRequest(contentAPI(`${locale}HomeBlocks/Hero`), rest),
    },
    Gallery: {
      getOne: (locale) =>
        client(`${locale}HomeBlocks`, "Gallery").then(({ items, ...rest }) => ({
          items: items.map(({ background, ...rest }) => ({
            background: {
              src: contentAssetUrl(background.src),
              prevSrc: background.src,
            },
            ...rest,
          })),
          ...rest,
        })),
      update: (locale, { items, image: ___, ...rest }) =>
        Api.content
          .upload(...items.map((item) => item.background?.rawFile))
          .then(({ files }) =>
            putRequest(contentAPI(`${locale}HomeBlocks/Gallery`), {
              ...rest,
              items: items.map((item) => ({
                ...item,
                background: {
                  src:
                    files.find(
                      ({ originalname }) =>
                        originalname == item.background.title,
                    )?.filename ?? item.background.prevSrc,
                },
              })),
            }),
          ),
    },
    Service: {
      getOne: (locale) => client(`${locale}HomeBlocks`, "Service"),
      update: (locale, { image: ___, ...rest }) =>
        putRequest(contentAPI(`${locale}HomeBlocks/Service`), rest),
    },
  },
  docs: {
    getOne: (id) => client(`docs`, id),
    update: (id, { image, id: _, ...data }) =>
      putRequest(contentAPI(`docs/${id}`), data),
    getList: (offset, limit) =>
      client(`docs`, `?_page=${1 + offset / limit}&_limit=${limit}`, {
        withHeaders: true,
      }).then(({ data, headers }) => ({
        data,
        total: headers.get("x-total-count"),
      })),
    create: (data) => postRequest(contentAPI(`docs`), data),
    delete: (id) => deleteRequest(contentAPI(`docs/${id}`)),
  },
  enBlocks: {
    getList: (offset, limit) => Api.block.getList("en", offset, limit),
    getOne: (id) => Api.block[id].getOne("en"),
    update: (id, data) => Api.block[id].update("en", data),
    create: (data) => ({}),
    delete: (id) => ({}),
  },
  arBlocks: {
    getList: (offset, limit) => Api.block.getList("ar", offset, limit),
    getOne: (id) => Api.block[id].getOne("ar"),
    update: (id, data) => Api.block[id].update("ar", data),
    create: (data) => ({}),
    delete: (id) => ({}),
  },
  site: {
    getOne: (locale, id) =>
      client(`${locale}Site`).then((data) => ({ id, ...data })),
    update: (locale, id, { image: ___, ...data }) =>
      putRequest(contentAPI(`${locale}Site`), data),
    getList: (offset, limit) => {},
    create: (data) => ({}),
    delete: (id) => ({}),
  },
  enSite: {
    getOne: (id) => Api.site.getOne("en", id),
    update: (id, data) => Api.site.update("en", id, data),
  },
  arSite: {
    getOne: (id) => Api.site.getOne("ar", id),
    update: (id, data) => Api.site.update("ar", id, data),
  },
  seo: {
    getOne: (locale, id) =>
      client(`${locale}Seo`).then(({ shareImage, ...data }) => ({
        id,
        shareImage: {
          src: contentAssetUrl(shareImage.src),
          prevSrc: shareImage.src,
        },
        ...data,
      })),
    update: (locale, id, { shareImage, image: ___, ...data }) =>
      Api.content.upload(shareImage.rawFile).then(({ files }) =>
        putRequest(contentAPI(`${locale}Seo`), {
          shareImage: {
            src:
              files.find(({ originalname }) => originalname == shareImage.title)
                ?.filename ?? shareImage.prevSrc,
          },
          ...data,
        }),
      ),
    getList: (offset, limit) => {},
    create: (data) => ({}),
    delete: (id) => ({}),
  },
  enSeo: {
    getOne: (id) => Api.seo.getOne("en", id),
    update: (id, data) => Api.seo.update("en", id, data),
  },
  arSeo: {
    getOne: (id) => Api.seo.getOne("ar", id),
    update: (id, data) => Api.seo.update("ar", id, data),
  },
  footerBody: {
    getOne: (locale, id) =>
      client(`${locale}FooterBody`).then((data) => ({
        id,
        ...data,
      })),
    update: (locale, id, { image, id: _, ...data }) =>
      putRequest(contentAPI(`${locale}FooterBody`), data),
    getList: (offset, limit) => {},
    create: (data) => ({}),
    delete: (id) => ({}),
  },
  enFooterBody: {
    getOne: (id) => Api.footerBody.getOne("en", id),
    update: (id, data) => Api.footerBody.update("en", id, data),
  },
  arFooterBody: {
    getOne: (id) => Api.footerBody.getOne("ar", id),
    update: (id, data) => Api.footerBody.update("ar", id, data),
  },
  headerLinks: {
    getOne: (locale, id) => client(`${locale}HeaderLinks`, id),
    update: (locale, id, { image, id: _, ...data }) =>
      putRequest(contentAPI(`${locale}HeaderLinks/${id}`), data),
    getList: (locale, offset, limit) =>
      client(
        `${locale}HeaderLinks`,
        `?_page=${1 + offset / limit}&_limit=${limit}`,
        {
          withHeaders: true,
        },
      ).then(({ data, headers }) => ({
        data,
        total: headers.get("x-total-count"),
      })),
    create: (locale, data) =>
      postRequest(contentAPI(`${locale}HeaderLinks`), data),
    delete: (locale, id) =>
      deleteRequest(contentAPI(`${locale}HeaderLinks/${id}`)),
  },
  enHeaderLinks: {
    create: (data) => Api.headerLinks.create("en", data),
    getList: (offset, limit) => Api.headerLinks.getList("en", offset, limit),
    getOne: (id) => Api.headerLinks.getOne("en", id),
    update: (id, data) => Api.headerLinks.update("en", id, data),
    delete: (id) => Api.headerLinks.delete("en", id),
  },
  arHeaderLinks: {
    create: (data) => Api.headerLinks.create("ar", data),
    getList: (offset, limit) => Api.headerLinks.getList("ar", offset, limit),
    getOne: (id) => Api.headerLinks.getOne("ar", id),
    update: (id, data) => Api.headerLinks.update("ar", id, data),
    delete: (id) => Api.headerLinks.delete("ar", id),
  },
  pages: {
    getOne: (locale, id) => client(`${locale}Pages`, id),
    update: (locale, id, { image, id: _, ...data }) =>
      putRequest(contentAPI(`${locale}Pages/${id}`), data),
    getList: (locale, offset, limit) =>
      client(`${locale}Pages`, `?_page=${1 + offset / limit}&_limit=${limit}`, {
        withHeaders: true,
      }).then(({ data, headers }) => ({
        data,
        total: headers.get("x-total-count"),
      })),
    create: (locale, data) => postRequest(contentAPI(`${locale}Pages`), data),
    delete: (locale, id) => deleteRequest(contentAPI(`${locale}Pages/${id}`)),
  },
  enPages: {
    create: (data) => Api.pages.create("en", data),
    getList: (offset, limit) => Api.pages.getList("en", offset, limit),
    getOne: (id) => Api.pages.getOne("en", id),
    update: (id, data) => Api.pages.update("en", id, data),
    delete: (id) => Api.pages.delete("en", id),
  },
  arPages: {
    create: (data) => Api.pages.create("ar", data),
    getList: (offset, limit) => Api.pages.getList("ar", offset, limit),
    getOne: (id) => Api.pages.getOne("ar", id),
    update: (id, data) => Api.pages.update("ar", id, data),
    delete: (id) => Api.pages.delete("ar", id),
  },
  wallets: {
    getList: (offset, limit, filter = {}) => {
      const raw = JSON.parse(getLocalStorageItem("user") ?? "{}");
      const role = normalizeDashboardRole(raw.role);
      if (role === "Vendor") {
        return getRequest(walletsMeAPI).then((body) => {
          if (body?.data === null || !body?._id) {
            return { data: [], total: 0 };
          }
          return { data: [body], total: 1 };
        });
      }
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(limit),
      });
      if (filter?.vendorId) params.set("vendorId", String(filter.vendorId));
      if (filter?.currency) params.set("currency", String(filter.currency));
      return getRequest(`${walletsAPI()}?${params}`);
    },
    getOne: (id) => getRequest(walletAPI(id)),
  },
  withdrawals: {
    getList: (offset, limit, filter = {}) => {
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(limit),
      });
      if (filter?.status) params.set("status", String(filter.status));
      if (filter?.vendorId) params.set("vendorId", String(filter.vendorId));
      return getRequest(`${withdrawalsAPI()}?${params}`);
    },
    getOne: (id) => getRequest(withdrawalAPI(id)),
    create: (data) => {
      const bankDetails = {
        accountHolder: String(data.bankDetails?.accountHolder ?? "").trim(),
        iban: String(data.bankDetails?.iban ?? "").trim(),
        bankName: String(data.bankDetails?.bankName ?? "").trim(),
      };
      const swift = String(data.bankDetails?.swift ?? "").trim();
      if (swift) bankDetails.swift = swift;
      const payload = {
        amount: Number(data.amount),
        currency: String(data.currency || "USD"),
        bankDetails,
      };
      const vid = data.vendorId;
      if (vid != null && vid !== "") payload.vendorId = String(vid);
      return postRequest(withdrawalsAPI(), payload);
    },
  },
  transactions: {
    getList: (offset, limit, filter = {}) => {
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(limit),
      });
      if (filter?.walletId) params.set("walletId", String(filter.walletId));
      if (filter?.vendorId) params.set("vendorId", String(filter.vendorId));
      if (filter?.kind) params.set("kind", String(filter.kind));
      return getRequest(`${transactionsAPI()}?${params}`);
    },
    getOne: (id) => getRequest(transactionAPI(id)),
    getManyReference: {
      walletId: (walletId) =>
        getRequest(
          `${transactionsAPI()}?${new URLSearchParams({
            offset: "0",
            limit: "500",
            walletId: String(walletId),
          })}`,
        ).then(({ data, total }) => ({
          data: data.map(Fit._id),
          total,
        })),
      purchaseId: (purchaseId) =>
        getRequest(
          `${transactionsAPI()}?${new URLSearchParams({
            offset: "0",
            limit: "500",
            purchaseId: String(purchaseId),
          })}`,
        ).then(({ data, total }) => ({
          data: data.map(Fit._id),
          total,
        })),
    },
  },
};
const contentArray = [
  "content",
  "websites",
  "block",
  "docs",
  "enBlocks",
  "arBlocks",
  "site",
  "enSite",
  "arSite",
  "seo",
  "enSeo",
  "arSeo",
  "footerBody",
  "enFooterBody",
  "arFooterBody",
  "headerLinks",
  "enHeaderLinks",
  "arHeaderLinks",
  "pages",
  "enPages",
  "arPages",
];

export const dataProviderGenerator = (serverEvents) => {
  getRequest = (serverEvents ?? events).getRequest;
  putRequest = (serverEvents ?? events).putRequest;
  deleteRequest = (serverEvents ?? events).deleteRequest;
  postRequest = (serverEvents ?? events).postRequest;

  return {
    // get a list of records based on sort, filter, and pagination
    getList: (resource, { sort, pagination: { page, perPage }, filter }) => {
      // console.log("getList", resource);
      return Api[resource]
        .getList((page - 1) * perPage, perPage, filter)
        .then(({ data, total }) => ({
          data: data.map(Fit._id).map(Fit.image).sort(sortFn(sort)),
          // .slice((page - 1) * perPage, perPage * page),
          total,
        }));
      // .then((data) => ({
      //   data: data.map(Fit._id).map(Fit.image).sort(sortFn(sort)),
      //   // .slice((page - 1) * perPage, perPage * page),
      //   total: 100,
      // }));
    },
    // get a single record by id
    getOne: (resource, { id }) => {
      // console.log("getOne", resource, id);
      return Api[resource]
        .getOne(id)
        .then(Fit._id)
        .then(Fit.image)
        .then(Fit.data);
    },
    // get a list of records based on an array of ids
    getMany: (resource, { ids }) => {
      // console.log("getMany", resource, ids);
      return Api[resource].getMany
        ? Api[resource].getMany(ids)
        : Promise.all(ids.map((id) => Api[resource].getOne(id))).then(
            (data) => ({
              data: data.map(Fit._id).map(Fit.image),
              total: data.length,
            }),
          );
    },
    // get the records referenced to another record, e.g. comments for a post
    getManyReference: (resource, { target, id }) => {
      // console.log("getManyReference", target, resource, id);
      return Api[resource].getManyReference[target]
        ? Api[resource].getManyReference[target](id)
        : Api[resource]
            .getOne(id)
            .then(({ data }) => ({ data: [data], total: 1 }));
    },
    // create a record
    create: (resource, { data, meta }) => {
      const response = Api[resource]
        .create(data)
        .then(Fit._id)
        .then(Fit.image)
        .then(Fit.data);
      if (contentArray.includes(resource)) response.then(revalidateContent);
      return response;
    },
    // update a record based on a patch
    update: (resource, { id, data, previousData, meta }) => {
      const response = Api[resource]
        .update(id, data)
        .then(Fit._id)
        .then(Fit.image)
        .then(Fit.data);
      if (contentArray.includes(resource)) response.then(revalidateContent);
      return response;
    },
    // update a list of records based on an array of ids and a common patch
    updateMany: (resource, params) => Promise,
    // delete a record by id
    delete: (resource, { id, previousData, meta }) => {
      const response = Api[resource]
        .delete(id)
        .then(Fit._id)
        .then(Fit.image)
        .then(Fit.data);
      if (contentArray.includes(resource)) response.then(revalidateContent);
      return response;
    },
    // delete a list of records based on an array of ids
    deleteMany: (resource, params) => Promise,
  };
};

let adminDataProvider;

/** Stable reference for react-admin — avoids refetch storms on parent re-renders. */
export function getAdminDataProvider() {
  if (!adminDataProvider) {
    adminDataProvider = dataProviderGenerator();
  }
  return adminDataProvider;
}
