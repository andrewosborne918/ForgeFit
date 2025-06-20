import { Variants } from "framer-motion";

interface AnimationVariants {
  SECTION: Variants;
  ITEM: Variants;
  CARD: {
    hover: { [key: string]: any };
    tap: { [key: string]: any };
  };
  STAGGER: Variants;
}

export const ANIMATION: AnimationVariants = {
  SECTION: {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.6, 
        ease: "easeOut" 
      } 
    },
  },
  ITEM: {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.5, 
        ease: "easeOut" 
      } 
    },
  },
  CARD: {
    hover: { 
      scale: 1.03, 
      y: -5, 
      transition: { 
        duration: 0.2 
      } 
    },
    tap: { 
      scale: 0.98 
    },
  },
  STAGGER: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { 
        staggerChildren: 0.15, 
        delayChildren: 0.2 
      },
    },
  },
};
