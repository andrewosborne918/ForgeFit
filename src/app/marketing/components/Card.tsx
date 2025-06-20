import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";

export interface CardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  step?: string;
  className?: string;
  children?: ReactNode;
  variants?: Variants;
  initial?: string;
  animate?: string;
  whileHover?: any;
  whileTap?: any;
}

export const Card = ({
  icon: Icon,
  title,
  description,
  step,
  className = "",
  children,
  variants,
  initial,
  animate,
  whileHover,
  whileTap,
  ...props
}: CardProps) => (
  <motion.div
    className={`p-6 sm:p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 ${className}`}
    variants={variants}
    initial={initial}
    animate={animate}
    whileHover={whileHover}
    whileTap={whileTap}
    {...props}
  >
    <div className="flex flex-col items-center text-center">
      <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-full mb-4">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      {step && <p className="text-3xl font-bold text-primary mb-3">{step}</p>}
      <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground dark:text-slate-400 leading-relaxed">
        {description}
      </p>
      {children}
    </div>
  </motion.div>
);
