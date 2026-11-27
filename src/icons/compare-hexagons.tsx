import type { SVGProps } from "react";

export default function CompareHexagonsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="bevel"
      {...props}
    >
      <path d="M12 2 17 5V10.5L22 13.5V19L17 22 12 19 7 22 2 19V13.5L7 10.5V5Z" />
      <path d="M7 10.5 12 13.5 17 10.5M12 13.5V19" />
    </svg>
  );
}
