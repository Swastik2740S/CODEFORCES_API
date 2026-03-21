"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  BarChart3, 
  Activity, 
  Target, 
  LayoutGrid, 
  PieChart, 
  TrendingUp,
  GitCommit,
  Zap
} from "lucide-react";

export default function HomePage() {
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <>
      {/* Inline style for the custom shimmer effect so it works without config changes */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />

      <div className="min-h-screen bg-[#111111] text-gray-300 font-sans overflow-hidden selection:bg-[#D85D3F]/30 relative">
        
        {/* Subtle Ambient Glass Background Glow */}
        <div className="absolute top-[-5%] left-[-10%] w-[300px] md:w-[40%] h-[300px] md:h-[40%] bg-[#D85D3F]/10 blur-[100px] md:blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-5%] right-[-10%] w-[300px] md:w-[40%] h-[300px] md:h-[40%] bg-[#D85D3F]/5 blur-[100px] md:blur-[120px] rounded-full pointer-events-none" />

        {/* Navbar */}
        <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#111111]/70 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white/5 p-1.5 rounded-lg border border-white/10 backdrop-blur-md shadow-sm">
                <LayoutGrid size={18} strokeWidth={2.5} className="text-[#D85D3F]" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">Tracker.</span>
            </div>
            {/* GLASS BUTTON: Navbar Sign In */}
            <Link 
              href="/auth" 
              className="text-sm font-medium text-white bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all px-4 sm:px-5 py-2 rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.03)] hover:shadow-[0_0_20px_rgba(255,255,255,0.08)]"
            >
              Sign In
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-16 lg:pt-48 lg:pb-32 relative z-10">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col items-center text-center max-w-4xl mx-auto"
          >
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D85D3F]/10 border border-[#D85D3F]/30 backdrop-blur-md text-[#D85D3F] text-xs sm:text-sm font-medium mb-8 shadow-[0_0_20px_rgba(216,93,63,0.15)]">
              <Activity size={14} className="animate-pulse" />
              <span>Real-time Codeforces Syncing</span>
            </motion.div>
            
            <motion.h1 variants={fadeIn} className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white tracking-tight mb-6 font-serif leading-[1.1]">
              Master your competitive <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D85D3F] to-[#f48a6f]">programming journey.</span>
            </motion.h1>
            
            <motion.p variants={fadeIn} className="text-base sm:text-lg lg:text-xl text-gray-400 mb-10 max-w-2xl leading-relaxed px-4 sm:px-0">
              A full-stack analytics platform that tracks your performance, visualizes rating history, and provides deep insights into your problem-solving habits.
            </motion.p>
            
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0">
              {/* PRIMARY GLASS BUTTON with Shimmer */}
              <Link 
                href="/auth"
                className="group relative overflow-hidden flex items-center justify-center gap-2 bg-[#D85D3F] border border-[#D85D3F]/50 text-white px-8 py-3.5 rounded-xl font-medium hover:bg-[#eb6545] transition-all duration-300 shadow-[0_0_20px_rgba(216,93,63,0.3)] hover:shadow-[0_0_30px_rgba(216,93,63,0.5)] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform" />
                <span className="relative z-10 flex items-center gap-2">
                  Get Started
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
              
              {/* SECONDARY GLASS BUTTON */}
              <a 
                href="#features"
                className="flex items-center justify-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 text-white px-8 py-3.5 rounded-xl font-medium hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-sm active:scale-[0.98]"
              >
                Explore Features
              </a>
            </motion.div>
          </motion.div>

          {/* Dashboard Preview / Glass Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="mt-16 sm:mt-24 relative mx-auto max-w-5xl rounded-3xl p-1.5 sm:p-2 bg-gradient-to-b from-white/10 to-transparent border border-white/5"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl rounded-3xl z-[-1]"></div>
            
            {/* Mockup Content */}
            <div className="bg-[#1A1A1A]/60 backdrop-blur-2xl rounded-2xl border border-white/10 p-5 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] overflow-hidden relative">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 sm:mb-12 gap-6 md:gap-0">
                <div>
                  <h2 className="text-white text-2xl sm:text-3xl font-serif mb-1 sm:mb-2">Overview</h2>
                  <p className="text-gray-500 text-xs sm:text-sm">Welcome back • Updated just now</p>
                </div>
                
                {/* Responsive Stats Grid */}
                <div className="grid grid-cols-2 md:flex md:flex-wrap gap-4 sm:gap-8 md:gap-12 w-full md:w-auto">
                  <div className="bg-white/5 md:bg-transparent p-3 md:p-0 rounded-lg border border-white/5 md:border-none">
                    <p className="text-gray-500 text-[10px] sm:text-xs tracking-widest font-semibold mb-1 sm:mb-2 uppercase">Current Rating</p>
                    <p className="text-white text-2xl sm:text-4xl font-serif">870</p>
                  </div>
                  <div className="bg-white/5 md:bg-transparent p-3 md:p-0 rounded-lg border border-white/5 md:border-none">
                    <p className="text-gray-500 text-[10px] sm:text-xs tracking-widest font-semibold mb-1 sm:mb-2 uppercase">Problems</p>
                    <p className="text-white text-2xl sm:text-4xl font-serif">40 <span className="text-emerald-500 text-[10px] sm:text-sm ml-1 block sm:inline">+2 today</span></p>
                  </div>
                  <div className="col-span-2 md:col-span-1 bg-white/5 md:bg-transparent p-3 md:p-0 rounded-lg border border-white/5 md:border-none">
                    <p className="text-gray-500 text-[10px] sm:text-xs tracking-widest font-semibold mb-1 sm:mb-2 uppercase">Global Rank</p>
                    <p className="text-[#D85D3F] md:text-white text-2xl sm:text-4xl font-serif capitalize">newbie</p>
                  </div>
                </div>
              </div>
              
              {/* Fake Chart Area */}
              <div className="h-32 sm:h-48 w-full border-t border-b border-white/10 relative flex items-center mt-4 sm:mt-0">
                 <div className="absolute inset-0 bg-gradient-to-r from-[#D85D3F]/0 via-[#D85D3F]/10 to-[#D85D3F]/0"></div>
                 <svg className="w-full h-full drop-shadow-[0_0_10px_rgba(216,93,63,0.5)]" preserveAspectRatio="none" viewBox="0 0 100 100">
                   <path d="M0,80 L20,70 L40,75 L60,40 L80,30 L100,10" fill="none" stroke="#D85D3F" strokeWidth="2" />
                 </svg>
              </div>
            </div>
          </motion.div>
        </main>

        {/* Features Grid */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 relative z-10">
          <div className="text-center mb-12 sm:mb-16 px-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 tracking-tight">Deep Analytics Engine</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">Everything you need to analyze your weaknesses and track your improvement, powered by a robust backend worker.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <FeatureCard 
              icon={<Activity />}
              title="Activity Heatmap"
              description="GitHub-style contribution heatmap showing your daily submissions and consistency."
              delay={0.1}
            />
            <FeatureCard 
              icon={<TrendingUp />}
              title="Rating Progression"
              description="Interactive area charts with CF rank threshold lines mapping your entire journey."
              delay={0.2}
            />
            <FeatureCard 
              icon={<PieChart />}
              title="Verdict Breakdown"
              description="Detailed visualization of your AC, WA, TLE, and RE distributions to spot patterns."
              delay={0.3}
            />
            <FeatureCard 
              icon={<Target />}
              title="Tag Mastery"
              description="Track per-tag stats including success rate and average difficulty to find weak spots."
              delay={0.4}
            />
            <FeatureCard 
              icon={<BarChart3 />}
              title="Attempts Analysis"
              description="Analyze your acceptance rate and the average attempts it takes you to solve a problem."
              delay={0.5}
            />
            <FeatureCard 
              icon={<GitCommit />}
              title="Background Sync"
              description="Continuous data syncing respecting CF API rate limits, keeping your dashboard lightning fast."
              delay={0.6}
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-8 mt-4 relative z-10 bg-[#111111]">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm text-gray-500 gap-4 sm:gap-0">
            <p>© {new Date().getFullYear()} Tracker. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
                <Zap size={14} className="text-[#D85D3F]"/> 
                Sub-100ms load times
              </span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

// Reusable Feature Card Component with Scroll Animations
function FeatureCard({ icon, title, description, delay }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: delay }}
      className="bg-white/[0.03] backdrop-blur-xl border border-white/5 p-6 sm:p-8 rounded-3xl hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 group shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(216,93,63,0.1)]"
    >
      <div className="bg-white/5 border border-white/10 w-12 h-12 rounded-xl flex items-center justify-center text-[#D85D3F] mb-6 group-hover:scale-110 group-hover:bg-[#D85D3F] group-hover:text-white group-hover:shadow-[0_0_20px_rgba(216,93,63,0.4)] transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-white font-medium text-lg mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}