"use client";

import { useTheme } from "@/context/ThemeProvider";
import Image from "next/image";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
  variant?: "auto" | "light" | "dark"; // Add variant prop
}

export function Logo({ className = "", width = 150, height = 40, alt = "ForgeFit Logo", variant = "auto" }: LogoProps) {
  const { theme } = useTheme();
  
  // Force logo update for footer
  let src: string;
  if (variant === "light") {
    src = "/images/Logo/forgefit-logo-orange.png";
  } else if (variant === "dark") {
    src = "/images/Logo/forgefit-logo-white.png";
  } else {
    // auto mode - use theme
    src = theme === "dark"
      ? "/images/Logo/forgefit-logo-white.png"
      : "/images/Logo/forgefit-logo-orange.png";
  }
  
  // Debug logging for footer logo
  if (typeof window !== 'undefined' && variant === "dark") {
    console.log("Footer logo should use white:", src);
  }
  
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
