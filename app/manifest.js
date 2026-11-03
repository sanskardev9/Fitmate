export default function manifest() {
  return {
    name: "FitMate",
    short_name: "FitMate",
    description: "Your Fitness. Your Nutrition. Your Progress.",
    start_url: "/home",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#059669",
    icons: [{ src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
  };
}
