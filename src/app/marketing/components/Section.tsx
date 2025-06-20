import { motion } from "framer-motion";
import { ReactNode } from "react";
import { ANIMATION } from "@/lib/animations";

interface SectionProps {
  id?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  [key: string]: any;
}

export const Section = ({
  id,
  title,
  subtitle,
  children,
  className = "",
  ...props
}: SectionProps) => (
  <motion.section
    id={id}
    className={`py-16 sm:py-24 px-4 sm:px-6 ${className}`}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    variants={ANIMATION.SECTION}
    {...props}
  >
    <h2 className="text-3xl sm:text-4xl font-bold text-center mb-5 text-slate-900 dark:text-white">
      {title}
    </h2>
    {subtitle && (
      <p className="text-muted-foreground dark:text-slate-400 mb-12 sm:mb-16 text-lg max-w-2xl mx-auto text-center">
        {subtitle}
      </p>
    )}
    {children}
  </motion.section>
);
