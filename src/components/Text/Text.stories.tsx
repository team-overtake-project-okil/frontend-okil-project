import type { Meta, StoryObj } from "@storybook/react-vite";
import { Paragraph, Text, type TextVariant } from "./Text";

const meta = {
  title: "Design System/Text",
  component: Text,
  args: { children: "Ваш ритм. Ваш окіл." },
  argTypes: {
    variant: {
      control: "select",
      options: ["body", "secondary", "caption", "label"],
    },
    color: {
      control: "select",
      options: ["default", "muted", "primary"],
    },
    weight: {
      control: "select",
      options: ["regular", "medium", "semibold", "bold"],
    },
    align: {
      control: "select",
      options: ["left", "center", "right", "justify"],
    },
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Body: Story = { args: { variant: "body" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Caption: Story = { args: { variant: "caption" } };
export const Label: Story = { args: { variant: "label", children: "Район" } };
export const PrimaryColor: Story = {
  args: { color: "primary", weight: "medium" },
};

export const TextAndParagraphStyles: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "16px", maxWidth: "640px" }}>
      {(["body", "secondary", "caption", "label"] as TextVariant[]).map(
        (variant) => (
          <Text key={variant} variant={variant}>
            {variant === "label" ? "Текстова мітка" : `Варіант ${variant}`}
          </Text>
        ),
      )}
      <Paragraph>
        Абзац основного тексту зберігає семантичний елемент p і використовує
        спільну типографічну основу.
      </Paragraph>
      <Paragraph variant="secondary">
        Другорядний абзац відображається приглушеним кольором.
      </Paragraph>
      <Paragraph color="primary" weight="semibold" align="right">
        Абзац із налаштованим кольором, вагою та вирівнюванням.
      </Paragraph>
    </div>
  ),
};
