import { useEffect, useState, useCallback } from 'react';
import type { CollectionItem, PageRoute, ArtDomain } from '../types';
import { DOMAIN_LABELS, DOMAIN_COLORS } from '../types';
import { getAllCollections, importCollectionsWithDedupe } from '../db';
import db from '../db';

interface Props {
  onNavigate: (route: PageRoute) => void;
}

const DOMAINS: (ArtDomain | 'all')[] = [
  'all', 'music', 'painting', 'sculpture', 'dance', 'literature',
  'flavor', 'film', 'synesthesia', 'sports',
];

const SENSORY_KEYS = ['all', 'hearing', 'sight', 'touch', 'smell', 'taste', 'body', 'time'] as const;

const SENSORY_LABELS: Record<string, string> = {
  all: '全部',
  hearing: '听觉',
  sight: '视觉',
  touch: '触觉',
  smell: '嗅觉',
  taste: '味觉',
  body: '体感',
  time: '时间',
};

const SENSORY_COLORS: Record<string, string> = {
  all: 'var(--color-treasure-map)',
  hearing: 'var(--sensory-hearing)',
  sight: 'var(--sensory-sight)',
  touch: 'var(--sensory-touch)',
  smell: 'var(--sensory-smell)',
  taste: 'var(--sensory-taste)',
  body: 'var(--sensory-body)',
  time: 'var(--sensory-time)',
};

export default function VaultListPage({ onNavigate }: Props) {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [domainFilter, setDomainFilter] = useState<ArtDomain | 'all'>('all');
  const [sensoryFilter, setSensoryFilter] = useState<string>('all');

  const loadCollections = useCallback(async () => {
    const all = await getAllCollections();
    setCollections(all);
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const items = Array.isArray(json) ? json : json.collections;
        if (!Array.isArray(items)) {
          alert('导入失败：无效的藏宝阁 JSON 文件');
          return;
        }
        const result = await importCollectionsWithDedupe(items);
        alert(`成功导入 ${result.imported} 条，跳过 ${result.skipped} 条重复记录`);
        await loadCollections();
      } catch {
        alert('导入失败：无效的 JSON 文件');
      }
    };
    input.click();
  };

  const handleExport = async () => {
    const all = await getAllCollections();
    const blob = new Blob([JSON.stringify({
      exportVersion: '1.2',
      exportDate: new Date().toISOString(),
      collections: all,
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '藏宝阁-导出.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = async () => {
    if (!confirm('确定要清空藏宝阁全部数据吗？此操作不可撤销。')) return;
    await db.collections.clear();
    await loadCollections();
  };

  // Filter and sort
  let filtered = collections;
  if (domainFilter !== 'all') {
    filtered = filtered.filter((c) => c.domain === domainFilter);
  }
  if (sensoryFilter !== 'all') {
    filtered = [...filtered].sort((a, b) => {
      const av = a.sensory[sensoryFilter as keyof typeof a.sensory] ?? 0;
      const bv = b.sensory[sensoryFilter as keyof typeof b.sensory] ?? 0;
      return bv - av;
    });
  }

  return (
    <div className="app-page">
      <div className="top-nav">
        <button className="back-btn" onClick={() => onNavigate({ page: 'home' })}>
          ← 返回
        </button>
        <span className="nav-title">藏宝阁</span>
      </div>

      {/* 操作栏 */}
      <div className="vault-actions">
        <button className="btn-action btn-action-primary" onClick={() => onNavigate({ page: 'collect' })}>
          藏品入库
        </button>
        <button className="btn-action btn-action-import" onClick={handleImport}>
          导入
        </button>
        <button className="btn-action btn-action-export" onClick={handleExport}>
          导出
        </button>
        <button className="btn-action btn-action-reset" onClick={handleReset}>
          重置
        </button>
      </div>

      <h2 style={{
        fontFamily: "'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif",
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: 4,
        marginBottom: 4,
      }}>
        藏宝阁
      </h2>
      <div className="page-subtitle">{collections.length} 条藏品</div>

      {/* Domain 筛选 */}
      <div className="filter-row">
        <span className="filter-row-label">分类：</span>
        {DOMAINS.map((d) => {
          const isActive = domainFilter === d;
          const color = d === 'all' ? 'var(--color-treasure-map)' : DOMAIN_COLORS[d];
          return (
            <button
              key={d}
              className={`filter-tab ${isActive ? 'active' : ''}`}
              style={isActive ? { background: color, color: '#fff', borderColor: color } : {}}
              onClick={() => setDomainFilter(d)}
            >
              {d === 'all' ? '全部' : DOMAIN_LABELS[d]}
            </button>
          );
        })}
      </div>

      {/* 感官筛选 */}
      <div className="filter-row">
        <span className="filter-row-label">感官：</span>
        {SENSORY_KEYS.map((key) => {
          const isActive = sensoryFilter === key;
          const color = SENSORY_COLORS[key];
          return (
            <button
              key={key}
              className={`filter-tab ${isActive ? 'active' : ''}`}
              style={isActive ? { background: color, color: '#fff', borderColor: color } : {}}
              onClick={() => setSensoryFilter(key)}
            >
              {SENSORY_LABELS[key]}
            </button>
          );
        })}
      </div>

      {/* 感受不可能入口 */}
      <button className="feel-impossible-entry" onClick={() => onNavigate({ page: 'feel-impossible' })}>
        ✨ 感受不可能
      </button>

      {/* 藏品列表 */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-text">暂无藏品</div>
        </div>
      ) : (
        filtered.map((item) => (
          <div
            key={item.id}
            className={`vault-card ${item.source.type === 'treasure-map' ? 'vault-card-from-map' : 'vault-card-from-free'}`}
            onClick={() => onNavigate({ page: 'vault-detail', collectionId: item.id })}
          >
            <div className="vault-card-dot" style={{ background: DOMAIN_COLORS[item.domain] }} />
            <div className="vault-card-title">{item.title}</div>
            <span className="vault-card-badge" style={{ background: DOMAIN_COLORS[item.domain] }}>
              {DOMAIN_LABELS[item.domain]}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
