import { cva, cx } from "class-variance-authority";
import { Link } from "expo-router";
import { View } from "react-native";
import { Circle, Path, Svg } from "react-native-svg";

export function SocialMediaIcons({
  items,
  className,
  variant = "contained",
  size = "lg",
}) {
  return (
    <View className={cx("flex flex-row items-start gap-2", className)}>
      {items.map(({ platform, url }) => {
        url ??= "";
        switch (platform) {
          case "facebook":
            return (
              <FacebookLink
                key={platform}
                href={url}
                variant={variant}
                size={size}
              />
            );
          case "instagram":
            return (
              <InstagramLink
                key={platform}
                href={url}
                variant={variant}
                size={size}
              />
            );
          case "tiktok":
            return (
              <TikTokLink
                key={platform}
                href={url}
                variant={variant}
                size={size}
              />
            );
          case "youtube":
            return (
              <YouTubeLink
                key={platform}
                href={url}
                variant={variant}
                size={size}
              />
            );
          case "linkedin":
            return (
              <LinkedInLink
                key={platform}
                href={url}
                variant={variant}
                size={size}
              />
            );
          case "twitter":
            return (
              <TwitterLink
                key={platform}
                href={url}
                variant={variant}
                size={size}
              />
            );
          case "snapchat":
            return (
              <SnapChatLink
                key={platform}
                href={url}
                variant={variant}
                size={size}
              />
            );
          case "whatsApp":
            return (
              <WhatsAppLink
                key={platform}
                href={url}
                variant={variant}
                size={size}
              />
            );
        }
      })}
    </View>
  );
}

const socialMediaClasses = cva(
  "rounded-3xl p-1 transition-all hover:scale-95",
  {
    variants: {
      platform: {
        facebook: null,
        instagram: null,
        youTube: null,
        linkedIn: null,
        twitter: null,
        snapChat: null,
      },
      variant: {
        contained: null,
        outlined: "border-2",
      },
      size: {
        sm: "w-5 h-5",
        md: "w-7 h-7",
        lg: "w-10 h-10",
      },
    },
    defaultVariants: {
      variant: "contained",
    },
    compoundVariants: [
      {
        platform: "facebook",
        variant: "contained",
        class: "bg-[#1877F2] hover:bg-[#135fc1]",
      },
      {
        platform: "instagram",
        variant: "contained",
        class: "bg-[#E4405F] hover:bg-[#c32e50]",
      },
      {
        platform: "youTube",
        variant: "contained",
        class: "bg-[#FF0000] hover:bg-[#cc0000]",
      },
      {
        platform: "linkedIn",
        variant: "contained",
        class: "bg-[#0077B5] hover:bg-[#005582]",
      },
      {
        platform: "twitter",
        variant: "contained",
        class: "bg-black hover:bg-slate-700",
      },
      {
        platform: "tiktok",
        variant: "contained",
        class: "bg-black hover:bg-slate-700",
      },
      {
        platform: "snapChat",
        variant: "contained",
        class: "bg-[#fefe00] hover:bg-[#f0f000]",
      },
      {
        platform: "snapChat",
        variant: "outlined",
        class: "[&_path]:stroke-0",
      },
      {
        platform: "whatsApp",
        variant: "contained",
        class: "bg-[#57d163] hover:bg-[#57d163]",
      },
    ],
  }
);

function FacebookLink({ className, variant, size, ...rest }) {
  // outlined
  return (
    <Link
      className={socialMediaClasses({
        platform: "facebook",
        size,
        variant,
        className,
      })}
      prefetch={false}
      {...rest}
    >
      <Svg viewBox="0 0 512 512" fill="white">
        <Path d="M211.9 197.4h-36.7v59.9h36.7V433.1h70.5V256.5h49.2l5.2-59.1h-54.4c0 0 0-22.1 0-33.7 0-13.9 2.8-19.5 16.3-19.5 10.9 0 38.2 0 38.2 0V82.9c0 0-40.2 0-48.8 0 -52.5 0-76.1 23.1-76.1 67.3C211.9 188.8 211.9 197.4 211.9 197.4z" />
      </Svg>
    </Link>
  );
}

function TikTokLink({ className, variant, size, ...rest }) {
  return (
    <Link
      className={socialMediaClasses({
        platform: "tiktok",
        size,
        variant,
        className,
      })}
      prefetch={false}
      {...rest}
    >
      <Svg viewBox="0 0 24 24" fill="white">
        <Path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" />
      </Svg>
    </Link>
  );
}

function InstagramLink({ className, variant, size, ...rest }) {
  return (
    <Link
      className={socialMediaClasses({
        platform: "instagram",
        size,
        variant,
        className,
      })}
      aria-label="Instagram"
      prefetch={false}
      {...rest}
    >
      <Svg fill="white" viewBox="0 0 512 512">
        <Path d="M256 109.3c47.8 0 53.4 0.2 72.3 1 17.4 0.8 26.9 3.7 33.2 6.2 8.4 3.2 14.3 7.1 20.6 13.4 6.3 6.3 10.1 12.2 13.4 20.6 2.5 6.3 5.4 15.8 6.2 33.2 0.9 18.9 1 24.5 1 72.3s-0.2 53.4-1 72.3c-0.8 17.4-3.7 26.9-6.2 33.2 -3.2 8.4-7.1 14.3-13.4 20.6 -6.3 6.3-12.2 10.1-20.6 13.4 -6.3 2.5-15.8 5.4-33.2 6.2 -18.9 0.9-24.5 1-72.3 1s-53.4-0.2-72.3-1c-17.4-0.8-26.9-3.7-33.2-6.2 -8.4-3.2-14.3-7.1-20.6-13.4 -6.3-6.3-10.1-12.2-13.4-20.6 -2.5-6.3-5.4-15.8-6.2-33.2 -0.9-18.9-1-24.5-1-72.3s0.2-53.4 1-72.3c0.8-17.4 3.7-26.9 6.2-33.2 3.2-8.4 7.1-14.3 13.4-20.6 6.3-6.3 12.2-10.1 20.6-13.4 6.3-2.5 15.8-5.4 33.2-6.2C202.6 109.5 208.2 109.3 256 109.3M256 77.1c-48.6 0-54.7 0.2-73.8 1.1 -19 0.9-32.1 3.9-43.4 8.3 -11.8 4.6-21.7 10.7-31.7 20.6 -9.9 9.9-16.1 19.9-20.6 31.7 -4.4 11.4-7.4 24.4-8.3 43.4 -0.9 19.1-1.1 25.2-1.1 73.8 0 48.6 0.2 54.7 1.1 73.8 0.9 19 3.9 32.1 8.3 43.4 4.6 11.8 10.7 21.7 20.6 31.7 9.9 9.9 19.9 16.1 31.7 20.6 11.4 4.4 24.4 7.4 43.4 8.3 19.1 0.9 25.2 1.1 73.8 1.1s54.7-0.2 73.8-1.1c19-0.9 32.1-3.9 43.4-8.3 11.8-4.6 21.7-10.7 31.7-20.6 9.9-9.9 16.1-19.9 20.6-31.7 4.4-11.4 7.4-24.4 8.3-43.4 0.9-19.1 1.1-25.2 1.1-73.8s-0.2-54.7-1.1-73.8c-0.9-19-3.9-32.1-8.3-43.4 -4.6-11.8-10.7-21.7-20.6-31.7 -9.9-9.9-19.9-16.1-31.7-20.6 -11.4-4.4-24.4-7.4-43.4-8.3C310.7 77.3 304.6 77.1 256 77.1L256 77.1z"></Path>
        <Path d="M256 164.1c-50.7 0-91.9 41.1-91.9 91.9s41.1 91.9 91.9 91.9 91.9-41.1 91.9-91.9S306.7 164.1 256 164.1zM256 315.6c-32.9 0-59.6-26.7-59.6-59.6s26.7-59.6 59.6-59.6 59.6 26.7 59.6 59.6S288.9 315.6 256 315.6z"></Path>
        <Circle cx="351.5" cy="160.5" r="21.5"></Circle>
      </Svg>
    </Link>
  );
}

function YouTubeLink({ className, variant, size, ...rest }) {
  return (
    <Link
      className={socialMediaClasses({
        platform: "youTube",
        size,
        variant,
        className,
      })}
      aria-label="YouTube"
      prefetch={false}
      {...rest}
    >
      <Svg fill="white" viewBox="0 0 512 512">
        <Path d="M422.6 193.6c-5.3-45.3-23.3-51.6-59-54 -50.8-3.5-164.3-3.5-215.1 0 -35.7 2.4-53.7 8.7-59 54 -4 33.6-4 91.1 0 124.8 5.3 45.3 23.3 51.6 59 54 50.9 3.5 164.3 3.5 215.1 0 35.7-2.4 53.7-8.7 59-54C426.6 284.8 426.6 227.3 422.6 193.6zM222.2 303.4v-94.6l90.7 47.3L222.2 303.4z"></Path>
      </Svg>
    </Link>
  );
}

function LinkedInLink({ className, variant, size, ...rest }) {
  return (
    <Link
      className={socialMediaClasses({
        platform: "linkedIn",
        size,
        variant,
        className,
      })}
      aria-label="LinkedIn"
      prefetch={false}
      {...rest}
    >
      <Svg fill="white" viewBox="0 0 512 512">
        <Path d="M186.4 142.4c0 19-15.3 34.5-34.2 34.5 -18.9 0-34.2-15.4-34.2-34.5 0-19 15.3-34.5 34.2-34.5C171.1 107.9 186.4 123.4 186.4 142.4zM181.4 201.3h-57.8V388.1h57.8V201.3zM273.8 201.3h-55.4V388.1h55.4c0 0 0-69.3 0-98 0-26.3 12.1-41.9 35.2-41.9 21.3 0 31.5 15 31.5 41.9 0 26.9 0 98 0 98h57.5c0 0 0-68.2 0-118.3 0-50-28.3-74.2-68-74.2 -39.6 0-56.3 30.9-56.3 30.9v-25.2H273.8z"></Path>
      </Svg>
    </Link>
  );
}

function TwitterLink({ className, variant, size, ...rest }) {
  return (
    <Link
      className={socialMediaClasses({
        platform: "twitter",
        size,
        variant,
        className,
      })}
      aria-label="Twitter"
      prefetch={false}
      {...rest}
    >
      <Svg fill="white" viewBox="0 0 30 30">
        <Path d="M26.37,26l-8.795-12.822l0.015,0.012L25.52,4h-2.65l-6.46,7.48L11.28,4H4.33l8.211,11.971L12.54,15.97L3.88,26h2.65 l7.182-8.322L19.42,26H26.37z M10.23,6l12.34,18h-2.1L8.12,6H10.23z" />
      </Svg>
    </Link>
  );
}

function SnapChatLink({ className, variant, size, ...rest }) {
  return (
    <Link
      className={socialMediaClasses({
        platform: "snapChat",
        size,
        variant,
        className,
      })}
      aria-label="SnapChat"
      prefetch={false}
      {...rest}
    >
      <Svg
        fill="white"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="180 80 450 430"
      >
        <Path
          d="m407.001 473.488c22.435 0 37.442-10.608 50.707-19.987 9.472-6.696 18.42-13.014 28.893-14.758 5.155-.853 10.276-1.287 15.224-1.287 8.486 0 15.159 1.078 21.109 2.236 3.404.666 6.103 1.012 8.008 1.012h.441c2.926 0 4.748-1.367 5.567-4.164.875-2.974 1.516-5.804 2.146-8.691 1.522-6.99 2.635-11.26 5.277-11.668 28.149-4.348 44.775-10.735 48.064-18.438.35-.809.55-1.637.598-2.465.13-2.305-1.503-4.332-3.778-4.711-54.004-8.897-78.209-64.088-79.209-66.432-.035-.076-.066-.149-.102-.221-3.248-6.586-3.896-12.277-1.926-16.912 3.626-8.546 15.625-12.354 23.577-14.878 1.984-.629 3.862-1.225 5.334-1.808 14.372-5.676 17.294-11.553 17.223-15.485-.08-4.218-3.787-8.233-9.447-10.242l-.106-.041c-1.987-.829-4.371-1.285-6.714-1.285-1.55 0-3.833.201-5.895 1.169-6.67 3.123-12.727 4.812-17.998 5.014-6.183-.243-9.222-2.643-9.978-3.339.173-3.202.378-6.505.6-9.995l.076-1.23c1.619-25.702 3.634-57.681-4.539-76.016-24.477-54.88-76.462-59.15-91.816-59.15-.318 0-.625.004-.908.009 0 0-6.266.062-6.674.062-15.312 0-67.189 4.265-91.651 59.112-8.173 18.323-6.16 50.275-4.546 75.95 0 0 .005.044.005.048.234 3.668.476 7.546.674 11.214-.803.744-4.124 3.362-11 3.362-5.529 0-11.958-1.697-19.104-5.045-1.31-.615-2.866-.923-4.622-.923-6.324 0-14.149 4.12-15.273 10.036-1.543 8.113 10.04 13.991 17.083 16.773 1.489.591 3.358 1.183 5.334 1.808 7.945 2.521 19.954 6.331 23.58 14.882 1.967 4.635 1.321 10.328-1.926 16.916-.036.069-.071.145-.101.217-.688 1.603-7.096 16.121-20.145 31.316-16.845 19.627-36.716 31.439-59.064 35.119-2.276.377-3.906 2.402-3.777 4.711.043.81.237 1.629.584 2.443 3.312 7.746 19.939 14.142 48.08 18.484 2.631.407 3.745 4.696 5.281 11.723.614 2.812 1.25 5.732 2.137 8.746 1.119 3.821 3.804 4.311 6.014 4.311 2.11 0 4.84-.531 8.006-1.148 5.145-1.006 12.192-2.389 21.109-2.389 4.949 0 10.071.433 15.22 1.287 10.484 1.744 19.433 8.072 28.922 14.775 13.239 9.366 28.241 19.973 50.678 19.973.636 0 1.271-.023 1.886-.076.775.037 1.794.076 2.862.076"
          stroke="black"
          strokeWidth="12"
        />
      </Svg>
    </Link>
  );
}

function WhatsAppLink({ className, variant, size, ...rest }) {
  return (
    <Link
      className={socialMediaClasses({
        platform: "whatsApp",
        size,
        variant,
        className,
      })}
      aria-label="whatsApp"
      prefetch={false}
      {...rest}
    >
      <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -100 1110 1414">
        <Path
          d="M308.678 1021.49l19.153 9.576a499.739 499.739 0 0 0 258.244 70.227c279.729-.638 509.563-231.016 509.563-510.744 0-135.187-53.692-265.012-149.169-360.713-95.35-96.69-225.62-151.18-361.383-151.18-278.451 0-507.552 229.133-507.552 507.552 0 2.203 0 4.373.032 6.576a523.81 523.81 0 0 0 76.612 268.14l12.768 19.153-51.074 188.337 192.806-46.925z"
          fill="transparent"
        />
        <Path
          d="M1003.29 172.378C894.597 61.482 745.49-.732 590.225 0h-.99C269.479.001 6.35 263.131 6.35 582.888c0 1.5.032 2.969.032 4.47a616.759 616.759 0 0 0 76.612 290.485L-.003 1181.097l309.32-79.804a569.202 569.202 0 0 0 278.993 70.228c320.939-1.756 584.036-266.385 583.844-587.356.766-154.213-60.044-302.52-168.864-411.787m-413.065 900.186a473.935 473.935 0 0 1-245.476-67.035l-19.153-9.577-184.187 47.883 47.882-181.953-12.768-19.153a484.242 484.242 0 0 1-72.558-254.957c0-265.65 218.599-484.25 484.25-484.25 265.65 0 484.248 218.6 484.248 484.25 0 167.269-86.666 323.11-228.781 411.372a464.838 464.838 0 0 1-251.86 73.42m280.59-354.329l-35.114-15.96s-51.075-22.346-82.996-38.306c-3.192 0-6.384-3.192-9.577-3.192a46.308 46.308 0 0 0-22.345 6.384c-6.799 3.99-3.192 3.192-47.882 54.266-3.032 5.97-9.257 9.705-15.96 9.577h-3.193a24.328 24.328 0 0 1-12.768-6.384l-15.961-6.385a309.91 309.91 0 0 1-92.573-60.65c-6.384-6.385-15.96-12.77-22.345-19.154a357.13 357.13 0 0 1-60.65-76.611l-3.193-6.384a46.475 46.475 0 0 1-6.384-12.769 23.915 23.915 0 0 1 3.192-15.96c2.905-4.789 12.769-15.962 22.345-25.538 9.577-9.576 9.577-15.96 15.961-22.345a39.33 39.33 0 0 0 6.384-31.922 1246.398 1246.398 0 0 0-51.074-121.301 37.099 37.099 0 0 0-22.345-15.961H380.82c-6.384 0-12.768 3.192-19.153 3.192l-3.192 3.192c-6.384 3.192-12.768 9.577-19.153 12.769-6.384 3.192-9.576 12.769-15.96 19.153a162.752 162.752 0 0 0-35.114 98.956 189.029 189.029 0 0 0 15.96 73.42l3.193 9.576a532.111 532.111 0 0 0 118.11 162.8l12.768 12.769a193.037 193.037 0 0 1 25.537 25.537c66.141 57.554 144.7 99.052 229.516 121.302 9.576 3.192 22.345 3.192 31.921 6.384h31.922a118.126 118.126 0 0 0 47.882-12.769c7.82-3.543 15.29-7.82 22.345-12.768l6.384-6.385c6.385-6.384 12.769-9.576 19.153-15.96a84.393 84.393 0 0 0 15.961-19.153c6.129-14.301 10.438-29.304 12.769-44.69V724.62a40.107 40.107 0 0 0-9.577-6.385"
          fill="#fff"
        />
      </Svg>
    </Link>
  );
}
