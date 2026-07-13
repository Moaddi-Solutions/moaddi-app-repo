"use client";
import Dashboard from "@/(admin)/components/Dashboard";
import Layout, { Login } from "@/(admin)/components/layout/Layout";
import blocks from "@/(admin)/components/resources/blocks";
import customers from "@/(admin)/components/resources/customers";
import docs from "@/(admin)/components/resources/docs";
import footerBody from "@/(admin)/components/resources/footerBody";
import groups from "@/(admin)/components/resources/groups";
import header from "@/(admin)/components/resources/header";
import invoices from "@/(admin)/components/resources/invoices";
import machines from "@/(admin)/components/resources/machines";
import notifications from "@/(admin)/components/resources/notifications";
import pages from "@/(admin)/components/resources/pages";
import payments from "@/(admin)/components/resources/payments";
import products from "@/(admin)/components/resources/products";
import seo from "@/(admin)/components/resources/seo";
import shops from "@/(admin)/components/resources/shops";
import site from "@/(admin)/components/resources/site";
import {
  paymentProvidersActiveResource,
  paymentProvidersResource,
  platformOptionsResource,
} from "@/(admin)/components/resources/siteOptions";
import vendors from "@/(admin)/components/resources/vendors";
import wallets from "@/(admin)/components/resources/wallets";
import withdrawals from "@/(admin)/components/resources/withdrawals";
import website from "@/(admin)/components/resources/website";
import i18nProvider from "@/(admin)/components/kit/i18nProvider";
import { isDashboardAdminRole, isVendorRole, normalizeDashboardRole } from "@/../lib/dashboard-role";
import authProvider from "@/../services/auth-provider";
import { getAdminDataProvider } from "@/../services/data-provider";
import { CoreAdmin as Admin, CustomRoutes, Resource } from "ra-core";
import { Route } from "react-router-dom";

const adminDataProvider = getAdminDataProvider();

const AdminApp = () => {
  return (
    <Admin
      title="Dashboard"
      dataProvider={adminDataProvider}
      authProvider={authProvider}
      i18nProvider={i18nProvider}
      loginPage={Login}
      requireAuth
      layout={Layout}
      dashboard={Dashboard}
    >
      {(permissions = {}) => {
        const role = normalizeDashboardRole(permissions.role);
        return [
        <CustomRoutes key="custom-routes">
          <Route path="/home" element={<Dashboard />} />
        </CustomRoutes>,
        ...(isDashboardAdminRole(role)
          ? [
              <Resource {...machines} key="machines" />,
              <Resource {...vendors} key="vendors" />,
              <Resource {...customers} key="customers" />,
              <Resource {...products} key="products" />,
              <Resource {...shops} key="shops" />,
              <Resource {...groups} key="groups" />,
              <Resource {...website} key="website" />,
              <Resource {...notifications} key="notifications" />,
              <Resource {...docs} key="docs" />,
              <Resource {...blocks("enBlocks")} key="enBlocks" />,
              <Resource {...blocks("arBlocks")} key="arBlocks" />,
              <Resource {...blocks("zhBlocks")} key="zhBlocks" />,
              <Resource {...blocks("itBlocks")} key="itBlocks" />,
              <Resource {...site("enSite")} key="enSite" />,
              <Resource {...site("arSite")} key="arSite" />,
              <Resource {...site("zhSite")} key="zhSite" />,
              <Resource {...site("itSite")} key="itSite" />,
              <Resource {...seo("enSeo")} key="enSeo" />,
              <Resource {...seo("arSeo")} key="arSeo" />,
              <Resource {...seo("zhSeo")} key="zhSeo" />,
              <Resource {...seo("itSeo")} key="itSeo" />,
              <Resource {...footerBody("enFooterBody")} key="enFooterBody" />,
              <Resource {...footerBody("arFooterBody")} key="arFooterBody" />,
              <Resource {...footerBody("zhFooterBody")} key="zhFooterBody" />,
              <Resource {...footerBody("itFooterBody")} key="itFooterBody" />,
              <Resource {...header("enHeaderLinks")} key="enHeaderLinks" />,
              <Resource {...header("arHeaderLinks")} key="arHeaderLinks" />,
              <Resource {...header("zhHeaderLinks")} key="zhHeaderLinks" />,
              <Resource {...header("itHeaderLinks")} key="itHeaderLinks" />,
              <Resource {...pages("enPages")} key="enPages" />,
              <Resource {...pages("arPages")} key="arPages" />,
              <Resource {...pages("zhPages")} key="zhPages" />,
              <Resource {...pages("itPages")} key="itPages" />,
              <Resource {...paymentProvidersResource} key="paymentProvidersResource" />,
              <Resource {...platformOptionsResource} key="platformOptionsResource" />,
              <Resource {...paymentProvidersActiveResource} key="paymentProvidersActiveResource" />,
              <Resource {...payments} key="payments" />,
              <Resource {...invoices} key="invoices" />,
              <Resource {...withdrawals} key="withdrawals" />,
              <Resource {...wallets} key="wallets" />,
              <Resource name="transactions" key="transactions" />,
            ]
          : isVendorRole(role)
            ? [
                <Resource {...machines} key="machines" />,
                <Resource {...products} key="products" />,
                <Resource {...groups} key="groups" />,
                <Resource {...notifications} key="notifications" />,
                <Resource {...docs} key="docs" />,
                <Resource {...paymentProvidersActiveResource} key="paymentProvidersActiveResource" />,
                <Resource name="paymentProvidersAll" key="paymentProvidersAll" />,
                <Resource {...wallets} key="wallets" />,
                <Resource {...withdrawals} key="withdrawals" />,
                <Resource name="transactions" key="transactions" />,
              ]
            : []),
        ];
      }}
    </Admin>
  );
};

export default AdminApp;
