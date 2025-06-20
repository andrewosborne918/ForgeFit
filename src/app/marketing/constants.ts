import { Cpu, Sparkles, Target, TrendingUp, Users, Zap } from "lucide-react";

export const HOW_IT_WORKS = [
  { 
    icon: Target, 
    step: "1", 
    title: "Tell us your goals", 
    description: "Share your fitness objectives, preferred schedule, and any equipment you have available to you." 
  },
  { 
    icon: Cpu, 
    step: "2", 
    title: "AI creates your workouts", 
    description: "Our intelligent system instantly crafts a personalized workout plan tailored specifically for you." 
  },
  { 
    icon: TrendingUp, 
    step: "3", 
    title: "Track progress & stay consistent", 
    description: "Follow your plan, log your workouts, monitor your progress, and watch as your plan adapts with you." 
  }
] as const;

export const BENEFITS = [
  { 
    icon: Users, 
    title: "Built for Busy People", 
    description: "Flexible plans that adapt to your schedule, no matter how packed. Fitness that fits your life." 
  },
  { 
    icon: Zap, 
    title: "AI-Powered Precision", 
    description: "Leveraging Google Gemini for smarter, more adaptive, and effective workout plans." 
  },
  { 
    icon: Sparkles, 
    title: "Progressive & Adaptive", 
    description: "Each new plan is uniquely generated using your preferences — keeping your workouts fresh, challenging, and never repetitive." 
  }
] as const;
