import * as AvatarPrimitive from "@rn-primitives/avatar";
import * as React from "react";
import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { Text } from "~/components/ui/text";
import { cn } from "~/lib/utils";

function Avatar({
  className,
  ...props
}: AvatarPrimitive.RootProps & {
  ref?: React.RefObject<AvatarPrimitive.RootRef>;
}) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: AvatarPrimitive.ImageProps & {
  ref?: React.RefObject<AvatarPrimitive.ImageRef>;
}) {
  return (
    <AvatarPrimitive.Image
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  );
}

function stringToColor(string: string) {
  let hash = 0;
  let i;
  let color = "#";
  for (i = 0; i < string.length; i += 1)
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
}

function stringAvatar(name: string) {
  const splitted = name.split(" ");
  return {
    style: { backgroundColor: stringToColor(name) } as ViewStyle,
    children: (
      <Text className="text-3xl mt-2">{`${splitted[0][0]}${
        splitted[1]?.[0] ?? ""
      }`}</Text>
    ),
  };
}

function AvatarFallback({
  className,
  name,
  ...props
}: AvatarPrimitive.FallbackProps & {
  ref?: React.RefObject<AvatarPrimitive.FallbackRef>;
  name: string;
}) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full",
        className
      )}
      {...stringAvatar(name)}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
