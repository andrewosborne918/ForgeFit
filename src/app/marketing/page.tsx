// src/app/marketing/page.tsx
"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, Cpu, Users, TrendingUp, CheckCircle2, Zap, Target } from "lucide-react"
import { motion } from "framer-motion"
import { MarketingNavbar } from "@/components/MarketingNavbar" // Added MarketingNavbar import
import { Logo } from "@/components/Logo"

// Animation variants for sections and items
const sectionVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
}

const cardHoverVariants = {
  hover: { scale: 1.03, y: -5, transition: { duration: 0.2 } }, // Adjusted hover effect
  tap: { scale: 0.98 },
}

const staggeredContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // Adjusted stagger speed
      delayChildren: 0.2,
    },
  },
};

export default function MarketingPage() {
  return (
    <div className="text-slate-800 dark:text-slate-200 scroll-smooth min-h-screen">
      <MarketingNavbar />
      {/* Hero Section */}
      <section
        className="relative min-h-screen flex items-center justify-center text-center bg-fixed bg-center bg-cover" // Removed pt-[60px] and -mt-[60px]
        style={{ backgroundImage: 'url(/images/forge_gym2.jpg)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />
        <motion.div
          className="z-10 px-4 sm:px-6 max-w-3xl mx-auto pt-[60px]" // Add padding only to content, not section
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.3 } },
          }}
        >
          <motion.h1
            className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight"
            variants={itemVariants}
          >
            Forge Your Best Body <span className="text-orange-500">with AI-Crafted Workouts</span>
          </motion.h1>
          <motion.p
            className="text-slate-200 mt-6 text-lg md:text-xl max-w-xl mx-auto"
            variants={itemVariants}
          >
            Generate up to <span className="font-bold text-orange-400">3 free workouts</span> — no credit card required. Personalized plans in seconds. Stop guessing, start forging.
          </motion.p>
          <motion.div
            className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4"
            variants={staggeredContainerVariants}
          >
            <motion.div variants={itemVariants}>
              <Link href="/auth/signup">
                <Button size="lg" className="px-8 py-3 text-lg font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-xs">
                  Generate Free Workouts
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <motion.section
        id="how-it-works" // Added ID for navigation
        className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-900 text-center px-4 sm:px-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <h2 className="text-3xl sm:text-4xl font-bold mb-5 text-slate-900 dark:text-white">How It Works</h2>
        <p className="text-muted-foreground dark:text-slate-400 mb-12 sm:mb-16 text-lg max-w-2xl mx-auto">
          Get started on your fitness journey with ForgeFit in three simple steps.
        </p>
        <motion.div
          className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          variants={staggeredContainerVariants}
        >
          {[ // Updated content and icons
            { icon: Target, step: "1", title: "Tell us your goals", desc: "Share your fitness objectives, preferred schedule, and any equipment you have available to you." },
            { icon: Cpu, step: "2", title: "AI creates your workouts", desc: "Our intelligent system instantly crafts a personalized workout plan tailored specifically for you." },
            { icon: TrendingUp, step: "3", title: "Track progress & stay consistent", desc: "Follow your plan, log your workouts, monitor your progress, and watch as your plan adapts with you." }
          ].map(({ icon: Icon, step, title, desc }) => (
            <motion.div
              key={step}
              className="p-6 sm:p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300"
              variants={itemVariants}
              whileHover={cardHoverVariants.hover}
              whileTap={cardHoverVariants.tap}
            >
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-full">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-primary mb-3">{step}</p>
              <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">{title}</h3>
              <p className="text-sm text-muted-foreground dark:text-slate-400 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Why Choose ForgeFit Section */}
      <motion.section
        id="features" // Changed ID to features for navigation
        className="bg-slate-900 dark:bg-black text-white py-16 sm:py-24 px-4 sm:px-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 sm:mb-16">Why Choose ForgeFit?</h2>
        <motion.ul
          className="max-w-2xl mx-auto space-y-8" // Changed to ul and adjusted layout
          variants={staggeredContainerVariants}
        >
          {[
            { icon: Users, title: "Built for Busy People", desc: "Flexible plans that adapt to your schedule, no matter how packed. Fitness that fits your life." },
            { icon: Zap, title: "AI-Powered Precision", desc: "Leveraging Google Gemini for smarter, more adaptive, and effective workout plans." },
            { icon: Sparkles, title: "Progressive & Adaptive", desc: "Each new plan is uniquely generated using your preferences — keeping your workouts fresh, challenging, and never repetitive." }
          ].map(({ icon: Icon, title, desc }) => (
            <motion.li
              key={title}
              className="flex items-start gap-4 p-6 bg-slate-800 dark:bg-slate-800/50 rounded-lg shadow-md hover:bg-slate-700/80 transition-colors duration-300" // List item styling
              variants={itemVariants}
              whileHover={cardHoverVariants.hover}
              whileTap={cardHoverVariants.tap}
            >
              <div className="flex-shrink-0 p-2 bg-primary/20 rounded-full mt-1">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1 text-white">{title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{desc}</p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </motion.section>

      {/* Powerful Features Section (Combined with previous Features) */}
      <motion.section
        className="bg-white dark:bg-slate-950 py-16 sm:py-24 px-4 sm:px-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 sm:mb-16 text-slate-900 dark:text-white">Everything You Need to Succeed</h2>
        <motion.div
          className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center"
          variants={staggeredContainerVariants}
        >
          <motion.div variants={itemVariants} className="text-center md:text-left">
            <Image src="/images/ai_workouts.jpg" alt="AI Workouts" width={600} height={450} className="rounded-xl shadow-xl mx-auto md:mx-0" /> {/* Corrected AI workout image path */}
          </motion.div>
          <motion.div variants={itemVariants} className="text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-semibold mt-4 md:mt-0 mb-3 text-slate-900 dark:text-white">AI-Generated Workouts</h3>
            <p className="text-lg text-muted-foreground dark:text-slate-400 leading-relaxed">
              Receive workout plans uniquely created for your specific goals, available time, accessed equipment, and current fitness level. Our AI ensures every session is optimized for you.
            </p>
          </motion.div>

          {/* Second Feature - Right Aligned Image */}
          <motion.div variants={itemVariants} className="text-center md:text-left md:order-2">
            <Image src="/images/progress_tracking.jpg" alt="Progress Tracking" width={600} height={450} className="rounded-xl shadow-xl mx-auto md:mx-0" /> {/* Corrected progress tracking image path */}
          </motion.div>
          <motion.div variants={itemVariants} className="text-center md:text-left md:order-1">
            <h3 className="text-2xl sm:text-3xl font-semibold mt-4 md:mt-0 mb-3 text-slate-900 dark:text-white">Progress Tracking</h3>
            <p className="text-lg text-muted-foreground dark:text-slate-400 leading-relaxed">
              Log your completed sessions, visualize your weekly statistics, and stay motivated by seeing your improvements over time with our intuitive tracking tools.
            </p>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Pricing Section */}
      <motion.section
        id="pricing"
        className="bg-slate-900 dark:bg-black text-white py-16 sm:py-24 px-4 sm:px-6 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <h2 className="text-3xl sm:text-4xl font-bold mb-5">Simple, Transparent Pricing</h2>
        <p className="text-slate-300 dark:text-slate-400 mb-12 sm:mb-16 text-lg max-w-2xl mx-auto">
          Generate up to <span className="font-bold text-orange-400">3 workouts for free</span>. After that, unlock unlimited plans and all features with a single subscription.
        </p>
        <motion.div
          className="bg-slate-800 dark:bg-slate-800/50 max-w-lg mx-auto mt-10 rounded-xl p-8 sm:p-10 shadow-2xl border border-primary/50"
          variants={itemVariants}
          whileHover={{ scale: 1.02, boxShadow: "0px 0px 30px rgba(255,121,0,0.5)", transition: { duration: 0.3 } }}
        >
          <h3 className="text-2xl font-semibold text-white">Premium Plan</h3>
          <p className="text-5xl font-extrabold mt-4 mb-2 text-orange-500">
            $9.99 <span className="text-lg font-medium text-slate-400">/month</span>
          </p>
          <p className="text-sm text-slate-400 mb-8">Billed monthly. Unlock all features after your first 3 free workouts.</p>
          <ul className="text-left mt-6 space-y-3 text-slate-200 dark:text-slate-300">
            {[ // Updated features
              "Unlimited AI-generated workout plans",
              "Personalized to your goals & equipment",
              "Detailed progress tracking & analytics",
              "Full exercise library access with instructions",
              "Weekly workout schedule",
              "Priority support"
            ].map((feature, i) => (
              <motion.li
                key={i}
                className="flex items-center"
                custom={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0, transition: { delay: i * 0.1 + 0.3, duration: 0.4 } }}
              >
                <CheckCircle2 className="h-5 w-5 text-orange-500 dark:text-orange-400 mr-3 shrink-0" />
                {feature}
              </motion.li>
            ))}
          </ul>
          {/* PRICING SECTION BUTTON */}
          <Link href="/auth/signup" className="block mt-10">
            <Button className="px-8 py-3 text-lg font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-xs mt-6 w-full">
              Upgrade Now
            </Button>
          </Link>
          <p className="text-xs text-slate-500 mt-4">No commitment. Cancel anytime.</p>
        </motion.div>
      </motion.section>

      {/* About Section */}
      {/* ABOUT FORGEFIT SECTION */}
      <motion.section
        id="about" // Added ID for navigation
        className="py-16 px-4 bg-orange-500/90"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">About ForgeFit</h2>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            {/* Card 1 */}
            <div className="bg-orange-100/90 rounded-xl shadow-lg p-6 text-slate-800">
              <h3 className="font-semibold text-xl mb-2">Our Mission</h3>
              <p className="text-sm leading-relaxed">
                To empower everyone to achieve their fitness goals with personalized, AI-powered workout plans and modern, accessible tools.
              </p>
              <br/>
              <h3 className="font-semibold text-xl mb-2">Why ForgeFit?</h3>
              <p className="text-sm leading-relaxed">
                We believe fitness can be smarter and more intuitive — seamlessly integrated into your schedule, perfectly aligned with your goals, and responsive to your preferences.
              </p>
              <br/>
              <h3 className="font-semibold text-xl mb-2">Our Vision</h3>
              <p className="text-sm leading-relaxed">
                A world where everyone can access intelligent fitness guidance, regardless of experience or background. ForgeFit is your dedicated partner on that journey to a healthier, stronger life.
              </p>
            </div>

          </div>
        </div>
      </motion.section>

      {/* Testimonials Section */}
      <motion.section
        className="bg-slate-50 dark:bg-slate-900 py-16 sm:py-24 px-4 sm:px-6 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={sectionVariants}
      >
        <h2 className="text-3xl sm:text-4xl font-bold mb-12 sm:mb-16 text-slate-900 dark:text-white">What Our Users Say</h2>
        <motion.div
          className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          variants={staggeredContainerVariants}
        >
          {[ // Updated testimonials
            { quote: "ForgeFit made it easy to stay consistent and feel supported. The AI plans are spot on and actually work for my crazy schedule!", user: "Sarah L.", role: "Busy Professional" },
            { quote: "Finally, a fitness app that understands my goals and pushes me just right. Love the variety and the adaptive workouts.", user: "Mike P.", role: "Fitness Enthusiast" },
            { quote: "The progress tracking is super motivating. Seeing my improvements in black and white (and orange!) keeps me coming back for more.", user: "Jessica B.", role: "New to Fitness" }
          ].map(({ quote, user, role }, i) => (
            <motion.div
              key={i}
              className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-xl flex flex-col items-center text-center h-full hover:shadow-2xl transition-shadow duration-300"
              variants={itemVariants}
              whileHover={cardHoverVariants.hover}
            >
              {/* Placeholder for avatar image - assuming you might add these later */}
              {/* <Image src={`/images/avatars/avatar${i+1}.png`} alt={user} width={70} height={70} className="rounded-full mb-5 border-2 border-primary shadow-sm" /> */}
              <p className="text-lg text-slate-700 dark:text-slate-300 mb-6 italic leading-relaxed flex-grow">“{quote}”</p>
              <div>
                <p className="text-md font-semibold text-primary">{user}</p>
                <p className="text-sm text-muted-foreground dark:text-slate-400">{role}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Final CTA Section */}
      <motion.section
        className="bg-slate-900 dark:bg-black text-center py-20 sm:py-28 px-4 sm:px-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={sectionVariants}
      >
        <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">Ready to Transform Your Fitness?</h2>
        <p className="text-lg sm:text-xl text-slate-300 dark:text-slate-400 mt-5 mb-10 max-w-xl mx-auto">
          Join thousands of users who are already achieving their fitness goals with ForgeFit. Your first 3 workouts are free — see the difference for yourself!
        </p>
        <motion.div
          whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.95 }}
        >
          <Link href="/auth/signup">
            <Button size="lg" className="px-10 py-4 text-xl font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-xs">
              Generate Free Workouts
            </Button>
          </Link>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-12 sm:py-16 px-4 sm:px-6 text-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-left">
          <div>
            <Link href="/marketing" className="flex items-center gap-2 mb-3">
              <Logo width={150} height={36} className="" alt="ForgeFit Logo" />
            </Link>
            <p className="text-muted-foreground dark:text-slate-400">AI-powered fitness for everyone.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-200 text-base mb-4">Product</p>
            <ul className="space-y-2">
              <li><Link href="/marketing#features" className="text-muted-foreground dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">Features</Link></li>
              <li><Link href="/marketing#pricing" className="text-muted-foreground dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">Pricing</Link></li>
              {/* <li><Link href="/faq" className="text-muted-foreground dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">FAQ</Link></li> */}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-200 text-base mb-4">Company</p>
            <ul className="space-y-2">
              <li><Link href="/marketing#about" className="text-muted-foreground dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">About Us</Link></li>
              {/* <li><Link href="/blog" className="text-muted-foreground dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">Blog</Link></li> */}
              {/* <li><Link href="/contact" className="text-muted-foreground dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">Contact</Link></li> */}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-200 text-base mb-4">Legal</p>
            <ul className="space-y-2">
              <li><Link href="/terms" className="text-muted-foreground dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-muted-foreground dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <p className="text-center text-muted-foreground dark:text-slate-500 mt-12 text-xs">
          © {new Date().getFullYear()} ForgeFit. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
