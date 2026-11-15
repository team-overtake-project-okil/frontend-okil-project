import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  comparisonColors,
  comparisonLabels,
} from "../../lib/hexagonAssessment";
import { Chip } from "./Chip";

const meta = {
  title: "Design System/Chip",
  component: Chip,
  args: { label: comparisonLabels[0], color: comparisonColors[0] },
  argTypes: { color: { control: "color" }, onRemove: { control: false } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleHexagon: Story = {};

function ComparisonExample() {
  const [labels, setLabels] = useState<readonly string[]>(comparisonLabels);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {labels.map((label) => (
        <Chip
          key={label}
          label={label}
          color={
            comparisonColors[
              comparisonLabels.indexOf(
                label as (typeof comparisonLabels)[number],
              )
            ]
          }
          onRemove={() =>
            setLabels((current) => current.filter((item) => item !== label))
          }
        />
      ))}
      <button type="button" onClick={() => setLabels(comparisonLabels)}>
        Відновити ділянки
      </button>
    </div>
  );
}

export const Comparison: Story = { render: () => <ComparisonExample /> };
export const Disabled: Story = { args: { onRemove: () => {}, disabled: true } };
