import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const flags: Record<string, string> = {
  fr: 'FR',
  en: 'EN',
};

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common');
  const lang = i18n.language;
  const isEn = lang === 'en';

  const toggle = () => {
    const next = isEn ? 'fr' : 'en';
    i18n.changeLanguage(next);
    toast.success(t('lang.switched', { lng: next }));
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-[var(--color-overlay-hover)] transition-colors cursor-pointer"
      aria-label="Switch language"
    >
      <motion.div
        key={lang}
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="flex items-center gap-1.5"
      >
        <img
          src={isEn
            ? 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30"><clipPath id="s"><rect width="60" height="30"/></clipPath><clipPath id="t"><polygon points="30,15 60,0 60,30 0,30 0,0"/></clipPath><g clip-path="url(%23s)"><rect width="60" height="30" fill="%23012169"/><path d="M0,0 60,30M60,0 0,30" stroke="%23fff" stroke-width="6"/><path d="M0,0 60,30M60,0 0,30" clip-path="url(%23t)" stroke="%23C8102E" stroke-width="4"/><path d="M30,0v30M0,15h60" stroke="%23fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="%23C8102E" stroke-width="6"/></g></svg>'
            : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="1" height="2" fill="%23002395"/><rect x="1" width="1" height="2" fill="%23fff"/><rect x="2" width="1" height="2" fill="%23ED2939"/></svg>'
          }
          alt={isEn ? 'English' : 'Français'}
          className="w-4 h-3 rounded-[2px] object-cover"
        />
        <span className="uppercase font-semibold">{flags[lang]}</span>
      </motion.div>
    </motion.button>
  );
}
