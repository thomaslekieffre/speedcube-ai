import { useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { BackToTop } from '@/components/ui/BackToTop';
import { ChatAssistant } from '@/components/ChatAssistant';
import { CommandPaletteContext, useCommandPaletteState } from '@/hooks/useCommandPalette';
import { useEffect } from 'react';

export function Layout() {
  const location = useLocation();
  const cmdPalette = useCommandPaletteState();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <CommandPaletteContext.Provider value={cmdPalette}>
      <div className="min-h-screen bg-background relative bg-grid">
        <Sidebar />
        <div className="lg:pl-60 transition-all duration-300">
          <Header />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{
                  duration: 0.3,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
          <Footer />
        </div>
        <BackToTop />
        <ChatAssistant />
        <CommandPalette />
      </div>
    </CommandPaletteContext.Provider>
  );
}
