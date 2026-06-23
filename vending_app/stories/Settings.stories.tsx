import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { Settings } from "./Settings";

const meta = {
  title: "Moaddi/Settings",
  component: Settings,
} as Meta<typeof Settings>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    primary: true,
    label: "Settings",
  },
};
