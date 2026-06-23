"use client";

import { Icons } from "@/(root)/components/Icons";
import { PhoneInput } from "@/(root)/components/PhoneInput";
import { useCart } from "@/(root)/context/cart-provider";
import { Button } from "@/../components/ui/button";
import { Input } from "@/../components/ui/input";
import { Label } from "@/../components/ui/label";
import {
  isCustomerRole,
  isDashboardRole,
  normalizeDashboardRole,
} from "@/../lib/dashboard-role";
import { cn, setLocalStorageItem } from "@/../lib/utils";
import { getRequest, postRequest } from "@/../services/events";
import {
  otpAddress,
  signInAddress,
  signUpAddress,
  userAPI,
} from "@/../services/serverAddresses";

import axios from "axios";
import Cookies from "js-cookie";
import moment from "moment";
import { MuiOtpInput } from "mui-one-time-password-input";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { isValidPhoneNumber } from "react-phone-number-input";
import ar from "react-phone-number-input/locale/ar";
import en from "react-phone-number-input/locale/en";
import { toast } from "sonner";

export function SignInForm({ className, ...props }) {
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [isValid, setIsValid] = useState(true);
  const { setUser } = useCart();
  const { push } = useRouter();
  const t = useTranslations("");
  const inputs = {
    setIsLoading,
    phone,
    setPhone,
    isValid,
    setIsValid,
  };

  async function onSubmit(event) {
    event.preventDefault();
    // if (!isValid) return toast.error(t("Auth.invalidPhoneNumber"));

    setIsLoading(true);
    const { password } = Object.fromEntries(new FormData(event.target));
    const user = { _id: phone, password, rememberMe: false };
    try {
      const response = await postRequest(signInAddress(), user);
      response.role = normalizeDashboardRole(response.role);
      const expiryDays = response.expiresIn / 60 / 60 / 24;
      const cookieExpiresAt = moment().add(expiryDays, "days").toDate();
      response.expiresIn = cookieExpiresAt.getTime();
      const session = JSON.stringify(response);
      Cookies.set("user", session, { expires: cookieExpiresAt });

      axios.defaults.headers.common.Authorization = `Bearer ${response.token}`;

      toast.success(t("Auth.youHaveSuccessfullyLoggedIn"));

      if (isCustomerRole(response.role)) {
        try {
          const profile = await getRequest(userAPI(response._id));
          setUser(profile);
          push("/")

        } catch (profileError) {
          console.error(profileError);
          const msg = profileError?.response?.data?.message;
          if (msg) toast.error(String(msg));
          setUser({
            _id: response._id,
            name: response.name,
            role: response.role,
            preferredCurrency: response.preferredCurrency,
            token: response.token,
            expiresIn: response.expiresIn,
          });
        }
      } else if (isDashboardRole(response.role)) {
        setLocalStorageItem("user", session);
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

export function SignUpForm({ className, ...props }) {
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [isValid, setIsValid] = useState(true);
  const { push } = useRouter();
  const t = useTranslations("");
  const inputs = {
    setIsLoading,
    phone,
    setPhone,
    isValid,
    setIsValid,
  };
  async function onSubmit(event) {
    event.preventDefault();
    const { name, password, rePassword } = Object.fromEntries(
      new FormData(event.target),
    );
    if (password != rePassword)
      return toast.error(t("Auth.passwordsDoesNotMatch"));

    if (!isValid) return toast.error(t("Auth.invalidPhoneNumber"));

    setIsLoading(true);
    const user = {
      _id: phone,
      name,
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
          <MuiOtpInput length={4} value={otp} onChange={handleChange} />
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

const Inputs = ({ isLoading, phone, setPhone, isValid, setIsValid }) => {
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
      <div className="grid gap-1">
        <Label className="sr-only" htmlFor="phone">
          {t("Auth.phone")}
        </Label>
        <PhoneInput
          onBlur={handleBlur}
          className={
            isValid ? "" : "rounded-lg border border-red-800 bg-pink-100"
          }
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
      </div>
      <div className="grid gap-1">
        <Label className="sr-only" htmlFor="password">
          {t("Auth.password")}
        </Label>
        <Input
          name="password"
          id="password"
          placeholder={t("Auth.password")}
          type="password"
          disabled={isLoading}
        />
      </div>
    </>
  );
};
