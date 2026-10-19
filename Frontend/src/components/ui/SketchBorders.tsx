import React from "react";

/**
 * Expressive, natural hand-drawn (wobbly / sketch) SVG borders.
 * Features charming organic asymmetry and hand-inked curves.
 * Fills are integrated directly into the SVG path so backgrounds NEVER leak outside the stroke.
 */

export const SKETCH_CARD_PATH = "M 14,8 Q 130,4 250,7 Q 340,10 388,6 Q 397,7 396,17 Q 393,100 397,180 Q 399,250 394,286 Q 393,296 384,295 Q 270,298 160,293 Q 70,289 14,295 Q 5,295 6,284 Q 9,190 5,120 Q 3,60 6,17 Q 6,8 14,8 Z";

export const SKETCH_BUTTON_PATH = "M 9,4.5 Q 70,2 135,5.5 Q 175,7.5 191,4 Q 198,4.5 197,12 Q 195,25 197,39 Q 196,47 188,46 Q 130,48 70,44.5 Q 30,42 10,47 Q 3.5,46 4.5,38 Q 6,24 3.5,12 Q 4.5,4.5 9,4.5 Z";

// 1. Large Card Organic Wobbly Frame (ViewBox 400x300)
export const WobblyCardFrame = ({
  stroke = "#33302B",
  strokeWidth = 1.85,
  fill = "none",
  className = "",
}: {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  className?: string;
}) => (
  <svg
    viewBox="0 0 400 300"
    preserveAspectRatio="none"
    className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    aria-hidden="true"
  >
    <path
      d={SKETCH_CARD_PATH}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

// 2. Medium Box / Inner Container Organic Frame (ViewBox 300x150)
export const WobblyBoxFrame = ({
  stroke = "#33302B",
  strokeWidth = 1.55,
  fill = "none",
  className = "",
}: {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  className?: string;
}) => (
  <svg
    viewBox="0 0 300 150"
    preserveAspectRatio="none"
    className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    aria-hidden="true"
  >
    <path
      d="M 12,7
         Q 100,3 200,8
         Q 260,11 289,6
         Q 298,7 296,16
         Q 293,65 297,110
         Q 298,138 293,144
         Q 290,147 282,146
         Q 190,148 110,143
         Q 50,140 12,146
         Q 4,145 5,134
         Q 8,85 4,45
         Q 2,20 6,15
         Q 6,7 12,7 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

// 3. Wide Navbar / Island Frame (ViewBox 800x60)
export const WobblyNavFrame = ({
  stroke = "#33302B",
  strokeWidth = 1.75,
  fill = "none",
  className = "",
}: {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  className?: string;
}) => (
  <svg
    viewBox="0 0 800 60"
    preserveAspectRatio="none"
    className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    aria-hidden="true"
  >
    <path
      d="M 18,5
         Q 260,2 520,7
         Q 680,10 782,5
         Q 796,6 795,16
         Q 798,30 795,44
         Q 794,56 782,55
         Q 540,58 280,53
         Q 120,49 18,55
         Q 5,55 6,43
         Q 3,28 6,16
         Q 6,5 18,5 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

// 4. Pill / Button Organic Rounded Frame (ViewBox 300x60)
export const WobblyPillBorder = ({
  stroke = "#33302B",
  strokeWidth = 1.65,
  fill = "none",
  className = "",
}: {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  className?: string;
}) => (
  <svg
    viewBox="0 0 300 60"
    preserveAspectRatio="none"
    className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    aria-hidden="true"
  >
    <path
      d="M 24,5
         Q 100,2 180,6.5
         Q 240,10 276,5
         C 292,6 298,17 296,30
         C 295,43 289,55.5 275,55.5
         Q 190,58 110,54
         Q 50,51 22,55.5
         C 9,55.5 3.5,43 4.5,30
         C 4.5,17 11,5 24,5 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

// 5. Action Button Hand-Drawn Rectangular Frame (ViewBox 200x50)
export const WobblyButtonFrame = ({
  stroke = "#33302B",
  strokeWidth = 1.75,
  fill = "none",
  className = "",
}: {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  className?: string;
}) => (
  <svg
    viewBox="0 0 200 50"
    preserveAspectRatio="none"
    className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    aria-hidden="true"
  >
    <path
      d={SKETCH_BUTTON_PATH}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

// 6. Hand-Drawn Wavy Horizontal Divider
export const WobblyDivider = ({
  stroke = "#33302B",
  strokeWidth = 1.4,
  className = "",
}: {
  stroke?: string;
  strokeWidth?: number;
  className?: string;
}) => (
  <svg
    viewBox="0 0 800 12"
    preserveAspectRatio="none"
    className={`w-full h-3 pointer-events-none ${className}`}
    aria-hidden="true"
  >
    <path
      d="M 2,6
         Q 98,4 205,6.5
         Q 312,9 415,6
         Q 518,3.5 620,6.5
         Q 722,9 798,6"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

// 7. Accordion / Wide Row Organic Wobbly Frame (ViewBox 600x120)
export const WobblyAccordionFrame = ({
  stroke = "#33302B",
  strokeWidth = 1.6,
  fill = "#FFFDF7",
  className = "",
}: {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  className?: string;
}) => (
  <svg
    viewBox="0 0 600 120"
    preserveAspectRatio="none"
    className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    aria-hidden="true"
  >
    <path
      d="M 12,6
         Q 160,3 320,6.5
         Q 460,9 588,5
         Q 596,5.5 595,14
         Q 593,55 596,88
         Q 597,112 588,114
         Q 450,116 290,113
         Q 140,110 12,115
         Q 4,114.5 5,106
         Q 8,65 4,32
         Q 3,12 6,8
         Q 7,6 12,6 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);
