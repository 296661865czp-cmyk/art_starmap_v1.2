import { useEffect, useState, useCallback } from 'react';
import type { CollectionItem, PageRoute, SensoryFingerprint } from '../types';
import { DOMAIN_LABELS, DOMAIN_COLORS } from '../types';
import {
  getCollectionById, getAllCollections, updateCollection,
  deleteCollectionWithCleanup, updateCollectionLinkedStars,
} from '../db';

interface Props {
  collectionId: string;
  onNavigate: (route: PageRoute) => void;
}

const SENSORY_DIMENSIONS: { key: keyof SensoryFingerprint; label: string; short: string; color: string }[] = [
  { key: 'hearing', label: '听觉', short: '听', color: 'var(--sensory-hearing)' },
  { key: 'sight', label: '视觉', short: '视', color: 'var(--sensory-sight)' },
  { key: 'touch', label: '触觉', short: '触', color: 'var(--sensory-touch)' },
  { key: 'smell', label: '嗅觉', short: '嗅', color: 'var(--sensory-smell)' },
  { key: 'taste', label: '味觉', short: '味', color: 'var(--sensory-taste)' },
  { key: 'body', label: '体感', short: '体', color: 'var(--sensory-body)' },
  { key: 'time', label: '时间', short: '时', color: 'var(--sensory-time)' },
];

const LEVEL_LABELS = ['无感', '微弱', '适中', '强烈', '沉浸'];

export default function VaultDetailPage({ collectionId, onNavigate }: Props) {
  const [item, setItem] = useState<CollectionItem | null>(null);
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingSensory, setEditingSensory] = useState(false);
  const [sensory, setSensory] = useState<SensoryFingerprint | null>(null);
  const [allCollections, setAllCollections] = useState<CollectionItem[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');

  const loadItem = useCallback(async () => {
    const c = await getCollectionById(collectionId);
    if (!c) return;
    setItem(c);
    setNotes(c.notes);
    setSensory({ ...c.sensory });
  }, [collectionId]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  useEffect(() => {
    getAllCollections().then((all) => setAllCollections(all.filter((c) => c.id !== collectionId)));
  }, [collectionId]);

  if (!item) {
    return (
      <div className="app-page">
        <div className="top-nav">
          <button className="back-btn" onClick={() => onNavigate({ page: 'vault-list' })}>
            ← 返回
          </button>
          <span className="nav-title">加载中...</span>
        </div>
      </div>
    );
  }

  const handleNotesBlur = async () => {
    setEditingNotes(false);
    if (notes !== item.notes) {
      await updateCollection({ ...item, notes });
      await loadItem();
    }
  };

  const handleSaveSensory = async () => {
    if (!sensory) return;
    setEditingSensory(false);
    await updateCollection({ ...item, sensory });
    await loadItem();
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这件藏品吗？')) return;
    await deleteCollectionWithCleanup(collectionId);
    onNavigate({ page: 'vault-list' });
  };

  const handleAddLink = async (targetId: string) => {
    await updateCollectionLinkedStars(collectionId, targetId, 'add');
    setShowLinkModal(false);
    setLinkSearch('');
    await loadItem();
  };

  const handleRemoveLink = async (targetId: string) => {
    await updateCollectionLinkedStars(collectionId, targetId, 'remove');
    await loadItem();
  };

  const filteredCandidates = allCollections.filter((c) =>
    c.title.toLowerCase().includes(linkSearch.toLowerCase()) ||
    DOMAIN_LABELS[c.domain].includes(linkSearch)
  );

  return (
    <div className="app-page">
      <div className="top-nav">
        <button className="back-btn" onClick={() => onNavigate({ page: 'vault-list' })}>
          ← 返回
        </button>
        <span className="nav-title">藏品详情</span>
      </div>

      {/* 基本信息 */}
      <div className="detail-section">
        <div className="detail-title">{item.title}</div>
        <span className="domain-tag" style={{ background: DOMAIN_COLORS[item.domain], marginBottom: 8, display: 'inline-block' }}>
          {DOMAIN_LABELS[item.domain]}
        </span>
        {item.description && (
          <div className="item-desc" style={{ marginTop: 8 }}>{item.description}</div>
        )}
      </div>

      {/* 感官指纹 */}
      <div className="detail-section">
        <div className="detail-section-title">感官指纹</div>
        {(editingSensory && sensory) ? (
          <>
            {SENSORY_DIMENSIONS.map(({ key, label, color }) => (
              <div key={key} className="sensory-row">
                <span className="sensory-label" style={{ color }}>{label}</span>
                <div className="sensory-levels">
                  {[0, 1, 2, 3, 4].map((level) => (
                    <button
                      key={level}
                      className={`sensory-level-btn ${sensory[key] === level ? 'active' : ''}`}
                      style={sensory[key] === level ? { background: color, borderColor: color, color: '#fff' } : {}}
                      onClick={() => setSensory((prev) => prev ? { ...prev, [key]: level as 0 } : prev)}
                      title={LEVEL_LABELS[level]}
                    >
                      {LEVEL_LABELS[level]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={handleSaveSensory}>
              保存
            </button>
          </>
        ) : (
          SENSORY_DIMENSIONS.map(({ key, label, short, color }) => (
            <div key={key} className="sensory-detail-bar">
              <span className="sensory-detail-label" style={{ color }}>{short} {label}</span>
              <div className="sensory-detail-track">
                <div
                  className="sensory-detail-fill"
                  style={{
                    width: `${(item.sensory[key] / 4) * 100}%`,
                    background: color,
                  }}
                />
              </div>
              <span className="sensory-detail-level">{LEVEL_LABELS[item.sensory[key]]}</span>
            </div>
          ))
        )}
      </div>

      {/* 个人笔记 */}
      <div className="detail-section">
        <div className="detail-section-title">个人笔记</div>
        <div className="notes-edit-area" onClick={() => setEditingNotes(true)}>
          {editingNotes ? (
            <textarea
              className="notes-edit-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              autoFocus
              placeholder="添加笔记..."
            />
          ) : (
            <div className={notes ? '' : 'notes-edit-placeholder'}>
              {notes || '✎ 添加笔记...'}
            </div>
          )}
        </div>
      </div>

      {/* 关联星点 */}
      <div className="detail-section">
        <div className="detail-section-title">关联星点</div>
        <div className="linked-stars">
          {item.linkedStars.map((starId) => {
            const linked = allCollections.find((c) => c.id === starId);
            return (
              <span
                key={starId}
                className="linked-star-pill"
                style={{ background: linked ? DOMAIN_COLORS[linked.domain] : 'var(--text-hint)' }}
                onClick={() => linked && onNavigate({ page: 'vault-detail', collectionId: starId })}
              >
                {linked ? `${DOMAIN_LABELS[linked.domain]} · ${linked.title}` : starId}
                <span
                  className="linked-star-remove"
                  onClick={(e) => { e.stopPropagation(); handleRemoveLink(starId); }}
                >
                  ✕
                </span>
              </span>
            );
          })}
          <button className="add-link-btn" onClick={() => setShowLinkModal(true)}>
            ＋ 添加关联
          </button>
        </div>
      </div>

      {/* 来源信息 */}
      <div className="source-info" style={{ textAlign: 'center' }}>
        {item.source.type === 'treasure-map'
          ? `来自：${item.source.mapName || '寻宝图'}`
          : '自由探索'
        }
      </div>
      <div className="creation-time">
        {new Date(item.createdAt).toLocaleDateString('zh-CN')}
      </div>

      {/* 底部操作 */}
      <div className="detail-bottom-actions">
        <button className="btn-outline" onClick={() => {
          setEditingSensory(true);
          setSensory({ ...item.sensory });
        }}>
          编辑
        </button>
        <button className="btn-danger" onClick={handleDelete}>
          删除
        </button>
      </div>

      {/* 添加关联模态框 */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={() => { setShowLinkModal(false); setLinkSearch(''); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">添加关联星点</div>
              <button className="modal-close" onClick={() => { setShowLinkModal(false); setLinkSearch(''); }}>✕</button>
            </div>
            <input
              className="link-search-input"
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              placeholder="搜索藏品..."
              autoFocus
            />
            <div className="link-candidate-list">
              {filteredCandidates.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-hint)', padding: 20, fontSize: 13 }}>
                  暂无可关联的藏品
                </div>
              ) : (
                filteredCandidates.map((c) => {
                  const isLinked = item.linkedStars.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      className={`link-candidate-item ${isLinked ? 'linked' : ''}`}
                      onClick={() => !isLinked && handleAddLink(c.id)}
                    >
                      <div className="vault-card-dot" style={{ background: DOMAIN_COLORS[c.domain] }} />
                      <div className="link-candidate-title">{c.title}</div>
                      <span className="vault-card-badge" style={{ background: DOMAIN_COLORS[c.domain], fontSize: 11 }}>
                        {DOMAIN_LABELS[c.domain]}
                      </span>
                      {isLinked && <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>已关联</span>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
