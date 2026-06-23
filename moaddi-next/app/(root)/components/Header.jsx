"use client";
import SimpleLink from "@/(root)/components/SimpleLink";
import { SocialMediaIcons } from "@/(root)/components/SocialMediaIcons";
import StrapiImage from "@/(root)/components/StrapiImage";
import Typography from "@/(root)/components/Typography";
import { useCart } from "@/(root)/context/cart-provider";
import { themeContext } from "@/(root)/context/Theme";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/../components/ui/accordion";
import { Button } from "@/../components/ui/button";
import { Drawer, DrawerContent } from "@/../components/ui/drawer";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuLinkStyle,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/../components/ui/navigation-menu";
import { Separator } from "@/../components/ui/separator";
import { chunk, cn, grouped } from "@/../lib/utils";
import { DialogTitle } from "@radix-ui/react-dialog";
import Cookies from "js-cookie";
import {
  ArrowRight,
  ChevronsRight,
  LogOut,
  ScanQrCode,
  ShoppingCart,
  User,
} from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";

import React, { useContext } from "react";

const languages = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "ar", flag: "🇸🇦", label: "العربية" },
];

export default function Navbar({ ...props }) {
  return (
    <header className="bg-white p-4 shadow-sm md:pt-2">
      <div className="container mx-auto max-w-7xl">
        <SmallNavbar {...props} />
        <LargeNavbar {...props} />
      </div>
    </header>
  );
}

function LargeNavbar({ items, socialMedia, logo }) {
  const groupedItems = grouped(items, "category");
  const bool = false;
  return (
    <>
      <div className="w-full rounded-4xl bg-indigo-50">
        <nav className="flex h-6 items-center justify-between max-md:mt-5 lg:mx-4">
          <LocaleSwitcher />
          <SocialMediaIcons size="md" items={socialMedia} />
        </nav>
      </div>
      <Separator className="my-2 bg-indigo-100 max-md:hidden" />
      <nav className="flex justify-between max-md:hidden max-md:overflow-hidden lg:mx-5">
        <div className="flex">
          <Logo src={logo} />
          {bool && (
            <NavigationMenu>
              <NavigationMenuList>
                {groupedItems.map(([category, menu], i) => {
                  let isMenu = true;
                  return (
                    <NavigationMenuItem key={i}>
                      {menu.map(
                        ({ type, url }, i) =>
                          type == 3 &&
                          ((isMenu = false),
                          (
                            <MenuLinkType3 key={i} url={url} title={category} />
                          )),
                      )}
                      {isMenu && (
                        <>
                          <NavigationMenuTrigger>
                            <SimpleLink>
                              <p>{category}</p>
                            </SimpleLink>
                          </NavigationMenuTrigger>
                          <NavigationMenuContent>
                            <div className="m-6 flex min-w-[35vw] gap-12">
                              {grouped(menu, "subCategory").map(
                                ([subCategory, items], i) => {
                                  const footer = items.find(
                                    ({ type }) => type == 2,
                                  );
                                  items = footer
                                    ? items.filter(({ type }) => type != 2)
                                    : items;
                                  const orderRules = {
                                    // 6: 6,
                                    7: 4,
                                    8: 4,
                                    9: 5,
                                    10: 5,
                                    // 11: 6,
                                    // 12: 6,
                                    13: 5,
                                    14: 5,
                                    15: 5,
                                    // 16: 6,
                                    // 17: 6,
                                    // 18: 6,
                                  };
                                  return (
                                    <div
                                      className="flex flex-1 flex-col"
                                      key={i}
                                    >
                                      <Typography
                                        variant="body2"
                                        className="ms-2 mb-4 border-b-1 border-b-gray-300 pb-1 font-semibold whitespace-nowrap text-gray-400"
                                      >
                                        {subCategory}
                                      </Typography>
                                      <div className="flex gap-12">
                                        {/**
                                       * Max is 6 per col
                                      | .  |
                                      | 07 | -> | 4 | 3 |
                                      | 08 | -> | 4 | 4 |
                                      | 09 | -> | 5 | 4 |
                                      | 10 | -> | 5 | 5 |
                                      | 11 | -> | 6 | 5 |
                                      | 12 | -> | 6 | 6 |
                                      | 13 | -> | 5 | 5 | 3 |
                                      | 14 | -> | 5 | 5 | 4 |
                                      | 15 | -> | 5 | 5 | 5 |
                                      | 16 | -> | 6 | 6 | 4 |
                                      | 17 | -> | 6 | 6 | 5 |
                                      | 18 | -> | 6 | 6 | 6 |
                                      | .  |
                                      */}
                                        {chunk(
                                          items,
                                          orderRules[items.length] ?? 6,
                                        ).map((chunk, i) => (
                                          <div key={i}>
                                            {chunk.map(
                                              ({ type, ...menuLink }, i) => {
                                                switch (type) {
                                                  case 1:
                                                    return (
                                                      <MenuLinkType1
                                                        key={i}
                                                        {...menuLink}
                                                      />
                                                    );
                                                }
                                              },
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                      {footer && (
                                        <MenuLinkType2
                                          key={"footer"}
                                          {...footer}
                                        />
                                      )}
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </NavigationMenuContent>
                        </>
                      )}
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>
          )}
        </div>
        <Icons />
      </nav>
    </>
  );
}

function SmallNavbar({ items, socialMedia, logo }) {
  const groupedItems = grouped(items, "category");
  // const [open, setOpen] = useState(false);
  // const onOpenChange = (open) => {
  //   setOpen(open);
  // };
  return (
    <Drawer
      shouldScaleBackground
      noBodyStyles
      // open={open}
      // onOpenChange={onOpenChange}
    >
      <nav className="flex justify-between md:hidden">
        <div className="flex">
          {/* <DrawerTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 gap-4 !px-0 text-base opacity-70 hover:bg-transparent hover:opacity-100 focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 "
            >
              <svg
                fill="none"
                viewBox="0 0 24 26"
                strokeWidth="1.5"
                stroke="currentColor"
                className="!size-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 9h16.5m-16.5 6.75h16.5m-16.5 6.75h16.5"
                />
              </svg>
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </DrawerTrigger> */}
          <Logo src={logo} />
        </div>
        <Icons />
      </nav>
      <DrawerContent className="z-2147483001 max-h-[80svh] p-0">
        <DialogTitle className="sr-only">Main menu</DialogTitle>
        <div className="overflow-auto p-6">
          <div className="flex flex-col gap-4">
            <Accordion type="single" collapsible className="font-semibold">
              {groupedItems.map(([category, menu], i) => {
                let isMenu = true;
                return (
                  <React.Fragment key={i}>
                    {menu.map(
                      ({ type, url }, i) =>
                        type == 3 &&
                        ((isMenu = false),
                        (
                          <AccordionItemType3
                            key={i}
                            title={category}
                            url={url}
                          />
                        )),
                    )}
                    {isMenu && (
                      <>
                        <AccordionItem value={category}>
                          <AccordionTrigger>
                            <h6 variant="h6" className="whitespace-nowrap">
                              {category}
                            </h6>
                          </AccordionTrigger>
                          <AccordionContent>
                            {grouped(menu, "subCategory").map(
                              ([subCategory, items], i) => {
                                const footer = items.find(
                                  ({ type }) => type == 2,
                                );
                                items = footer
                                  ? items.filter(({ type }) => type != 2)
                                  : items;

                                return (
                                  <div className="flex flex-1 flex-col" key={i}>
                                    <Typography
                                      variant="body2"
                                      className="my-2 ms-2 border-b-1 border-b-gray-300 pb-2 font-semibold whitespace-nowrap text-gray-400"
                                    >
                                      {subCategory}
                                    </Typography>
                                    <div className="flex flex-col gap-2">
                                      {items.map(
                                        ({ type, ...accordionItem }, i) => {
                                          switch (type) {
                                            case 1:
                                              return (
                                                <AccordionItemType1
                                                  key={i}
                                                  {...accordionItem}
                                                />
                                              );
                                          }
                                        },
                                      )}
                                    </div>
                                    {footer && (
                                      <AccordionItemType2
                                        key={"footer"}
                                        {...footer}
                                      />
                                    )}
                                  </div>
                                );
                              },
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </>
                    )}
                  </React.Fragment>
                );
              })}
            </Accordion>
            <SocialMediaIcons
              className="justify-center [&_svg]:fill-gray-700"
              variant="outlined"
              items={socialMedia}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Icons({ className }) {
  const { cartItems, user, setUser } = useCart();
  const cartItemCount = cartItems.length;
  // const [open, setOpen] = useState(false);
  const router = useRouter();
  const invoiceKey =
    user?.purchase?.invoiceId ?? user?.purchase?._id ?? "";
  const cartTarget = ["PaymentDone", "Processing"].includes(
    user?.purchase?.status,
  )
    ? `/invoice/success?invoiceId=${encodeURIComponent(String(invoiceKey))}`
    : "/checkout";
  return (
    <>
      {/* <SearchCommand openState={[open, setOpen]} /> */}
      <div className={cn("flex items-center gap-2 overflow-auto", className)}>
        {/* <Button
          title="Search"
          variant="ghost"
          size="icon"
          onClick={() => setOpen((prev) => !prev)}
        >
          <Search className="size-4" />
        </Button> */}
        <Link
          title={user ? "Profile" : "Sign in"}
          href={user ? "/profile" : "/signin"}
        >
          <Button variant="ghost" size="icon">
            <User className="size-4" />
          </Button>
        </Link>
        {/* <Link title="Whish list" href={"/whish-list"}>
          <Button variant="ghost" size="icon">
            <Heart className="size-4" />
          </Button>
        </Link> */}
        <Link title="QR Scan" href={user ? "/machine-scan" : "/signin"}>
          <Button variant="ghost" size="icon" className="relative">
            <ScanQrCode className="size-4" />
          </Button>
        </Link>
        {user?.purchase && (
          <Link title="Cart" href={cartTarget}>
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="size-4" />
              {cartItemCount > 0 && (
                <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium">
                  {cartItemCount}
                </span>
              )}
            </Button>
          </Link>
        )}
        {user && (
          <Button
            title="Sign out"
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => {
              Cookies.remove("user");
              setUser(null);
              router.push("/");
            }}
          >
            <LogOut className="size-4" />
          </Button>
        )}
      </div>
    </>
  );
}

function LocaleSwitcher() {
  const { setLocale } = useContext(themeContext);
  const locale = useLocale();
  const current = languages.find(({ code }) => code == locale);

  return (
    <NavigationMenu className="h-full">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            <SimpleLink>
              <small>{`${current.flag} ${current.label}`}</small>
            </SimpleLink>
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className=" flex flex-col">
              {languages
                .sort((a) => (a.code == locale ? 0 : -1))
                .map(({ code, flag, label }) => (
                  <Button
                    key={code}
                    variant="ghost"
                    size={"sm"}
                    className="font-semibold whitespace-nowrap"
                    disabled={locale == code}
                    onClick={() => setLocale(code)}
                  >
                    <span>
                      {flag} {label}
                    </span>
                  </Button>
                ))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function MenuLinkType1({ title, icon, url, article }) {
  const { slug } = article ?? {};
  return (
    <NavigationMenuLink
      asChild
      className="w-max cursor-pointer flex-row whitespace-nowrap transition-all"
    >
      <Link href={`/${slug ?? url}`}>
        {/* {icon && <StrapiImage src={icon.url} width={20} height={20} />} */}
        <p className="hover:text-primary-700 font-light text-gray-800">
          {title}
        </p>
      </Link>
    </NavigationMenuLink>
  );
}

function MenuLinkType2({ title }) {
  return (
    <Typography
      variant="body2"
      className="text-primary-800 hover:text-secondary-800 mx-2 mt-2 flex cursor-pointer items-center border-y-1 border-y-gray-300 py-2 font-semibold whitespace-nowrap transition-colors hover:[&_svg]:translate-x-1"
    >
      {title}
      <ChevronsRight className="mx-1 transition-transform" size={14} />
    </Typography>
  );
}

function MenuLinkType3({ title, url }) {
  return (
    <Link href={`/${url}`}>
      <SimpleLink className="mx-3">
        <p className="whitespace-nowrap ">{title}</p>
      </SimpleLink>
    </Link>
  );
}

function AccordionItemType1({ title, icon }) {
  const { url: iconURL } = (icon ??= {});
  return (
    <div className={cn(navigationMenuLinkStyle, "flex flex-row gap-2")}>
      {/* {iconURL && (
        <StrapiImage alt="icon" src={iconURL} width={20} height={20} />
      )} */}
      <p className="hover:text-primary-700 text-gray-800">{title}</p>
    </div>
  );
}

function AccordionItemType2({ title }) {
  return (
    <p className="text-primary-800 hover:text-secondary-800 mx-2 mt-2 flex cursor-pointer items-center py-2 font-bold whitespace-nowrap transition-colors hover:[&_svg]:translate-x-1">
      {title}
      <ArrowRight className="mx-1 transition-transform" size={16} />
    </p>
  );
}

function AccordionItemType3({ title, url }) {
  return (
    <Link
      href={`/${url}`}
      className="flex items-center border-b py-4 last:border-b-0 hover:underline"
    >
      <h6 variant="h6" className="whitespace-nowrap">
        {title}
      </h6>
    </Link>
  );
}

function Logo({ className, src }) {
  return (
    <Link
      className={cn("flex items-center justify-between px-2", className)}
      href="/"
      prefetch={false}
    >
      {/* <img src={"/logo.png"} className="w-18 min-w-18" /> */}
      <StrapiImage className="w-18 min-w-18" src={src} />
    </Link>
  );
}
