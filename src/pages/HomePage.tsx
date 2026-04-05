import type { PageRoute } from '../types';

interface Props {
  onNavigate: (route: PageRoute) => void;
  mapCount: number;
  collectionCount: number;
  onExport: () => void;
}

export default function HomePage({ onNavigate, mapCount, collectionCount, onExport }: Props) {
  return (
    <div className="app-page">
      <p className="hero-subtitle">PERSONAL ART ODYSSEY</p>
      <h1 className="hero-title">艺术探索星图</h1>
      <p className="hero-desc">跨越感官边界，探索艺术的无限维度</p>
      <p className="hero-count">共 {collectionCount} 条探索记录</p>

      <div className="module-cards">
        {/* 寻宝图 */}
        <div
          className="module-card"
          style={{ background: 'var(--color-treasure-map-bg)' }}
          onClick={() => onNavigate({ page: 'treasure-map-list' })}
        >
          <div className="card-header">
            <div className="card-icon" style={{ background: 'var(--color-treasure-map)' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L13 7.5L19 8.5L14.5 13L15.5 19L10 16L4.5 19L5.5 13L1 8.5L7 7.5L10 2Z" fill="white"/>
              </svg>
            </div>
            <div>
              <div className="card-title">寻宝图</div>
              <div className="card-count">{mapCount} 张寻宝图</div>
            </div>
          </div>
        </div>

        {/* 藏品入库 */}
        <div
          className="module-card"
          style={{ background: 'var(--color-collect-bg)' }}
          onClick={() => onNavigate({ page: 'collect' })}
        >
          <div className="card-header">
            <div className="card-icon" style={{ background: 'var(--color-collect)' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4V16M4 10H16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="card-title">藏品入库</div>
              <div className="card-count">记录一个新的艺术体验</div>
            </div>
          </div>
        </div>

        {/* 藏宝阁 */}
        <div
          className="module-card"
          style={{ background: 'var(--color-vault-bg)' }}
          onClick={() => onNavigate({ page: 'vault-list' })}
        >
          <div className="card-header">
            <div className="card-icon" style={{ background: 'var(--color-vault)' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="3" width="14" height="14" rx="2" stroke="white" strokeWidth="2"/>
                <rect x="6" y="6" width="8" height="8" rx="1" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <div className="card-title">藏宝阁</div>
              <div className="card-count">管理 {collectionCount} 条探索记录</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bottom-info">
        数据存储于本地 · 自动保存 ·{' '}
        <span className="export-link" onClick={onExport}>一键导出</span>
      </div>
    </div>
  );
}
