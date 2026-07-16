"use client";

import { Icons } from "@/(root)/components/Icons";
import { PhoneInput } from "@/(root)/components/PhoneInput";
import { SocialAuthButtons } from "@/(root)/components/SocialAuthButtons";
import { useCart } from "@/(root)/context/cart-provider";
import { Button } from "@/../components/ui/button";
import { Input } from "@/../components/ui/input";
import { Label } from "@/../components/ui/label";
import { isCustomerRole, isDashboardRole } from "@/../lib/dashboard-role";
import { persistShopperSession } from "@/../lib/shopper-session";
import { cn, setLocalStorageItem } from "@/../lib/utils";
import { getRequest, postRequest } from "@/../services/events";
import {
  otpAddress,
  signInAddress,
  signUpAddress,
  userAPI,
} from "@/../services/serverAddresses";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { isValidPhoneNumber } from "react-phone-number-input";
import ar from "react-phone-number-input/locale/ar";
import en from "react-phone-number-input/locale/en";
import { toast } from "sonner";

export function SignInForm({ className, variant = "default", ...props }) {
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [isValid, setIsValid] = useState(true);
  const { setUser } = useCart();
  const { push } = useRouter();
  const t = useTranslations("");
  const isCardVariant = variant === "card";
  const inputs = {
    setIsLoading,
    phone,
    setPhone,
    isValid,
    setIsValid,
    variant,
  };

  async function onSubmit(event) {
    event.preventDefault();
    // if (!isValid) return toast.error(t("Auth.invalidPhoneNumber"));

    setIsLoading(true);
    const { password } = Object.fromEntries(new FormData(event.target));
    const user = { _id: phone, password, rememberMe: false };
    try {
      const response = await postRequest(signInAddress(), user);
      const session = persistShopperSession(response);

      toast.success(t("Auth.youHaveSuccessfullyLoggedIn"));

      if (isCustomerRole(session.role)) {
        try {
          const profile = await getRequest(userAPI(session._id));
          setUser(profile);
          push("/")

        } catch (profileError) {
          console.error(profileError);
          const msg = profileError?.response?.data?.message;
          if (msg) toast.error(String(msg));
          setUser(session);
        }
      } else if (isDashboardRole(session.role)) {
        setLocalStorageItem("user", JSON.stringify(session));
        push("/admin");
      }
    } catch (error) {
      if (error.response?.data?.message)
        toast.error(error.response.data.message);
      if ("User not Active." == error.response?.data?.message) {
        localStorage.setItem("otp", JSON.stringify(user));
        push("/otp");
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (isCardVariant) {
    return (
      <div className={cn("flex flex-col gap-4", className)} {...props}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Inputs {...inputs} />
          <Button
            className="mt-1 h-11 w-full rounded-xl text-sm font-extrabold"
            disabled={isLoading}
          >
            {isLoading ? (
              <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
            ) : (
              t("Auth.signIn")
            )}
          </Button>
        </form>
        <SocialAuthButtons />
        <p className="m-0 text-xs leading-5 text-muted-foreground">
          {t("Auth.agree")}{" "}
          <Link
            href="/terms"
            className="font-extrabold text-accent-foreground hover:text-primary-text"
          >
            {t("Auth.terms")}
          </Link>{" "}
          {t("Auth.and")}{" "}
          <Link
            href="/privacy"
            className="font-extrabold text-accent-foreground hover:text-primary-text"
          >
            {t("Auth.privacy")}
          </Link>
          .
        </p>
        <AuthAccessLinks t={t} />
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-2">
          <Inputs {...inputs} />
          <Button disabled={isLoading}>
            {isLoading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              t("Auth.signIn")
            )}
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="me-1 mt-1 w-full border-t" />
          {t("Auth.or")}
          <span className="ms-1 mt-1 w-full border-t" />
        </div>
      </div>
      <Link href="/signup">
        <Button
          className="w-full"
          variant="outline"
          type="button"
          disabled={isLoading}
        >
          {t("Auth.signUp")}
        </Button>
      </Link>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="me-1 mt-1 w-full border-t" />
          {t("Auth.or")}
          <span className="ms-1 mt-1 w-full border-t" />
        </div>
      </div>
      <Button
        className="w-full"
        variant="outline"
        type="button"
        onClick={() => {
          window.location.assign("/admin#/login");
        }}
      >
        {t("Auth.staff")}
      </Button>
    </div>
  );
}

export function SignUpForm({ className, variant = "default", ...props }) {
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [isValid, setIsValid] = useState(true);
  const { push } = useRouter();
  const t = useTranslations("");
  const isCardVariant = variant === "card";
  const inputs = {
    setIsLoading,
    phone,
    setPhone,
    isValid,
    setIsValid,
    variant,
  };
  async function onSubmit(event) {
    event.preventDefault();
    const { password, rePassword } = Object.fromEntries(new FormData(event.target));
    if (password != rePassword)
      return toast.error(t("Auth.passwordsDoesNotMatch"));

    if (!isValid) return toast.error(t("Auth.invalidPhoneNumber"));

    setIsLoading(true);
    const user = {
      _id: phone,
      name: phone || "Customer",
      password,
      role: "Customer",
      machines: [],
    };

    try {
      await postRequest(signUpAddress(), user);
      setIsLoading(false);
      toast.success(t("Auth.accountHasBeenRegisteredSuccessfully"));
      localStorage.setItem("otp", JSON.stringify(user));
      push("/otp");
    } catch (error) {
      if (error.response?.data?.message)
        toast.error(error.response.data.message);
      setIsLoading(false);
    }
  }

  if (isCardVariant) {
    return (
      <div className={cn("flex flex-col gap-4", className)} {...props}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Inputs {...inputs} />
          <AuthField
            label={t("Auth.rePassword")}
            htmlFor="re-password"
            variant={variant}
          >
            <Input
              id="re-password"
              name="rePassword"
              placeholder={t("Auth.rePassword")}
              type="password"
              disabled={isLoading}
              className={authInputClassName}
            />
          </AuthField>
          <Button
            className="mt-1 h-11 w-full rounded-xl text-sm font-extrabold"
            disabled={isLoading}
          >
            {isLoading ? (
              <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
            ) : (
              t("SignUp.create")
            )}
          </Button>
        </form>
        <SocialAuthButtons />
        <p className="m-0 text-xs leading-5 text-muted-foreground">
          {t("Auth.agree")}{" "}
          <Link
            href="/terms"
            className="font-extrabold text-accent-foreground hover:text-primary-text"
          >
            {t("Auth.terms")}
          </Link>{" "}
          {t("Auth.and")}{" "}
          <Link
            href="/privacy"
            className="font-extrabold text-accent-foreground hover:text-primary-text"
          >
            {t("Auth.privacy")}
          </Link>
          .
        </p>
        <Link
          href="/signin"
          className="w-fit text-sm font-bold text-foreground underline-offset-4 hover:text-primary-text hover:underline"
        >
          {t("Auth.alreadyHaveAccount")}
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-2">
          {/* <div className="grid gap-1">
            <Label className="sr-only" htmlFor="name">
              {t("SignUp.name")}
            </Label>
            <Input
              id="name"
              name="name"
              placeholder={t("SignUp.name")}
              type="text"
              disabled={isLoading}
            />
          </div> */}
          <Inputs {...inputs} />
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="re-password">
              {t("Auth.rePassword")}
            </Label>
            <Input
              id="re-password"
              name="rePassword"
              placeholder={t("Auth.rePassword")}
              type="password"
              disabled={isLoading}
            />
          </div>
          <Button disabled={isLoading}>
            {isLoading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              t("SignUp.create")
            )}
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="me-1 mt-1 w-full border-t" />
          {t("Auth.or")}
          <span className="ms-1 mt-1 w-full border-t" />
        </div>
      </div>
      <Link href="/signin">
        <Button
          className="w-full"
          variant="outline"
          type="button"
          disabled={isLoading}
        >
          {t("Auth.signIn")}
        </Button>
      </Link>
    </div>
  );
}

export function OTPForm({ className, ...props }) {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useRouter();
  const t = useTranslations("");
  const handleChange = (newValue) => setOtp(newValue);
  async function onSubmit(event) {
    event.preventDefault();
    const { _id } = JSON.parse(localStorage.getItem("otp") ?? "{}");
    setIsLoading(true);
    try {
      await postRequest(otpAddress(), {
        _id,
        otp,
      });
      setIsLoading(false);
      localStorage.removeItem("otp");
      toast.success(t("Auth.accountHasBeenRegisteredSuccessfully"));
      push("/signin");
    } catch (error) {
      if (error.response?.data?.message)
        toast.error(error.response.data.message);
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-2">
          <OtpInput length={4} value={otp} onChange={handleChange} />
          <Button
            className="mt-4"
            disabled={isLoading || !otp || otp.length < 4}
          >
            {isLoading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              t("otp.activateAccount")
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function OtpInput({ length = 4, value, onChange }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  const setDigit = (index, nextValue) => {
    const digit = nextValue.replace(/\D/g, "").slice(-1);
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(""));
    if (digit && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2" dir="ltr">
      {digits.map((digit, index) => (
        <Input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={digit}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : undefined}
          maxLength={1}
          onChange={(event) => setDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onPaste={handlePaste}
          className="size-12 rounded-xl text-center text-lg font-extrabold"
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
}

const authInputClassName =
  "h-11 rounded-xl border-border bg-background px-4 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/35 dark:bg-background/40";

const AuthAccessLinks = ({ t }) => {
  const actionClassName =
    "group flex min-h-18 w-full items-center gap-3 rounded-xl border border-transparent bg-background p-3 text-start transition-colors hover:border-primary/40 hover:bg-accent/70 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/35 focus-visible:outline-none dark:bg-background/40";
  const iconClassName =
    "flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground";

  return (
    <section
      aria-label={t("Auth.accountAccess")}
      className="mt-1 rounded-2xl border border-border bg-muted/40 p-2"
    >
      <p className="px-2 pb-2 text-[0.68rem] font-extrabold tracking-[0.14em] text-muted-foreground uppercase">
        {t("Auth.accountAccess")}
      </p>
      <div className="grid gap-2">
        <Link href="/signup" className={actionClassName}>
          <span className={iconClassName}>
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6M22 11h-6" />
            </svg>
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-extrabold text-foreground">
              {t("Auth.signUp")}
            </span>
            <span className="text-xs leading-5 text-muted-foreground">
              {t("Auth.createCustomerAccount")}
            </span>
          </span>
        </Link>
        <button
          className={actionClassName}
          type="button"
          onClick={() => {
            window.location.assign("/admin#/login");
          }}
        >
          <span className={iconClassName}>
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z" />
              <path d="M9.5 12l1.7 1.7L15 10" />
            </svg>
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-extrabold text-foreground">
              {t("Auth.staffPortal")}
            </span>
            <span className="text-xs leading-5 text-muted-foreground">
              {t("Auth.staffPortalDescription")}
            </span>
          </span>
        </button>
      </div>
    </section>
  );
};

const AuthField = ({ label, htmlFor, variant, children }) => {
  if (variant !== "card") {
    return <div className="grid gap-1">{children}</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <Label
        htmlFor={htmlFor}
        className="text-[0.68rem] font-extrabold tracking-[0.14em] text-muted-foreground uppercase"
      >
        {label}
      </Label>
      {children}
    </div>
  );
};

const Inputs = ({
  isLoading,
  phone,
  setPhone,
  isValid,
  setIsValid,
  variant = "default",
}) => {
  const t = useTranslations("");
  const input = useRef();
  // useEffect(() => {
  //   if (!input.current) return;
  //   console.log(input.current);
  // }, []);
  const locale = useLocale();
  const handleChange = (phone) => {
    const valid = isValidPhoneNumber(phone);
    if (valid) setIsValid(valid);
    setPhone(phone);
  };
  const handleBlur = (e) => {
    setIsValid(isValidPhoneNumber(phone));
  };
  return (
    <>
      <AuthField label={t("Auth.phone")} htmlFor="phone" variant={variant}>
        {variant !== "card" ? (
          <Label className="sr-only" htmlFor="phone">
            {t("Auth.phone")}
          </Label>
        ) : null}
        <PhoneInput
          onBlur={handleBlur}
          className={cn(
            variant === "card" &&
              // Radii use PHYSICAL edges (l/r) gated on page direction, because
              // the phone input's number field is locked to `dir=ltr`, so logical
              // `-s/-e` corners there don't follow the page. Button = outer start
              // edge rounded; input = outer end edge rounded; they swap in RTL.
              "h-11 rounded-xl [&_[data-slot=button]]:h-11 [&_[data-slot=button]]:rounded-l-xl [&_[data-slot=button]]:rounded-r-none [&_[data-slot=button]]:rtl:rounded-r-xl [&_[data-slot=button]]:rtl:rounded-l-none [&_[data-slot=button]]:border-border [&_[data-slot=button]]:bg-background [&_[data-slot=button]]:px-3 [&_[data-slot=input]]:h-11 [&_[data-slot=input]]:rounded-r-xl [&_[data-slot=input]]:rounded-l-none [&_[data-slot=input]]:rtl:rounded-l-xl [&_[data-slot=input]]:rtl:rounded-r-none [&_[data-slot=input]]:border-border [&_[data-slot=input]]:bg-background [&_[data-slot=input]]:px-4 [&_[data-slot=input]]:font-semibold [&_[data-slot=input]]:focus-visible:border-primary [&_[data-slot=input]]:focus-visible:ring-primary/35 dark:[&_[data-slot=button]]:bg-background/40 dark:[&_[data-slot=input]]:bg-background/40",
            !isValid &&
              (variant === "card"
                ? "[&_[data-slot=button]]:border-destructive [&_[data-slot=input]]:border-destructive [&_[data-slot=input]]:ring-destructive/20"
                : "rounded-lg border border-red-800 bg-pink-100"),
          )}
          ref={input}
          name="phone"
          defaultCountry="SA"
          countries={
            process.env.NODE_ENV == "development"
              ? ["SA", "EG", "AE"]
              : undefined
          }
          id="phone"
          placeholder={t("Auth.phone")}
          autoComplete="phone"
          onChange={handleChange}
          limitMaxLength
          international
          countryCallingCodeEditable={false}
          labels={locale === "ar" ? ar : en}
        />
      </AuthField>
      <AuthField label={t("Auth.password")} htmlFor="password" variant={variant}>
        {variant !== "card" ? (
          <Label className="sr-only" htmlFor="password">
            {t("Auth.password")}
          </Label>
        ) : null}
        <Input
          name="password"
          id="password"
          placeholder={t("Auth.password")}
          type="password"
          disabled={isLoading}
          className={variant === "card" ? authInputClassName : undefined}
        />
      </AuthField>
    </>
  );
};
