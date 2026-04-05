import { useState, useEffect, useCallback } from 'react';
import type { PageRoute } from './types';
import { getAllMaps, getAllCollections, initPresetMaps, exportCollections, cleanupLinkedStars } from './db';
import { presetMaps } from './data/presets';
import HomePage from './pages/HomePage';
import TreasureMapListPage from './pages/TreasureMapListPage';
import TreasureMapDetailPage from './pages/TreasureMapDetailPage';
import CollectPage from './pages/CollectPage';
import VaultListPage from './pages/VaultListPage';
import VaultDetailPage from './pages/VaultDetailPage';
import FeelImpossiblePage from './pages/FeelImpossiblePage';

function App() {
  const [route, setRoute] = useState<PageRoute>({ page: 'home' });
  const [ready, setReady] = useState(false);
  const [mapCount, setMapCount] = useState(0);
  const [collectionCount, setCollectionCount] = useState(0);

  const refreshCounts = useCallback(async () => {
    const maps = await getAllMaps();
    const collections = await getAllCollections();
    setMapCount(maps.length);
    setCollectionCount(collections.length);
  }, []);

  useEffect(() => {
    (async () => {
      await initPresetMaps(presetMaps);
      await cleanupLinkedStars();
      await refreshCounts();
      setReady(true);
    })();
  }, [refreshCounts]);

  const navigate = useCallback((newRoute: PageRoute) => {
    setRoute(newRoute);
    refreshCounts();
    window.scrollTo(0, 0);
  }, [refreshCounts]);

  const handleExport = useCallback(async () => {
    const collections = await exportCollections();
    const blob = new Blob([JSON.stringify({
      exportVersion: '1.2',
      exportDate: new Date().toISOString(),
      collections,
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '藏宝阁-导出.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  if (!ready) {
    return (
      <div className="app-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: 'var(--text-hint)', fontSize: 14 }}>加载中...</div>
      </div>
    );
  }

  switch (route.page) {
    case 'home':
      return <HomePage onNavigate={navigate} mapCount={mapCount} collectionCount={collectionCount} onExport={handleExport} />;
    case 'treasure-map-list':
      return <TreasureMapListPage onNavigate={navigate} />;
    case 'treasure-map-detail':
      return <TreasureMapDetailPage mapId={route.mapId} chapterId={route.chapterId} onNavigate={navigate} />;
    case 'collect':
      return <CollectPage onNavigate={navigate} />;
    case 'vault-list':
      return <VaultListPage onNavigate={navigate} />;
    case 'vault-detail':
      return <VaultDetailPage collectionId={route.collectionId} onNavigate={navigate} />;
    case 'feel-impossible':
      return <FeelImpossiblePage onNavigate={navigate} />;
    default:
      return <HomePage onNavigate={navigate} mapCount={mapCount} collectionCount={collectionCount} onExport={handleExport} />;
  }
}

export default App;
