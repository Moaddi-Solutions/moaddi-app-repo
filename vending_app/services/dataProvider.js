import {
  deleteRequest,
  getRequest,
  postRequest,
  putRequest,
} from "~/services/httpClient";
import {
  addUserAPI,
  allPendingRequests,
  contentAPI,
  getCustomerAPI,
  getVendorsAPI,
  machineAPI,
  machinesAPI,
  MachinesByProduct,
  MachinesByShop,
  MachinesByShopVendor,
  MachinesByVendor,
  productAPI,
  productsAPI,
  ProductsByMachine,
  ProductsByVendor,
  purchaseAPI,
  purchaseByCustomer,
  purchaseByInvoice,
  shopAPI,
  shopsAPI,
  ShopsByVendor,
  userAPI,
  VendorsByShop,
} from "~/services/serverAddresses";

const sortFn = ({ field, order } = {}) =>
  field
    ? (a, b) =>
        (order == "ASC" ? 1 : -1) *
        (Number.isFinite(a[field])
          ? a[field] - (b[field] ?? 0)
          : String(a[field] ?? "").localeCompare(String(b[field] ?? "")))
    : undefined;

export const Fit = {
  data: (data) => ({
    data,
  }),
  _id: ({ _id, ...rest } = {}) => ({
    _id,
    id: _id,
    ...rest,
  }),
  image: ({ image, ...rest } = {}) => ({
    ...(image && {
      image: { src: `${process.env.EXPO_PUBLIC_STATIC}/${image}` },
    }),
    ...rest,
  }),
};
const Api = {
  machines: {
    create: (data) => postRequest(machinesAPI, data),
    getList: (offset, limit) =>
      getRequest(
        `${machinesAPI}?${new URLSearchParams({
          offset,
          limit,
        })}`
      ),
    getOne: (id) => getRequest(machineAPI(id)),
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
    },
    getManyReferences: {
      shopId: (shopId) => ({
        vendorId: (vendorId) =>
          getRequest(MachinesByShopVendor(shopId, vendorId)).then(
            ({ data, total }) => ({
              data: data.map(Fit._id),
              total,
            })
          ),
      }),
    },
    update: (id, data) => putRequest(machineAPI(id), data),
    delete: (id) => deleteRequest(machineAPI(id)),
  },
  vendors: {
    create: (data) => postRequest(addUserAPI, data),
    getList: (offset, limit) =>
      getRequest(
        `${getVendorsAPI}?${new URLSearchParams({
          offset,
          limit,
        })}`
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
    create: null,
    getList: (offset, limit) =>
      getRequest(
        `${getCustomerAPI}?${new URLSearchParams({
          offset,
          limit,
        })}`
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
      return postRequest(productAPI, formData);
    },
    getList: (offset, limit, filter) =>
      getRequest(
        `${productAPI}?${new URLSearchParams({
          offset,
          limit,
          filter: JSON.stringify(filter),
        })}`
      ),
    getOne: (id) => getRequest(productsAPI(id)),
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
  productsActive: {
    getList: (offset, limit, filter) =>
      getRequest(
        `${productAPI}-active?${new URLSearchParams({
          offset,
          limit,
          filter: JSON.stringify(filter),
        })}`
      ),
  },
  shops: {
    create: ({ image, ...data }) => {
      const formData = new FormData();
      formData.append("data", JSON.stringify(data));
      if (image?.rawFile) formData.append("image", image.rawFile);
      return postRequest(shopsAPI, formData);
    },
    getList: (offset, limit) =>
      getRequest(
        `${shopsAPI}?${new URLSearchParams({
          offset,
          limit,
        })}`
      ),
    getManyReference: {
      vendorId: (vendorId) =>
        getRequest(ShopsByVendor(vendorId)).then(({ data, total }) => ({
          data: data.map(Fit.image),
          total,
        })),
    },
    getOne: (id) => getRequest(shopAPI(id)),
    update: (id, { image, ...data }) => {
      const formData = new FormData();
      formData.append("data", JSON.stringify(data));
      if (image?.rawFile) formData.append("image", image.rawFile);
      return putRequest(shopAPI(id), formData);
    },
    delete: (id) => deleteRequest(shopAPI(id)),
  },
  shopsActive: {
    getList: (offset, limit, filter) =>
      getRequest(
        `${shopsAPI}-active?${new URLSearchParams({
          offset,
          limit,
          filter: JSON.stringify(filter),
        })}`
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
  notifications: {
    getList: (offset, limit) =>
      getRequest(
        `${allPendingRequests}?${new URLSearchParams({
          offset,
          limit,
        })}`
      ),
  },
  /********************** Content ********************************* */
  site: {
    getOne: (id) =>
      getRequest(contentAPI("site")).then(({ logo, favicon, ...rest }) => ({
        id,
        logo: {
          src: `${process.env.EXPO_PUBLIC_STATIC}/content/${logo.src}`,
          prevSrc: logo.src,
        },
        favicon: {
          src: `${process.env.EXPO_PUBLIC_STATIC}/content/${favicon.src}`,
          prevSrc: favicon.src,
        },
        ...rest,
      })),
  },
  footerBody: {
    getOne: (locale, id) =>
      getRequest(contentAPI(`${locale}FooterBody`)).then((data) => ({
        id,
        ...data,
      })),
  },
  enFooterBody: {
    getOne: (id) => Api.footerBody.getOne("en", id),
  },
  arFooterBody: {
    getOne: (id) => Api.footerBody.getOne("ar", id),
  },
};
export default {
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
      : Promise.all(ids.map((id) => Api[resource].getOne(id))).then((data) => ({
          data: data.map(Fit._id).map(Fit.image),
          total: data.length,
        }));
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
  // get records by multiple references (e.g. machines by shop + vendor)
  getManyReferences: (resource, references) => {
    return references.reduce(
      (prev, { target, id }) => prev[target](id),
      Api[resource].getManyReferences
    );
  },
  // create a record
  create: (resource, { data, meta }) => {
    return Api[resource]
      .create(data)
      .then(Fit._id)
      .then(Fit.image)
      .then(Fit.data);
  },
  // update a record based on a patch
  update: (resource, { id, data, previousData, meta }) => {
    return Api[resource]
      .update(id, data)
      .then(Fit._id)
      .then(Fit.image)
      .then(Fit.data);
  },
  // update a list of records based on an array of ids and a common patch
  updateMany: (resource, params) => Promise,
  // delete a record by id
  delete: (resource, { id, previousData, meta }) => {
    return Api[resource]
      .delete(id)
      .then(Fit._id)
      .then(Fit.image)
      .then(Fit.data);
  },
  // delete a list of records based on an array of ids
  deleteMany: (resource, params) => Promise,
};
