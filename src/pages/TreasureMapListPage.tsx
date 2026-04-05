import { useEffect, useState } from 'react';
import type { PageRoute, TreasureMapData } from '../types';
import { getAllMaps, deleteMap, importTreasureMap, forceImportMap } from '../db';

interface Props {
  onNavigate: (route: PageRoute) => void;
}

export default function TreasureMapListPage({ onNavigate }: Props) {
  const [maps, setMaps] = useState<TreasureMapData[]>([]);
  const [pendingFile, setPendingFile] = useState<unknown | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState<TreasureMapData | null>(null);

  const loadMaps = async () => {
    const all = await getAllMaps();
    setMaps(all);
  };

  useEffect(() => {
    loadMaps();
  }, []);

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
        const result = await importTreasureMap(json);
        if (result.duplicate) {
          setPendingFile(json);
          setShowDuplicateModal(true);
        } else {
          await loadMaps();
        }
      } catch {
        alert('导入失败：无效的寻宝图 JSON 文件');
      }
    };
    input.click();
  };

  const handleOverwrite = async () => {
    if (pendingFile) {
      await forceImportMap(pendingFile);
      setPendingFile(null);
      setShowDuplicateModal(false);
      await loadMaps();
    }
  };

  const handleCancelOverwrite = () => {
    setPendingFile(null);
    setShowDuplicateModal(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这张寻宝图吗？')) {
      await deleteMap(id);
      await loadMaps();
    }
  };

  const handleCardClick = (map: TreasureMapData) => {
    setShowChapterModal(map);
  };

  const handleChapterSelect = (mapId: string, chapterId: string) => {
    setShowChapterModal(null);
    onNavigate({ page: 'treasure-map-detail', mapId, chapterId });
  };

  return (
    <div className="app-page">
      <div className="top-nav">
        <button className="back-btn" onClick={() => onNavigate({ page: 'home' })}>
          ← 返回
        </button>
        <span className="nav-title">寻宝图</span>
      </div>

      <div className="page-subtitle">{maps.length} 张寻宝图</div>

      <div className="map-list">
        {maps.map((map) => {
          let totalItems = 0;
          let exploredItems = 0;
          for (const ch of map.chapters) {
            totalItems += ch.items.length;
            exploredItems += ch.items.filter((i) => i.exploreStatus === 'explored').length;
          }

          return (
            <div
              key={map.treasureMap.id}
              className="map-card"
              onClick={() => handleCardClick(map)}
            >
              <div className="map-card-header">
                <div className="map-card-icon">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2L13 7.5L19 8.5L14.5 13L15.5 19L10 16L4.5 19L5.5 13L1 8.5L7 7.5L10 2Z" fill="var(--color-treasure-map)"/>
                  </svg>
                </div>
                <div className="map-card-title">{map.treasureMap.name}</div>
              </div>
              <div className="map-card-desc">{map.treasureMap.description}</div>
              <div className="map-card-creator">
                创建者：{map.treasureMap.creator}{map.importedAt ? `　导入于 ${new Date(map.importedAt).toLocaleDateString('zh-CN')}` : ''}
              </div>
              <div className="progress-bar">
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
              <div className="map-card-footer">
                <span className="map-type-badge">
                  {map.treasureMap.type === 'geographic' ? '地域' : '主题'}
                </span>
                <button
                  className="btn-outline btn-small"
                  onClick={(e) => handleDelete(e, map.treasureMap.id)}
                >
                  删除
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="import-btn-wrapper">
        <div className="dashed-entry" onClick={handleImport}>
          + 导入寻宝图
        </div>
      </div>

      {/* 重复导入确认 */}
      {showDuplicateModal && (
        <div className="modal-overlay" onClick={handleCancelOverwrite}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">该寻宝图已存在，是否覆盖？</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn-outline" onClick={handleCancelOverwrite}>取消</button>
              <button className="btn-primary" onClick={handleOverwrite}>覆盖</button>
            </div>
          </div>
        </div>
      )}

      {/* 章节选择弹窗 */}
      {showChapterModal && (
        <div className="modal-overlay" onClick={() => setShowChapterModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {showChapterModal.treasureMap.type === 'geographic' ? '选择城市' : '选择章节'}
              </div>
              <button className="modal-close" onClick={() => setShowChapterModal(null)}>✕</button>
            </div>
            <div className="modal-subtitle">
              {showChapterModal.treasureMap.type === 'geographic'
                ? '选择你想探索的城市'
                : '选择你想探索的章节'}
            </div>
            <div className="chapter-list">
              {showChapterModal.chapters.map((ch) => {
                const total = ch.items.length;
                const explored = ch.items.filter((i) => i.exploreStatus === 'explored').length;
                return (
                  <div
                    key={ch.id}
                    className="chapter-card"
                    onClick={() => handleChapterSelect(showChapterModal.treasureMap.id, ch.id)}
                  >
                    <div className="chapter-card-name">{ch.name}</div>
                    <div className="chapter-card-desc">{ch.description}</div>
                    <div className="progress-bar" style={{ margin: '8px 0 0' }}>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: total > 0 ? `${(explored / total) * 100}%` : '0%',
                            background: 'var(--color-treasure-map)',
                          }}
                        />
                      </div>
                      <span className="progress-text">{explored}/{total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
