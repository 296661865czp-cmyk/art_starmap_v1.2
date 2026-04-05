import { useEffect, useState, useCallback } from 'react';
import type {
  PageRoute, TreasureMapData, TreasureItem, TreasureChapter,
  SensoryFingerprint, CollectionItem,
} from '../types';
import { DOMAIN_LABELS, DOMAIN_COLORS } from '../types';
import { getMapById, updateItemAndSubsStatus, addCollection, getCollectionByItemId } from '../db';

interface Props {
  mapId: string;
  chapterId: string;
  onNavigate: (route: PageRoute) => void;
}

type FilterStatus = 'all' | 'unexplored' | 'next' | 'explored';

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

const defaultSensory: SensoryFingerprint = {
  hearing: 0, sight: 0, touch: 0, smell: 0, taste: 0, body: 0, time: 0,
};

export default function TreasureMapDetailPage({ mapId, chapterId, onNavigate }: Props) {
  const [map, setMap] = useState<TreasureMapData | null>(null);
  const [chapter, setChapter] = useState<TreasureChapter | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [collectingItem, setCollectingItem] = useState<TreasureItem | null>(null);
  const [sensory, setSensory] = useState<SensoryFingerprint>(defaultSensory);
  const [notes, setNotes] = useState('');

  const loadMap = useCallback(async () => {
    const m = await getMapById(mapId);
    if (!m) return;
    setMap(m);
    const ch = m.chapters.find((c) => c.id === chapterId);
    setChapter(ch ?? null);
  }, [mapId, chapterId]);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  if (!map || !chapter) {
    return (
      <div className="app-page">
        <div className="top-nav">
          <button className="back-btn" onClick={() => onNavigate({ page: 'treasure-map-list' })}>
            ← 返回
          </button>
          <span className="nav-title">加载中...</span>
        </div>
      </div>
    );
  }

  const totalItems = chapter.items.length;
  const exploredItems = chapter.items.filter((i) => i.exploreStatus === 'explored').length;

  const filteredItems = chapter.items.filter((item) => {
    if (filter === 'all') return true;
    return item.exploreStatus === filter;
  });

  const handleItemClick = async (item: TreasureItem) => {
    if (item.exploreStatus === 'explored') {
      // 跳转到藏宝阁对应藏品
      const col = await getCollectionByItemId(item.id);
      if (col) {
        onNavigate({ page: 'vault-detail', collectionId: col.id });
      }
      return;
    }
    // 打开感官指纹录入
    setCollectingItem(item);
    setSensory(defaultSensory);
    setNotes('');
  };

  const handleCollect = async () => {
    if (!collectingItem) return;

    const collection: CollectionItem = {
      id: `collection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: collectingItem.title,
      domain: collectingItem.domain,
      description: collectingItem.description,
      sensory,
      notes,
      linkedStars: [],
      source: {
        type: 'treasure-map',
        mapId: map.treasureMap.id,
        mapName: map.treasureMap.name,
        itemId: collectingItem.id,
      },
      createdAt: new Date().toISOString(),
    };

    await addCollection(collection);
    await updateItemAndSubsStatus(mapId, collectingItem.id, 'explored');
    setCollectingItem(null);
    await loadMap();
  };

  const handleCollectCancel = () => {
    setCollectingItem(null);
  };

  return (
    <div className="app-page">
      <div className="top-nav">
        <button className="back-btn" onClick={() => onNavigate({ page: 'treasure-map-list' })}>
          ← 返回
        </button>
        <button
          className="back-btn"
          style={{ left: 'auto', right: 0 }}
          onClick={() => onNavigate({ page: 'treasure-map-list' })}
        >
          {map.treasureMap.type === 'geographic' ? '← 选择城市' : '← 选择章节'}
        </button>
        <span className="nav-title">{chapter.name}</span>
      </div>

      <div className="chapter-desc" style={{ marginBottom: 8 }}>{chapter.description}</div>

      {/* 面包屑 */}
      <div className="breadcrumb-row">
        <span className="breadcrumb-pill">
          {map.treasureMap.name} · {chapter.name}
        </span>
      </div>

      {/* 进度条 */}
      <div className="progress-bar" style={{ margin: '12px 0' }}>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: totalItems > 0 ? `${(exploredItems / totalItems) * 100}%` : '0%',
              background: 'var(--color-treasure-map)',
            }}
          />
        </div>
        <span className="progress-text">{exploredItems}/{totalItems}</span>
      </div>

      {/* 状态筛选 */}
      <div className="filter-tabs">
        {([
          { key: 'all' as FilterStatus, label: '全部' },
          { key: 'unexplored' as FilterStatus, label: '远方' },
          { key: 'next' as FilterStatus, label: '下一步' },
          { key: 'explored' as FilterStatus, label: '已探索' },
        ]).map((f) => (
          <button
            key={f.key}
            className={`filter-tab ${filter === f.key ? 'active' : ''}`}
            data-filter={f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 探索点列表 */}
      {filteredItems.map((item) => {
        const exploredSubs = item.subItems.filter((s) => s.exploreStatus === 'explored').length;

        return (
          <div key={item.id} className="item-card" onClick={() => handleItemClick(item)}>
            <div className="item-header">
              <button className="explore-btn">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="var(--color-treasure-map)" strokeWidth="1.5"/>
                  <path d="M5.5 4.5L10 7L5.5 9.5V4.5Z" fill="var(--color-treasure-map)"/>
                </svg>
              </button>
              <span className="item-title">{item.title}</span>
              <span
                className="domain-tag"
                style={{ background: DOMAIN_COLORS[item.domain] }}
              >
                {DOMAIN_LABELS[item.domain]}
              </span>
              <span className="sub-progress">{exploredSubs}/{item.subItems.length}</span>
            </div>

            <div className="item-desc">{item.description}</div>

            {item.hints && (
              <div className="item-hints">{item.hints}</div>
            )}

            {item.exploreStatus === 'explored' && (
              <div className="status-badge explored">✓ 已探索</div>
            )}
            {item.exploreStatus === 'next' && (
              <div className="status-badge next">→ 下一步</div>
            )}
          </div>
        );
      })}

      {filteredItems.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-text">暂无此状态的探索点</div>
        </div>
      )}

      {/* 感官指纹录入弹窗 */}
      {collectingItem && (
        <div className="modal-overlay" onClick={handleCollectCancel}>
          <div className="modal-content modal-collect" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">感官指纹录入</div>
              <button className="modal-close" onClick={handleCollectCancel}>✕</button>
            </div>

            <div className="collect-item-info">
              <div className="collect-item-title">{collectingItem.title}</div>
              <div className="collect-item-desc">{collectingItem.description}</div>
              {collectingItem.hints && (
                <div className="collect-item-hints">{collectingItem.hints}</div>
              )}
            </div>

            <div className="sensory-input-section">
              <div className="section-label">感官指纹</div>
              {SENSORY_DIMENSIONS.map(({ key, label, color }) => (
                <div key={key} className="sensory-row">
                  <span className="sensory-label" style={{ color }}>{label}</span>
                  <div className="sensory-levels">
                    {[0, 1, 2, 3, 4].map((level) => (
                      <button
                        key={level}
                        className={`sensory-level-btn ${sensory[key] === level ? 'active' : ''}`}
                        style={sensory[key] === level ? { background: color, borderColor: color, color: '#fff' } : {}}
                        onClick={() => setSensory((prev) => ({ ...prev, [key]: level as 0 }))}
                        title={LEVEL_LABELS[level]}
                      >
                        {LEVEL_LABELS[level]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">个人笔记</label>
              <textarea
                className="form-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="你的感受、回忆..."
              />
            </div>

            <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={handleCollect}>
              收藏到藏宝阁
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
