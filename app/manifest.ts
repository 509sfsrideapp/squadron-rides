import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "509 SFS Rides",
    short_name: "SFS Rides",
    description: "Request and manage squadron rides from any device.",
    start_url: "/",
    display: "standalone",
    background_color: "#08111d",
    theme_color: "#08111d",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
