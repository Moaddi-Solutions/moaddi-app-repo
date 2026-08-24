import { Button } from "@/../components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/../components/ui/command";
import { Input } from "@/../components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/../components/ui/popover";
import { ScrollArea } from "@/../components/ui/scroll-area";
import { cn } from "@/../lib/utils";
import { css } from "@kuma-ui/core";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
/**
 * Countries the platform actually operates in. Pass as `countries` on any
 * sign-in / sign-up phone field: offering the full ITU list invites numbers
 * that can never receive an OTP or be reached by support.
 */
export const SUPPORTED_COUNTRIES: RPNInput.Country[] = ["SA", "EG"];

type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "ref"
> &
  Omit<RPNInput.Props<typeof RPNInput.default>, "onChange"> & {
    onChange?: (value: RPNInput.Value) => void;
  };

const PhoneInput: React.ForwardRefExoticComponent<PhoneInputProps> =
  React.forwardRef<React.ElementRef<typeof RPNInput.default>, PhoneInputProps>(
    ({ className, onChange, value, ...props }, ref) => {
      return (
        <RPNInput.default
          ref={ref}
          className={cn("flex ", className)}
          flagComponent={FlagComponent}
          countrySelectComponent={CountrySelect}
          inputComponent={InputComponent}
          smartCaret={false}
          value={value || undefined}
          /**
           * Handles the onChange event.
           *
           * react-phone-number-input might trigger the onChange event as undefined
           * when a valid phone number is not entered. To prevent this,
           * the value is coerced to an empty string.
           *
           * @param {E164Number | undefined} value - The entered value
           */
          onChange={(value) => onChange?.(value || ("" as RPNInput.Value))}
          {...props}
        />
      );
    },
  );
PhoneInput.displayName = "PhoneInput";

const InputComponent = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => (
  <Input
    className={cn(
      // The number/prefix must read left-to-right, so the element keeps
      // `direction: ltr` (react-phone-number-input also forces this). That
      // pins the input's *logical* radii to LTR, so they can't follow the
      // page — instead we set PHYSICAL radii gated on the page direction via
      // `rtl:`/`ltr:` (which read the ancestor <html dir>). Country button
      // sits on the start side, input on the end side, so:
      //   LTR → rounded right / flat left ; RTL → rounded left / flat right.
      css`
        direction: ltr;
      `,
      "-ms-px focus-visible:z-10",
      "rounded-l-none rounded-r-lg",
      "rtl:rounded-r-none rtl:rounded-l-lg",
      className,
    )}
    {...props}
    ref={ref}
  />
));
InputComponent.displayName = "InputComponent";

type CountryEntry = { label: string; value: RPNInput.Country | undefined };

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  options: CountryEntry[];
  onChange: (country: RPNInput.Country) => void;
};

const CountrySelect = ({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
}: CountrySelectProps) => {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  // const [searchValue, setSearchValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal>
      <PopoverTrigger
        render={
          <Button
          type="button"
          variant="outline"
          // `data-slot="button"` is set explicitly because base-ui's `render`
          // prop doesn't forward the Button's default data-slot to the DOM,
          // which is what the caller targets with `[&_[data-slot=button]]:*`.
          // `h-full self-stretch` keeps the country button matched to the
          // input's height regardless of which height the caller applies.
          data-slot="button"
          // Physical radii/border gated on page direction so the button stays a
          // mirror of the input: rounded on the outer edge, flat + border removed
          // on the edge that meets the input. LTR → button on the left; RTL → right.
          className={cn(
            "flex h-full gap-1 self-stretch px-3 focus:z-10",
            "rounded-l-lg rounded-r-none border-r-0",
            "rtl:rounded-r-lg rtl:rounded-l-none rtl:border-r rtl:border-l-0",
          )}
          disabled={disabled}
          />
        }
      >
          <FlagComponent
            country={selectedCountry}
            countryName={selectedCountry}
          />
          <ChevronsUpDown
            className={cn(
              "-me-2 size-4 opacity-50",
              disabled ? "hidden" : "opacity-100",
            )}
          />
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0">
        <Command>
          {/* <CommandInput
            value={searchValue}
            onValueChange={(value) => {
              setSearchValue(value);
              setTimeout(() => {
                if (scrollAreaRef.current) {
                  const viewportElement = scrollAreaRef.current.querySelector(
                    "[data-radix-scroll-area-viewport]",
                  );
                  if (viewportElement) {
                    viewportElement.scrollTop = 0;
                  }
                }
              }, 0);
            }}
            placeholder="Search country..."
          /> */}
          <CommandList>
            <ScrollArea ref={scrollAreaRef}>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {countryList.map(({ value, label }) =>
                  value ? (
                    <CountrySelectOption
                      key={value}
                      country={value}
                      countryName={label}
                      selectedCountry={selectedCountry}
                      onChange={onChange}
                      onSelectComplete={() => setIsOpen(false)}
                    />
                  ) : null,
                )}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface CountrySelectOptionProps extends RPNInput.FlagProps {
  selectedCountry: RPNInput.Country;
  onChange: (country: RPNInput.Country) => void;
  onSelectComplete: () => void;
}

const CountrySelectOption = ({
  country,
  countryName,
  selectedCountry,
  onChange,
  onSelectComplete,
}: CountrySelectOptionProps) => {
  const handleSelect = () => {
    onChange(country);
    onSelectComplete();
  };

  return (
    <CommandItem className="gap-2" onSelect={handleSelect}>
      <FlagComponent country={country} countryName={countryName} />
      <span className="flex-1 text-sm">{countryName}</span>
      <span className="text-foreground/50 text-sm">{`+${RPNInput.getCountryCallingCode(country)}`}</span>
      <CheckIcon
        className={`ml-auto size-4 ${country === selectedCountry ? "opacity-100" : "opacity-0"}`}
      />
    </CommandItem>
  );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];

  return (
    <span className="bg-foreground/20 flex h-4 w-6 overflow-hidden rounded-sm [&_svg:not([class*='size-'])]:size-full">
      {Flag && <Flag title={countryName} />}
    </span>
  );
};

export { PhoneInput };
