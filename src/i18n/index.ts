import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enAlgorithms from './locales/en/algorithms.json';
import enMethods from './locales/en/methods.json';
import enHardware from './locales/en/hardware.json';
import enRecords from './locales/en/records.json';
import enTips from './locales/en/tips.json';
import enGlossary from './locales/en/glossary.json';
import enLearning from './locales/en/learning.json';
import enData from './locales/en/data.json';

import frCommon from './locales/fr/common.json';
import frDashboard from './locales/fr/dashboard.json';
import frAlgorithms from './locales/fr/algorithms.json';
import frMethods from './locales/fr/methods.json';
import frHardware from './locales/fr/hardware.json';
import frRecords from './locales/fr/records.json';
import frTips from './locales/fr/tips.json';
import frGlossary from './locales/fr/glossary.json';
import frLearning from './locales/fr/learning.json';
import frData from './locales/fr/data.json';

const savedLang = localStorage.getItem('speedcube-lang');
const browserLang = navigator.language.startsWith('fr') ? 'fr' : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      dashboard: enDashboard,
      algorithms: enAlgorithms,
      methods: enMethods,
      hardware: enHardware,
      records: enRecords,
      tips: enTips,
      glossary: enGlossary,
      learning: enLearning,
      data: enData,
    },
    fr: {
      common: frCommon,
      dashboard: frDashboard,
      algorithms: frAlgorithms,
      methods: frMethods,
      hardware: frHardware,
      records: frRecords,
      tips: frTips,
      glossary: frGlossary,
      learning: frLearning,
      data: frData,
    },
  },
  lng: savedLang || browserLang,
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('speedcube-lang', lng);
  document.documentElement.lang = lng;
});

export default i18n;
