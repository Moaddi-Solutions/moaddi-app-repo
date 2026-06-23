import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { expect, userEvent, within } from "storybook/test";
import { Profile } from "./Profile";

const meta = {
  title: "Moaddi/Profile",
  component: Profile,
} as Meta<typeof Profile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    primary: true,
    label: "Profile",
  },
};
