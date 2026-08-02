import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Smart CNC Manager Professional",
    short_name: "Smart CNC",
    description:
      "Gestione professionale di macchine, utensili, manutenzioni e parametri CNC.",
    start_url: "/",
    display: "standalone",
    background_color: "#edf3f8",
    theme_color: "#0d3f77",
    orientation: "any",
    lang: "it-IT",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/smart-cnc-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/smart-cnc-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
