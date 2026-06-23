import MuiTelInputRA from "@/(admin)/components/MuiTelInputAdminRA";
import { SocketContextProvider } from "@/(root)/context/Socket";
import { readDashboardUser } from "@/../lib/auth-session";
import {
  isDashboardAdminRole,
  isVendorRole,
  normalizeDashboardRole,
} from "@/../lib/dashboard-role";
import AirplayIcon from "@mui/icons-material/Airplay";
import DescriptionIcon from "@mui/icons-material/Description";
import EditDocumentIcon from "@mui/icons-material/EditDocument";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LanguageIcon from "@mui/icons-material/Language";
import PaymentIcon from "@mui/icons-material/Payment";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SettingsIcon from "@mui/icons-material/Settings";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import TuneIcon from "@mui/icons-material/Tune";
import ViewDayIcon from "@mui/icons-material/ViewDay";
import WebIcon from "@mui/icons-material/Web";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  Typography,
} from "@mui/material";
import {
  LoadingIndicator,
  LoginForm,
  PasswordInput,
  AppBar as RAAppBar,
  Layout as RALayout,
  Login as RALogin,
  Menu as RAMenu,
  required,
  TitlePortal,
  ToggleThemeButton,
  useCreatePath,
} from "react-admin";

const AccordionList = ({ title, icon: Icon = LanguageIcon, children }) => (
  <Accordion
    sx={{
      height: "auto!important",
      "::before": {
        content: "unset",
      },
      ".MuiAccordionSummary-content": {
        m: "0!important",
      },
      m: "0!important",
      border: "none",
      ".MuiAccordion-heading": { position: "absolute" },
      ".MuiCollapse-root": { mt: 4 },
    }}
  >
    <AccordionSummary
      sx={{
        width: 200,
        minHeight: 24,
        "&.Mui-expanded": {
          minHeight: 24,
        },
      }}
      expandIcon={<ExpandMoreIcon />}
    >
      <Icon sx={{ mr: 1 }} />
      <Typography>{title}</Typography>
    </AccordionSummary>
    <AccordionDetails
      sx={{ px: 0, py: 1, display: "flex", flexDirection: "column", gap: 0.5 }}
    >
      {children}
    </AccordionDetails>
  </Accordion>
);
export const Menu = () => {
  const createPath = useCreatePath();
  const role = normalizeDashboardRole(readDashboardUser().role);
  const isAdmin = isDashboardAdminRole(role);
  const isVendor = isVendorRole(role);
  return (
    <RAMenu sx={{ gap: 1, pb: 12 }}>
      {/* <RAMenu.Item to="/home" primaryText="Home" leftIcon={<HomeIcon />} /> */}
      {isAdmin && <RAMenu.ResourceItem name="customers" />}
      <RAMenu.ResourceItem name="machines" />
      {isAdmin && <RAMenu.ResourceItem name="vendors" />}
      {(isAdmin || isVendor) && <RAMenu.ResourceItem name="products" />}
      {isAdmin && <RAMenu.ResourceItem name="shops" />}
      <RAMenu.ResourceItem name="groups" />
      <RAMenu.ResourceItem name="notifications" />
      {isVendor && (
        <RAMenu.Item
          to={createPath({
            resource: "docs",
            type: "list",
          })}
          state={{ _scrollToTop: true }}
          primaryText="Docs"
          leftIcon={<EditDocumentIcon />}
          sx={{ mb: 1 }}
        />
      )}
      {isAdmin && (
        <AccordionList title="Payments" icon={PaymentIcon}>
          <RAMenu.Item
            to={createPath({ resource: "payments", type: "list" })}
            state={{ _scrollToTop: true }}
            primaryText="All Payments"
            leftIcon={<PaymentIcon />}
          />
          <RAMenu.Item
            to={createPath({ resource: "invoices", type: "list" })}
            state={{ _scrollToTop: true }}
            primaryText="Invoices"
            leftIcon={<ReceiptLongIcon />}
          />
        </AccordionList>
      )}
      {(isAdmin || isVendor) && [
        <RAMenu.ResourceItem name="wallets" key="wallets" />,
        <RAMenu.ResourceItem name="withdrawals" key="withdrawals" />,
      ]}
      {isAdmin && [
        // <ListSubheader key={"ListSubheader"} sx={{ lineHeight: 2, mx: -1 }}>
        //   Content
        // </ListSubheader>,
        <Divider key="Divider" />,
        <RAMenu.Item
          to={createPath({
            resource: "websites",
            type: "show",
            id: "fortis",
          })}
          state={{ _scrollToTop: true }}
          primaryText="Website"
          leftIcon={<AirplayIcon />}
          sx={{ mb: 1 }}
          key="websites"
        />,

        <RAMenu.Item
          to={createPath({
            resource: "docs",
            type: "list",
          })}
          state={{ _scrollToTop: true }}
          primaryText="Docs"
          leftIcon={<EditDocumentIcon />}
          sx={{ mb: 1 }}
          key="docs"
        />,

        <AccordionList
          key={"english"}
          title={"English"}
          sx={{ height: "auto" }}
        >
          <RAMenu.Item
            to={createPath({
              resource: "enSite",
              type: "show",
              id: "fortis",
            })}
            state={{ _scrollToTop: true }}
            primaryText="Website"
            leftIcon={<AirplayIcon />}
            sx={{ mb: 1 }}
          />
          <RAMenu.Item
            to={createPath({
              resource: "enSeo",
              type: "show",
              id: "fortis",
            })}
            state={{ _scrollToTop: true }}
            primaryText="SEO"
            leftIcon={<SmartToyIcon />}
            sx={{ mb: 1 }}
          />
          <RAMenu.Item
            to={createPath({
              resource: "enHeaderLinks",
              type: "list",
            })}
            primaryText="Header"
            leftIcon={<WebIcon />}
          />
          <RAMenu.Item
            to={createPath({
              resource: "enBlocks",
              type: "list",
            })}
            primaryText="Blocks"
            leftIcon={<ViewDayIcon />}
          />
          <RAMenu.Item
            to={createPath({
              resource: "enFooterBody",
              type: "show",
              id: "fortis",
            })}
            primaryText="Footer"
            leftIcon={<WebIcon sx={{ transform: "scaleY(-1)" }} />}
          />
          <RAMenu.Item
            to={createPath({
              resource: "enPages",
              type: "list",
            })}
            primaryText="Pages"
            leftIcon={<DescriptionIcon />}
          />
        </AccordionList>,

        <AccordionList key={"arabic"} title={"Arabic"}>
          <RAMenu.Item
            to={createPath({
              resource: "arSite",
              type: "show",
              id: "fortis",
            })}
            state={{ _scrollToTop: true }}
            primaryText="Website"
            leftIcon={<AirplayIcon />}
            sx={{ mb: 1 }}
          />
          <RAMenu.Item
            to={createPath({
              resource: "arSeo",
              type: "show",
              id: "fortis",
            })}
            state={{ _scrollToTop: true }}
            primaryText="SEO"
            leftIcon={<SmartToyIcon />}
            sx={{ mb: 1 }}
          />
          <RAMenu.Item
            to={createPath({
              resource: "arHeaderLinks",
              type: "list",
            })}
            primaryText="Header"
            leftIcon={<WebIcon />}
          />
          <RAMenu.Item
            to={createPath({
              resource: "arBlocks",
              type: "list",
            })}
            primaryText="Blocks"
            leftIcon={<ViewDayIcon />}
          />
          <RAMenu.Item
            to={createPath({
              resource: "arFooterBody",
              type: "show",
              id: "fortis",
            })}
            primaryText="Footer"
            leftIcon={<WebIcon sx={{ transform: "scaleY(-1)" }} />}
          />
          <RAMenu.Item
            to={createPath({
              resource: "arPages",
              type: "list",
            })}
            primaryText="Pages"
            leftIcon={<DescriptionIcon />}
          />
        </AccordionList>,

        <AccordionList
          key={"siteOptions"}
          title={"Site Options"}
          icon={SettingsIcon}
        >
          <RAMenu.Item
            to={createPath({
              resource: "paymentProvidersAll",
              type: "list",
            })}
            state={{ _scrollToTop: true }}
            primaryText="Payment Providers"
            leftIcon={<PaymentIcon />}
            sx={{ mb: 1 }}
          />
          <RAMenu.Item
            to={createPath({
              resource: "platformOptions",
              type: "show",
              id: "platform",
            })}
            state={{ _scrollToTop: true }}
            primaryText="Platform Fees"
            leftIcon={<TuneIcon />}
          />
        </AccordionList>,
      ]}
    </RAMenu>
  );
};

const AppBar = () => (
  <RAAppBar
    toolbar={
      <>
        <a href="/admin#/home">
          <Box
            component={"img"}
            sx={{ height: 40, width: "auto" }}
            src="/logo.png"
          />
        </a>
        <TitlePortal />
        {/* <LocalesMenuButton /> */}
        <ToggleThemeButton />
        <LoadingIndicator />
      </>
    }
  >
    {/* <InspectorButton /> */}
  </RAAppBar>
);

const Layout = ({ children }) => {
  return (
    <RALayout menu={Menu} appBar={AppBar}>
      <SocketContextProvider>{children}</SocketContextProvider>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </RALayout>
  );
};

export const Login = () => {
  return (
    <RALogin>
      <LoginForm>
        <MuiTelInputRA
          staffLogin
          defaultCountry="SA"
          // forceCallingCode
          preferredCountries={["SA", "EG", "AE"]}
          autoFocus
          source="username"
          label="Phone Number"
          autoComplete="phone"
          type="tel"
          validate={required()}
          slotProps={{
            htmlInput: {
              maxLength: 20,
            },
          }}
        />

        <PasswordInput
          source="password"
          label="Password"
          autoComplete="current-password"
          validate={required()}
        />
      </LoginForm>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "center",
          marginTop: 16,
          paddingInline: 16,
          width: "100%",
          padding:10
        }}
      >
        <a
          href="/"
          style={{
            border: "1px solid #5D0EC0",
            borderRadius: 4,
            color: "#5D0EC0",
            flex: "1 1 150px",
            fontSize: 14,
            fontWeight: 500,
            maxWidth: 220,
            padding: "8px 14px",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          Go to home
        </a>
        <a
          href="/sign-in"
          style={{
            background: "#5D0EC0",
            border: "1px solid #5D0EC0",
            borderRadius: 4,
            color: "#fff",
            flex: "1 1 150px",
            fontSize: 14,
            fontWeight: 500,
            maxWidth: 220,
            padding: "8px 14px",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          Sign in as customer
        </a>
      </div>
    </RALogin>
  );
};
export default Layout;
