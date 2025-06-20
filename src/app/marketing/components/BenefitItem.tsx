import { motion } from "framer-motion";
import { ANIMATION } from "@/lib/animations";

interface BenefitItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export const BenefitItem = ({
  icon: Icon,
  title,
  description,
}: BenefitItemProps) => (
  <motion.li
    className="flex items-start gap-4 p-6 bg-slate-800 dark:bg-slate-800/50 rounded-lg shadow-md hover:bg-slate-700/80 transition-colors duration-300"
    variants={ANIMATION.ITEM}
    whileHover={ANIMATION.CARD.hover}
    whileTap={ANIMATION.CARD.tap}
  >
    <div className="flex-shrink-0 p-2 bg-primary/20 rounded-full mt-1">
      <Icon className="h-6 w-6 text-primary" />
    </div>
    <div>
      <h3 className="text-xl font-semibold mb-1 text-white">{title}</h3>
      <p className="text-sm text-slate-300 leading-relaxed">{description}</p>
    </div>
  </motion.li>
);
