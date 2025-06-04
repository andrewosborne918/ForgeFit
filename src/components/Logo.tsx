"use client";

import { useTheme } from "@/context/ThemeProvider";
import Image from "next/image";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
}

export function Logo({ className = "", width = 150, height = 40, alt = "ForgeFit Logo" }: LogoProps) {
  const { theme } = useTheme();
  const src = theme === "dark"
    ? "/images/Logo/forgefit-logo-white.png"
    : "/images/Logo/forgefit-logo-orange.png";
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
