"use client";
import AdminConversationsScreen from "@/(admin)/components/chat/AdminConversationsScreen";
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
import roles from "@/(admin)/components/resources/roles";
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
import { buildAbility, canAccessResource } from "@/../lib/ability";
import { isDashboardRole, normalizeDashboardRole } from "@/../lib/dashboard-role";
import authProvider from "@/../services/auth-provider";
import { getAdminDataProvider } from "@/../services/data-provider";
import { CoreAdmin as Admin, CustomRoutes, Resource } from "ra-core";
import { Route, useParams } from "react-router-dom";

const adminDataProvider = getAdminDataProvider();

const ConversationRoute = () => {
  const { conversationId } = useParams();
  return <AdminConversationsScreen selectedConversationId={conversationId ?? null} />;
};

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
        // permissions = stored user (role + packed CASL rules from the server).
        // Sections register only when the ability allows them — the server
        // remains the enforcement authority; this just shapes the UI.
        const role = normalizeDashboardRole(permissions.role);
        const ability = buildAbility(permissions.rules);
        const allowed = (resource) => canAccessResource(ability, resource, "list");
        const canChat = isDashboardRole(role) && ability.can("read", "Conversation");
        const resources = [
          allowed("machines") && <Resource {...machines} key="machines" />,
          allowed("vendors") && <Resource {...vendors} key="vendors" />,
          allowed("roles") && <Resource {...roles} key="roles" />,
          allowed("customers") && <Resource {...customers} key="customers" />,
          allowed("products") && <Resource {...products} key="products" />,
          allowed("shops") && <Resource {...shops} key="shops" />,
          allowed("groups") && <Resource {...groups} key="groups" />,
          allowed("website") && <Resource {...website} key="website" />,
          allowed("notifications") && <Resource {...notifications} key="notifications" />,
          allowed("docs") && <Resource {...docs} key="docs" />,
          ...["en", "ar", "zh", "it"].flatMap((lng) =>
            allowed(`${lng}Blocks`)
              ? [
                  <Resource {...blocks(`${lng}Blocks`)} key={`${lng}Blocks`} />,
                  <Resource {...site(`${lng}Site`)} key={`${lng}Site`} />,
                  <Resource {...seo(`${lng}Seo`)} key={`${lng}Seo`} />,
                  <Resource {...footerBody(`${lng}FooterBody`)} key={`${lng}FooterBody`} />,
                  <Resource {...header(`${lng}HeaderLinks`)} key={`${lng}HeaderLinks`} />,
                  <Resource {...pages(`${lng}Pages`)} key={`${lng}Pages`} />,
                ]
              : []
          ),
          allowed("paymentProviders") && (
            <Resource {...paymentProvidersResource} key="paymentProvidersResource" />
          ),
          allowed("platformOptions") && (
            <Resource {...platformOptionsResource} key="platformOptionsResource" />
          ),
          allowed("paymentProvidersAll") && (
            <Resource {...paymentProvidersActiveResource} key="paymentProvidersActiveResource" />
          ),
          allowed("payments") && <Resource {...payments} key="payments" />,
          allowed("invoices") && <Resource {...invoices} key="invoices" />,
          allowed("withdrawals") && <Resource {...withdrawals} key="withdrawals" />,
          allowed("wallets") && <Resource {...wallets} key="wallets" />,
          allowed("transactions") && <Resource name="transactions" key="transactions" />,
        ].filter(Boolean);
        return [
          <CustomRoutes key="custom-routes">
            <Route path="/home" element={<Dashboard />} />
            {canChat && (
              <Route path="/conversations" element={<AdminConversationsScreen />} />
            )}
            {canChat && (
              <Route path="/conversations/:conversationId" element={<ConversationRoute />} />
            )}
          </CustomRoutes>,
          ...resources,
        ];
      }}
    </Admin>
  );
};

export default AdminApp;
