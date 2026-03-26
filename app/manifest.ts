import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Defender One",
    short_name: "Defender One",
    description: "Request and manage squadron rides with Defender One.",
    start_url: "/",
    display: "standalone",
    background_color: "#08111d",
    theme_color: "#08111d",
    icons: [
      {
        src: "/new-logo.jpg",
        sizes: "1024x1024",
        type: "image/jpeg",
      },
      {
        src: "/new-logo.jpg",
        sizes: "1024x1024",
        type: "image/jpeg",
      },
    ],
  };
}
