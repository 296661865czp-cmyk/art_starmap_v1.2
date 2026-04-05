import { useState } from 'react';
import type { ArtDomain, CollectionItem, PageRoute, SensoryFingerprint } from '../types';
import { DOMAIN_LABELS, DOMAIN_COLORS } from '../types';
import { addCollection } from '../db';

interface Props {
  onNavigate: (route: PageRoute) => void;
}

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

const DOMAINS: ArtDomain[] = [
  'music', 'painting', 'sculpture', 'dance', 'literature',
  'flavor', 'film', 'synesthesia', 'sports',
];

const defaultSensory: SensoryFingerprint = {
  hearing: 0, sight: 0, touch: 0, smell: 0, taste: 0, body: 0, time: 0,
};

export default function CollectPage({ onNavigate }: Props) {
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState<ArtDomain | null>(null);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [sensory, setSensory] = useState<SensoryFingerprint>(defaultSensory);
  const [toast, setToast] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('请输入作品名称');
      return;
    }
    if (!domain) {
      alert('请选择艺术领域');
      return;
    }
    const hasSensory = Object.values(sensory).some((v) => v > 0);
    if (!hasSensory) {
      alert('请至少为一个感官维度打分');
      return;
    }

    const item: CollectionItem = {
      id: `collection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      domain,
      description: description.trim(),
      sensory,
      notes: notes.trim(),
      linkedStars: [],
      source: { type: 'free' },
      createdAt: new Date().toISOString(),
    };

    await addCollection(item);
    setToast('藏品已入库');
    setTimeout(() => onNavigate({ page: 'vault-list' }), 1500);
  };

  return (
    <div className="app-page">
      <div className="top-nav">
        <button className="back-btn" onClick={() => onNavigate({ page: 'home' })}>
          ← 返回
        </button>
        <span className="nav-title">藏品入库</span>
      </div>

      <div className="form-group">
        <label className="form-label">藏品名称 *</label>
        <input
          className="form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入艺术品名称"
        />
      </div>

      <div className="form-group">
        <label className="form-label">艺术领域 *</label>
        <div className="domain-selector">
          {DOMAINS.map((d) => (
            <button
              key={d}
              className="domain-pill"
              style={domain === d
                ? { background: DOMAIN_COLORS[d], color: '#fff', borderColor: DOMAIN_COLORS[d] }
                : {}
              }
              onClick={() => setDomain(d)}
            >
              {DOMAIN_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">描述</label>
        <textarea
          className="form-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="描述这件艺术品..."
        />
      </div>

      <div className="form-group">
        <label className="form-label">感官指纹 *</label>
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

      <div className="form-group">
        <label className="form-label">个人笔记</label>
        <textarea
          className="form-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="记录你的感受..."
        />
      </div>

      <button className="btn-primary" onClick={handleSave} style={{ width: '100%' }}>
        收藏到藏宝阁
      </button>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
