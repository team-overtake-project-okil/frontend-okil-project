import type { Meta, StoryObj } from "@storybook/react-vite";
import { Title, type HeadingLevel } from "./Title";

const meta = {
  title: "Design System/Title",
  component: Title,
  args: { level: 2, children: "Ваш ритм. Ваш окіл." },
  argTypes: { level: { control: "select", options: [1, 2, 3, 4, 5, 6] } },
  parameters: { layout: "padded" },
} satisfies Meta<typeof Title>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const H1: Story = { args: { level: 1 } };
export const H2: Story = { args: { level: 2 } };
export const H3: Story = { args: { level: 3 } };
export const H4: Story = { args: { level: 4 } };
export const H5: Story = { args: { level: 5 } };
export const H6: Story = { args: { level: 6 } };
export const AllLevels: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "24px" }}>
      {([1, 2, 3, 4, 5, 6] as HeadingLevel[]).map((level) => (
        <Title key={level} level={level}>H{level} — Ваш окіл</Title>
      ))}
    </div>
  ),
};
export const LongHeading: Story = {
  args: { level: 1, children: "Обирайте місце для життя за своїми пріоритетами" },
};
