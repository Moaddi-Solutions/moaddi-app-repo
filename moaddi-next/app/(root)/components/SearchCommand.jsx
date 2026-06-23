import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/../components/ui/command";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/../components/ui/select";
import { CreditCard, Search, Settings, TrendingUp, User } from "lucide-react";
import React from "react";
function SearchCommand({ openState }) {
  const [open, setOpen] = openState;

  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }
  return (
    <CommandDialog
      onOpenChange={setOpen}
      open={open}
      className="rounded-lg border shadow-md md:min-w-[450px]"
    >
      <CommandInput icon={false} placeholder="Type a command or search...">
        <SelectSearch />
      </CommandInput>
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Recently searched">
          <CommandItem>
            <Search />
            <span>Food</span>
            <CommandShortcut>
              <TrendingUp />
            </CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Search />
            <span>Drink</span>
            <CommandShortcut>
              <TrendingUp />
            </CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Search />
            <span>Coffee</span>
            <CommandShortcut>
              <TrendingUp />
            </CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>
            <User />
            <span>Profile</span>
          </CommandItem>
          <CommandItem>
            <CreditCard />
            <span>Billing</span>
          </CommandItem>
          <CommandItem>
            <Settings />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function SelectSearch() {
  return (
    <Select>
      <SelectTrigger className="h-full border-0 p-0 shadow-none">
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="blueberry">Blueberry</SelectItem>
          <SelectItem value="grapes">Grapes</SelectItem>
          <SelectItem value="pineapple">Pineapple</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export default SearchCommand;
