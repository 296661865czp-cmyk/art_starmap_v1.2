import { useEffect, useState, useCallback } from 'react';
import type { PageRoute, SensoryFingerprint, ArtDomain, TreasureItem } from '../types';
import { DOMAIN_LABELS, DOMAIN_COLORS } from '../types';
import { getAllMaps, updateItemAndSubsStatus } from '../db';

interface Props {
  onNavigate: (route: PageRoute) => void;
}

type NullableSensory = {
  [K in keyof SensoryFingerprint]: SensoryLevel | null;
};

type SensoryLevel = 0 | 1 | 2 | 3 | 4;

const SENSORY_DIMENSIONS: { key: keyof SensoryFingerprint; label: string; color: string }[] = [
  { key: 'hearing', label: '听觉', color: 'var(--sensory-hearing)' },
  { key: 'sight', label: '视觉', color: 'var(--sensory-sight)' },
  { key: 'touch', label: '触觉', color: 'var(--sensory-touch)' },
  { key: 'smell', label: '嗅觉', color: 'var(--sensory-smell)' },
  { key: 'taste', label: '味觉', color: 'var(--sensory-taste)' },
  { key: 'body', label: '体感', color: 'var(--sensory-body)' },
  { key: 'time', label: '时间', color: 'var(--sensory-time)' },
];

const LEVEL_LABELS = ['无感', '微弱', '适中', '强烈', '沉浸'];

const SENSORY_DOMAIN_AFFINITY: Record<string, ArtDomain[]> = {
  hearing: ['music'],
  sight: ['painting', 'film'],
  touch: ['sculpture', 'dance'],
  smell: ['flavor'],
  taste: ['flavor'],
  body: ['dance', 'sports'],
  time: ['synesthesia', 'literature'],
};

interface CandidateItem extends TreasureItem {
  _mapName: string;
  _mapId: string;
}

const defaultNullable: NullableSensory = {
  hearing: null, sight: null, touch: null, smell: null, taste: null, body: null, time: null,
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FeelImpossiblePage({ onNavigate }: Props) {
  const [pref, setPref] = useState<NullableSensory>(defaultNullable);
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [similarResults, setSimilarResults] = useState<CandidateItem[]>([]);
  const [contrastResults, setContrastResults] = useState<CandidateItem[]>([]);
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());

  const loadCandidates = useCallback(async () => {
    const allMaps = await getAllMaps();
    const items: CandidateItem[] = [];
    for (const map of allMaps) {
      for (const chapter of map.chapters) {
        for (const item of chapter.items) {
          if (item.exploreStatus !== 'explored') {
            items.push({
              ...item,
              _mapName: map.treasureMap.name,
              _mapId: map.treasureMap.id,
            });
          }
        }
      }
    }
    setCandidates(items);
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  // Compute recommendations whenever pref or candidates change
  useEffect(() => {
    const selectedDims = SENSORY_DIMENSIONS.filter(({ key }) => pref[key] !== null);
    if (selectedDims.length === 0 || candidates.length === 0) {
      setSimilarResults([]);
      setContrastResults([]);
      return;
    }

    // Find dominant dimension(s) — highest selected level
    let maxLevel = 0;
    for (const { key } of selectedDims) {
      if ((pref[key] ?? 0) > maxLevel) maxLevel = pref[key] as number;
    }
    const dominantDims = selectedDims.filter(({ key }) => (pref[key] ?? 0) === maxLevel);

    // Build affinity domain set
    const affinityDomains = new Set<ArtDomain>();
    for (const { key } of dominantDims) {
      for (const d of SENSORY_DOMAIN_AFFINITY[key] ?? []) {
        affinityDomains.add(d);
      }
    }

    const similar: CandidateItem[] = [];
    const contrast: CandidateItem[] = [];
    for (const item of candidates) {
      if (affinityDomains.has(item.domain)) {
        similar.push(item);
      } else {
        contrast.push(item);
      }
    }

    const similarCount = Math.min(Math.max(3, similar.length), 5);
    const contrastCount = Math.min(Math.max(3, contrast.length), 5);

    setSimilarResults(shuffleArray(similar).slice(0, similarCount));
    setContrastResults(shuffleArray(contrast).slice(0, contrastCount));
  }, [pref, candidates]);

  const handleMarkNext = async (item: CandidateItem) => {
    await updateItemAndSubsStatus(item._mapId, item.id, 'next');
    setMarkedIds((prev) => new Set(prev).add(item.id));
  };

  const handleReset = () => {
    setPref(defaultNullable);
    setSimilarResults([]);
    setContrastResults([]);
  };

  const hasSelection = Object.values(pref).some((v) => v !== null);

  const renderCard = (item: CandidateItem, isContrast: boolean) => {
    const isMarked = markedIds.has(item.id) || item.exploreStatus === 'next';

    return (
      <div key={item.id} className="detail-section" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: DOMAIN_COLORS[item.domain],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16, fontWeight: 600, flexShrink: 0,
          }}>
            {item.title.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{item.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-hint)' }}>{item._mapName}</div>
          </div>
          <span className="domain-tag" style={{ background: DOMAIN_COLORS[item.domain] }}>
            {DOMAIN_LABELS[item.domain]}
          </span>
        </div>

        {isContrast && (
          <span style={{
            display: 'inline-block', fontSize: 11, padding: '2px 8px',
            borderRadius: 'var(--border-radius-pill)', background: '#FFF4ED',
            color: '#E87B4A', marginBottom: 8,
          }}>
            反差 ↑
          </span>
        )}

        {item.hints && (
          <div className="item-hints" style={{ marginBottom: 8 }}>{item.hints}</div>
        )}

        {isMarked ? (
          <div style={{
            fontSize: 13, color: 'var(--text-hint)', textAlign: 'center',
            padding: '6px 0',
          }}>
            ✓ 已标记
          </div>
        ) : (
          <button
            className="btn-primary"
            style={{ width: '100%', fontSize: 13, padding: '8px 16px' }}
            onClick={() => handleMarkNext(item)}
          >
            → 标记为下一步
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="app-page">
      <div className="top-nav">
        <button className="back-btn" onClick={() => onNavigate({ page: 'vault-list' })}>
          ← 返回
        </button>
        <span className="nav-title">感受不可能</span>
      </div>

      {/* 感官偏好选择器 */}
      <div className="detail-section" style={{ marginBottom: 20 }}>
        <div className="detail-section-title">选择你的感官偏好</div>
        <div style={{ fontSize: 12, color: 'var(--text-hint)', marginBottom: 12 }}>
          可以只选择你关心的维度
        </div>
        {SENSORY_DIMENSIONS.map(({ key, label, color }) => (
          <div key={key} className="sensory-row">
            <span className="sensory-label" style={{ color }}>{label}</span>
            <div className="sensory-levels">
              {[0, 1, 2, 3, 4].map((level) => (
                <button
                  key={level}
                  className={`sensory-level-btn ${pref[key] === level ? 'active' : ''}`}
                  style={pref[key] === level ? { background: color, borderColor: color, color: '#fff' } : {}}
                  onClick={() => setPref((prev) => ({
                    ...prev,
                    [key]: prev[key] === level ? null : level as SensoryLevel,
                  }))}
                  title={LEVEL_LABELS[level]}
                >
                  {LEVEL_LABELS[level]}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn-outline" style={{ flex: 1 }} onClick={handleReset}>
            重置
          </button>
          <button className="btn-outline" style={{ flex: 1 }} onClick={() => onNavigate({ page: 'vault-list' })}>
            关闭
          </button>
        </div>
      </div>

      {/* 推荐结果 */}
      {hasSelection && candidates.length > 0 && (
        <>
          {similarResults.length > 0 && (
            <>
              <div style={{
                fontSize: 16, fontWeight: 600, marginBottom: 12,
                color: 'var(--text-primary)',
              }}>
                为你推荐：
              </div>
              {similarResults.map((item) => renderCard(item, false))}
            </>
          )}

          {contrastResults.length > 0 && (
            <>
              <div style={{
                fontSize: 16, fontWeight: 600, margin: '20px 0 12px',
                color: 'var(--text-primary)',
              }}>
                反差探索：
              </div>
              {contrastResults.map((item) => renderCard(item, true))}
            </>
          )}
        </>
      )}

      {/* 候选池为空 */}
      {hasSelection && candidates.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">✦</div>
          <div className="empty-state-text" style={{ fontSize: 16, fontWeight: 500 }}>
            所有星图已被点亮 ✦
          </div>
          <div className="empty-state-text" style={{ marginTop: 8 }}>
            导入新的寻宝图，开启新的探索之旅
          </div>
          <button
            className="btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => onNavigate({ page: 'treasure-map-list' })}
          >
            导入寻宝图
          </button>
        </div>
      )}

      {/* 未选择任何维度 */}
      {!hasSelection && (
        <div className="empty-state">
          <div className="empty-state-text">选择你感兴趣的感官维度</div>
          <div className="empty-state-text" style={{ marginTop: 4 }}>
            我们会为你推荐意想不到的艺术体验
          </div>
        </div>
      )}
    </div>
  );
}
