import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: 40, background: "#665df2", color: "white", fontFamily: "Arial, sans-serif",
      fontSize: 44, fontWeight: 800, letterSpacing: -3,
    }}>RSCJ</div>,
    size,
  );
}
