const tintColorLight = "#C9A84C";

export default {
  light: {
    text: "#E8DCC8",
    background: "#0D0A14",
    tint: tintColorLight,
    tabIconDefault: "#4A3F5C",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#E8DCC8",
    background: "#0D0A14",
    tint: tintColorLight,
    tabIconDefault: "#4A3F5C",
    tabIconSelected: tintColorLight,
  },
  game: {
    // Base surfaces
    background: "#0B0710",
    backgroundDeep: "#070409",
    surface: "#181122",
    surfaceAlt: "#221733",
    surfaceHi: "#2C1F40",
    border: "#3A2A52",

    // Gold / metal
    gold: "#C9A84C",
    goldLight: "#F0D070",
    goldBright: "#FFE9A0",
    goldDark: "#8A6D2E",
    goldDeep: "#5C4518",
    silver: "#A0A8B8",

    // Gem accents
    red: "#C53A36",
    redLight: "#F06A5A",
    green: "#4CAF70",
    greenLight: "#6FD090",
    blue: "#3E7FD0",
    blueLight: "#65B3F0",
    purple: "#8B5CF0",
    purpleLight: "#B89CF5",
    ember: "#FF7A3C",
    emberLight: "#FFB060",

    // Text
    text: "#F2E6CF",
    textDim: "#A493B8",
    textMuted: "#6A5880",
    disabled: "#2E2248",
  },
  // Gradient stops for gem bars, buttons, and frames
  grad: {
    gold: ["#FFE9A0", "#D9B24E", "#9A7726"] as const,
    goldButton: ["#E9C766", "#C29433", "#8A6420"] as const,
    ruby: ["#F0584A", "#C5302C", "#7E1A18"] as const,
    sapphire: ["#6FC0F5", "#3E7FD0", "#1E4A8C"] as const,
    emerald: ["#7FE0A0", "#3FAE68", "#1E6E3E"] as const,
    amethyst: ["#C7A8F8", "#8B5CF0", "#5A2EAE"] as const,
    ember: ["#FFC074", "#FF7A3C", "#C24A12"] as const,
    panel: ["#221733", "#150E22"] as const,
    panelHi: ["#2E2142", "#1A1228"] as const,
    glow: ["rgba(201,168,76,0.22)", "rgba(201,168,76,0)"] as const,
    danger: ["#E0524C", "#A52521"] as const,
    dark: ["#1B1328", "#0C0814"] as const,
  },
};
