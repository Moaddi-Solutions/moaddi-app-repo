import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { Home } from "./Home";

const meta = {
  title: "Moaddi/Home",
  component: Home,
} as Meta<typeof Home>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    primary: true,
    label: "Home",
  },
};
