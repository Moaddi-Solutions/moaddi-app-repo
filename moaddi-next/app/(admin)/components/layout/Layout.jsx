"use client";

import { PhoneInput } from "@/(root)/components/PhoneInput";
import { useChat } from "@/(root)/context/chat-context";
import { SocketContextProvider } from "@/(root)/context/Socket";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/../components/ui/accordion";
import { Button as ShadcnButton } from "@/../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/../components/ui/card";
import { Input } from "@/../components/ui/input";
import { Label } from "@/../components/ui/label";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/../components/ui/sidebar";
import { readDashboardUser } from "@/../lib/auth-session";
import {
  isDashboardAdminRole,
  isVendorRole,
  normalizeDashboardRole,
} from "@/../lib/dashboard-role";
import { useTheme } from "@/../lib/use-theme";
import {
  Banknote,
  BellRing,
  CreditCard,
  Globe,
  Handshake,
  Home,
  Landmark,
  Languages,
  Layers,
  LoaderCircle,
  LogOut,
  MessageCircle,
  Moon,
  Package,
  PanelBottom,
  PanelTop,
  ReceiptText,
  Refrigerator,
  Rows3,
  SearchCheck,
  Settings2,
  SlidersHorizontal,
  Smartphone,
  Store,
  Sun,
  FileText,
  NotebookText,
  UserRound,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { useCreatePath, useLogin, useLogout, useNotify } from "ra-core";
import { Link, useLocation } from "react-router-dom";
import { AdminNotifications } from "@/(admin)/components/kit/AdminUI";

const normalizeUnreadCount = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

const formatUnreadCount = (value) => (value > 99 ? "99+" : String(value));

const UnreadBadge = ({ count, className = "" }) => {
  const normalized = normalizeUnreadCount(count);
  if (!normalized) return null;
  return (
    <span
      className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-black leading-none text-destructive-foreground ${className}`}
    >
      {formatUnreadCount(normalized)}
    </span>
  );
};

const NavItem = ({ to, icon: Icon, children, badgeCount = 0 }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={children}>
        <Link to={to} state={{ _scrollToTop: true }}>
          <Icon />
          <span>{children}</span>
          <UnreadBadge
            count={badgeCount}
            className="ms-auto group-data-[collapsible=icon]:hidden"
          />
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const SubNavItem = ({ to, icon: Icon, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={isActive}>
        <Link to={to} state={{ _scrollToTop: true }}>
          <Icon />
          <span>{children}</span>
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
};

const NavGroup = ({ title, icon: Icon, children }) => (
  <Accordion className="w-full">
    <AccordionItem value={title} className="border-none">
      <AccordionTrigger className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground gap-2 rounded-md p-2 text-sm no-underline hover:no-underline [&>svg]:size-4 [&>svg]:shrink-0">
        <span className="flex items-center gap-2">
          <Icon aria-hidden="true" />
          {title}
        </span>
      </AccordionTrigger>
      <AccordionContent className="pb-0.5">
        <SidebarMenuSub>{children}</SidebarMenuSub>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

export const AppSidebar = () => {
  const createPath = useCreatePath();
  const role = normalizeDashboardRole(readDashboardUser().role);
  const isAdmin = isDashboardAdminRole(role);
  const isVendor = isVendorRole(role);
  const { totalUnreadCount } = useChat();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/home" className="flex items-center gap-2 rounded-md p-2">
          <img
            src="/images/icon-new.jpg"
            alt="Moaddi"
            className="size-8 shrink-0 rounded-lg object-cover"
          />
          <span className="flex flex-col truncate leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-extrabold">Moaddi</span>
            <span className="text-muted-foreground truncate text-[10px] font-bold tracking-[0.08em] uppercase">
              Admin
            </span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Business</SidebarGroupLabel>
          <SidebarMenu>
            {isAdmin && (
              <NavItem to={createPath({ resource: "customers", type: "list" })} icon={UsersRound}>
                Customers
              </NavItem>
            )}
            <NavItem to={createPath({ resource: "machines", type: "list" })} icon={Refrigerator}>
              Machines
            </NavItem>
            {isAdmin && (
              <NavItem to={createPath({ resource: "vendors", type: "list" })} icon={Handshake}>
                Vendors
              </NavItem>
            )}
            {(isAdmin || isVendor) && (
              <NavItem to={createPath({ resource: "products", type: "list" })} icon={Package}>
                Products
              </NavItem>
            )}
            {isAdmin && (
              <NavItem to={createPath({ resource: "shops", type: "list" })} icon={Store}>
                Shops
              </NavItem>
            )}
            <NavItem to={createPath({ resource: "groups", type: "list" })} icon={Layers}>
              Groups
            </NavItem>
            <NavItem to={createPath({ resource: "notifications", type: "list" })} icon={BellRing}>
              Notifications
            </NavItem>
            {(isAdmin || isVendor) && (
              <NavItem to="/conversations" icon={MessageCircle} badgeCount={totalUnreadCount}>
                Conversations
              </NavItem>
            )}
            {isVendor && (
              <NavItem to={createPath({ resource: "docs", type: "list" })} icon={NotebookText}>
                Docs
              </NavItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Payments</SidebarGroupLabel>
            <SidebarMenu>
              <li>
                <NavGroup title="Payments" icon={CreditCard}>
                  <SubNavItem
                    to={createPath({ resource: "payments", type: "list" })}
                    icon={CreditCard}
                  >
                    All Payments
                  </SubNavItem>
                  <SubNavItem
                    to={createPath({ resource: "invoices", type: "list" })}
                    icon={ReceiptText}
                  >
                    Invoices
                  </SubNavItem>
                </NavGroup>
              </li>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {(isAdmin || isVendor) && (
          <SidebarGroup>
            <SidebarGroupLabel>Finance</SidebarGroupLabel>
            <SidebarMenu>
              <NavItem to={createPath({ resource: "wallets", type: "list" })} icon={Wallet}>
                Wallets
              </NavItem>
              <NavItem
                to={createPath({ resource: "withdrawals", type: "list" })}
                icon={Landmark}
              >
                Withdrawals
              </NavItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Site</SidebarGroupLabel>
              <SidebarMenu>
                <NavItem
                  to={createPath({ resource: "websites", type: "show", id: "fortis" })}
                  icon={Globe}
                >
                  Website
                </NavItem>
                <NavItem to={createPath({ resource: "docs", type: "list" })} icon={NotebookText}>
                  Docs
                </NavItem>
                <li>
                  <NavGroup title="English" icon={Languages}>
                    <SubNavItem
                      to={createPath({ resource: "enSite", type: "show", id: "fortis" })}
                      icon={Globe}
                    >
                      Website
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "enSeo", type: "show", id: "fortis" })}
                      icon={SearchCheck}
                    >
                      SEO
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "enHeaderLinks", type: "list" })}
                      icon={PanelTop}
                    >
                      Header
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "enBlocks", type: "list" })}
                      icon={Rows3}
                    >
                      Blocks
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "enFooterBody", type: "show", id: "fortis" })}
                      icon={PanelBottom}
                    >
                      Footer
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "enPages", type: "list" })}
                      icon={FileText}
                    >
                      Pages
                    </SubNavItem>
                  </NavGroup>
                </li>
                <li>
                  <NavGroup title="Arabic" icon={Languages}>
                    <SubNavItem
                      to={createPath({ resource: "arSite", type: "show", id: "fortis" })}
                      icon={Globe}
                    >
                      Website
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "arSeo", type: "show", id: "fortis" })}
                      icon={SearchCheck}
                    >
                      SEO
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "arHeaderLinks", type: "list" })}
                      icon={PanelTop}
                    >
                      Header
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "arBlocks", type: "list" })}
                      icon={Rows3}
                    >
                      Blocks
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "arFooterBody", type: "show", id: "fortis" })}
                      icon={PanelBottom}
                    >
                      Footer
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "arPages", type: "list" })}
                      icon={FileText}
                    >
                      Pages
                    </SubNavItem>
                  </NavGroup>
                </li>
                <li>
                  <NavGroup title="Chinese" icon={Languages}>
                    <SubNavItem
                      to={createPath({ resource: "zhSite", type: "show", id: "fortis" })}
                      icon={Globe}
                    >
                      Website
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "zhSeo", type: "show", id: "fortis" })}
                      icon={SearchCheck}
                    >
                      SEO
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "zhHeaderLinks", type: "list" })}
                      icon={PanelTop}
                    >
                      Header
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "zhBlocks", type: "list" })}
                      icon={Rows3}
                    >
                      Blocks
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "zhFooterBody", type: "show", id: "fortis" })}
                      icon={PanelBottom}
                    >
                      Footer
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "zhPages", type: "list" })}
                      icon={FileText}
                    >
                      Pages
                    </SubNavItem>
                  </NavGroup>
                </li>
                <li>
                  <NavGroup title="Italian" icon={Languages}>
                    <SubNavItem
                      to={createPath({ resource: "itSite", type: "show", id: "fortis" })}
                      icon={Globe}
                    >
                      Website
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "itSeo", type: "show", id: "fortis" })}
                      icon={SearchCheck}
                    >
                      SEO
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "itHeaderLinks", type: "list" })}
                      icon={PanelTop}
                    >
                      Header
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "itBlocks", type: "list" })}
                      icon={Rows3}
                    >
                      Blocks
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "itFooterBody", type: "show", id: "fortis" })}
                      icon={PanelBottom}
                    >
                      Footer
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "itPages", type: "list" })}
                      icon={FileText}
                    >
                      Pages
                    </SubNavItem>
                  </NavGroup>
                </li>
                <li>
                  <NavGroup title="Site Options" icon={Settings2}>
                    <SubNavItem
                      to={createPath({ resource: "paymentProvidersAll", type: "list" })}
                      icon={Banknote}
                    >
                      Payment Providers
                    </SubNavItem>
                    <SubNavItem
                      to={createPath({ resource: "platformOptions", type: "show", id: "platform" })}
                      icon={SlidersHorizontal}
                    >
                      Platform Fees
                    </SubNavItem>
                  </NavGroup>
                </li>
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border border-t">
        <SignOutButton />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

const SignOutButton = () => {
  const logout = useLogout();
  const user = readDashboardUser();
  const name = user.name || "Signed in";
  const roleLabel = normalizeDashboardRole(user.role) || "Staff";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          <span className="bg-sidebar-accent text-sidebar-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold uppercase">
            {name.trim().charAt(0) || "U"}
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-bold">{name}</span>
            <span className="text-muted-foreground truncate text-[10px] font-bold tracking-[0.08em] uppercase">
              {roleLabel}
            </span>
          </span>
        </div>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => logout()}
          tooltip="Sign out"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive font-bold"
        >
          <LogOut />
          <span>Sign out</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

const ThemeToggleButton = () => {
  const [isDark, toggle] = useTheme();
  return (
    <ShadcnButton
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 rounded-lg"
      onClick={toggle}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </ShadcnButton>
  );
};

const AppHeader = () => {
  const role = normalizeDashboardRole(readDashboardUser().role);
  const canOpenConversations = isDashboardAdminRole(role) || isVendorRole(role);
  const { totalUnreadCount } = useChat();

  return (
    <header className="border-sidebar-border bg-sidebar flex h-14 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger />
      <div className="min-w-0 flex-1" />
      {canOpenConversations && (
        <ShadcnButton
          asChild
          type="button"
          variant="ghost"
          size="icon"
          className="relative size-8 rounded-lg"
          aria-label="Open conversations"
          title="Open conversations"
        >
          <Link to="/conversations">
            <MessageCircle className="size-4" />
            <UnreadBadge
              count={totalUnreadCount}
              className="absolute -right-1.5 -top-1.5 border-2 border-sidebar"
            />
          </Link>
        </ShadcnButton>
      )}
      <ThemeToggleButton />
    </header>
  );
};

const Layout = ({ children }) => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <div className="flex-1 p-4">
          <SocketContextProvider>{children}</SocketContextProvider>
        </div>
      </SidebarInset>
      <AdminNotifications />
    </SidebarProvider>
  );
};

const adminAuthInputClassName =
  "h-11 rounded-xl border-border bg-background px-4 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/35";

const adminAuthPhoneInputClassName =
  "h-11 rounded-xl [&_[data-slot=button]]:h-11 [&_[data-slot=button]]:rounded-s-xl [&_[data-slot=button]]:border-border [&_[data-slot=button]]:bg-background [&_[data-slot=button]]:px-3 [&_[data-slot=input]]:h-11 [&_[data-slot=input]]:rounded-e-xl [&_[data-slot=input]]:border-border [&_[data-slot=input]]:bg-background [&_[data-slot=input]]:px-4 [&_[data-slot=input]]:font-semibold [&_[data-slot=input]]:focus-visible:border-primary [&_[data-slot=input]]:focus-visible:ring-primary/35";

const AdminLoginLink = ({ href, icon: Icon, label, primary = false }) => (
  <ShadcnButton
    asChild
    variant={primary ? "default" : "outline"}
    className="h-11 rounded-xl text-sm font-extrabold"
  >
    <a href={href}>
      <Icon data-icon="inline-start" />
      {label}
    </a>
  </ShadcnButton>
);

export const Login = () => {
  const login = useLogin();
  const notify = useNotify();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!phone || !password) {
      notify("Phone number and password are required.", { type: "warning" });
      return;
    }

    setIsLoading(true);
    try {
      await login({ username: phone, password });
    } catch (error) {
      notify(error?.message || "Login failed", { type: "error" });
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-start justify-center bg-background px-4 py-10 font-sans text-foreground sm:py-14">
      <Card className="w-full max-w-[440px] gap-0 rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-[0_18px_50px_rgba(16,40,46,0.10)] ring-0">
        <CardContent className="p-6 pb-0 sm:p-7 sm:pb-0">
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Smartphone aria-hidden="true" size={28} strokeWidth={2} />
          </div>

          <CardHeader className="mb-5 flex flex-col gap-2 p-0">
            <CardTitle className="text-[1.35rem] leading-tight font-extrabold tracking-normal text-foreground">
              Staff sign in
            </CardTitle>
            <CardDescription className="max-w-[34ch] text-sm leading-6 text-muted-foreground">
              Use your authorized staff phone number to enter the Moaddi
              operations dashboard.
            </CardDescription>
          </CardHeader>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="admin-phone"
                className="text-[0.68rem] font-extrabold tracking-[0.14em] text-muted-foreground uppercase"
              >
                Phone number
              </Label>
              <PhoneInput
                id="admin-phone"
                name="phone"
                autoComplete="tel"
                autoFocus
                className={adminAuthPhoneInputClassName}
                countryCallingCodeEditable={false}
                defaultCountry="SA"
                disabled={isLoading}
                international
                limitMaxLength
                onChange={setPhone}
                placeholder="Phone number"
                value={phone}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="admin-password"
                className="text-[0.68rem] font-extrabold tracking-[0.14em] text-muted-foreground uppercase"
              >
                Password
              </Label>
              <Input
                id="admin-password"
                name="password"
                autoComplete="current-password"
                className={adminAuthInputClassName}
                disabled={isLoading}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                required
                type="password"
                value={password}
              />
            </div>

            <ShadcnButton
              className="mt-1 h-11 w-full rounded-xl text-sm font-extrabold"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <LoaderCircle data-icon="inline-start" className="animate-spin" />
              ) : null}
              Sign in
            </ShadcnButton>
          </form>

          <p className="mt-4 mb-0 text-xs leading-5 text-muted-foreground">
            By signing in you agree to our{" "}
            <a
              href="/terms"
              className="font-extrabold text-accent-foreground hover:text-primary-text"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="font-extrabold text-accent-foreground hover:text-primary-text"
            >
              Privacy Policy
            </a>
            .
          </p>
        </CardContent>

        <CardFooter className="grid grid-cols-1 gap-2 border-0 bg-transparent p-6 pt-4 sm:grid-cols-2 sm:p-7 sm:pt-4">
          <AdminLoginLink href="/" icon={Home} label="Customer home" />
          <AdminLoginLink
            href="/signin"
            icon={UserRound}
            label="Sign in as customer"
            primary
          />
        </CardFooter>
      </Card>
    </main>
  );
};
export default Layout;
