import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { Layout } from '@/components/layout';
import Dashboard from '@/pages/Dashboard';

const AlgorithmsPage = lazy(() => import('@/pages/AlgorithmsPage'));
const AlgorithmSetPage = lazy(() => import('@/pages/AlgorithmSetPage'));
const MethodsPage = lazy(() => import('@/pages/MethodsPage'));
const MethodDetailPage = lazy(() => import('@/pages/MethodDetailPage'));
const HardwarePage = lazy(() => import('@/pages/HardwarePage'));
const RecordsPage = lazy(() => import('@/pages/RecordsPage'));
const TipsPage = lazy(() => import('@/pages/TipsPage'));
const GlossaryPage = lazy(() => import('@/pages/GlossaryPage'));
const LearningPage = lazy(() => import('@/pages/LearningPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="algorithms" element={<Suspense><AlgorithmsPage /></Suspense>} />
          <Route path="algorithms/:setId" element={<Suspense><AlgorithmSetPage /></Suspense>} />
          <Route path="methods" element={<Suspense><MethodsPage /></Suspense>} />
          <Route path="methods/:methodId" element={<Suspense><MethodDetailPage /></Suspense>} />
          <Route path="hardware" element={<Suspense><HardwarePage /></Suspense>} />
          <Route path="records" element={<Suspense><RecordsPage /></Suspense>} />
          <Route path="tips" element={<Suspense><TipsPage /></Suspense>} />
          <Route path="glossary" element={<Suspense><GlossaryPage /></Suspense>} />
          <Route path="learning" element={<Suspense><LearningPage /></Suspense>} />
          <Route path="*" element={<Suspense><NotFoundPage /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
