'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type StickerLead = {
  id: string;
  nome: string | null;
  email: string | null;
  clube: string | null;
  peso: string | null;
  altura: string | null;
  nascimento: string | null;
  image_url: string | null;
  status: 'pending' | 'paid' | 'sent';
  created_at: string;
  paid_at: string | null;
  sent_at: string | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Aguardando Pgto', color: '#92400e', bg: '#fef3c7' },
  paid:    { label: 'Pago',            color: '#065f46', bg: '#d1fae5' },
  sent:    { label: 'E-mail Enviado',  color: '#1e3a8a', bg: '#dbeafe' },
};

export default function StickersPage() {
  const [leads, setLeads] = useState<StickerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);
    const { data, error } = await supabase
      .from('sticker_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data) setLeads(data);
    setLoading(false);
  }

  async function sendEmail(leadId: string) {
    setSendingId(leadId);
    setMessage(null);
    try {
      const res = await fetch('/api/sticker/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage('✅ E-mail enviado com sucesso!');
        fetchLeads();
      } else {
        setMessage('❌ Erro: ' + (json.error || 'Falha desconhecida'));
      }
    } catch (err: any) {
      setMessage('❌ Erro de conexão: ' + err.message);
    } finally {
      setSendingId(null);
    }
  }

  const filtered = leads.filter(l => filter === 'all' || l.status === filter);

  const stats = {
    total: leads.length,
    pending: leads.filter(l => l.status === 'pending').length,
    paid: leads.filter(l => l.status === 'paid').length,
    sent: leads.filter(l => l.status === 'sent').length,
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1a237e', margin: 0 }}>
          ⚽ Figurinhas Geradas
        </h1>
        <p style={{ color: '#555', marginTop: '4px', fontSize: '14px' }}>
          Leads que geraram figurinha pelo funil clonado
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: stats.total, color: '#1a237e', bg: '#e8eaf6' },
          { label: 'Aguardando', value: stats.pending, color: '#92400e', bg: '#fef3c7' },
          { label: 'Pagos', value: stats.paid, color: '#065f46', bg: '#d1fae5' },
          { label: 'Enviados', value: stats.sent, color: '#1e3a8a', bg: '#dbeafe' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: s.color }}>{s.value}</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: s.color, fontWeight: 600 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Mensagem de feedback */}
      {message && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
          background: message.startsWith('✅') ? '#d1fae5' : '#fee2e2',
          color: message.startsWith('✅') ? '#065f46' : '#991b1b',
          fontWeight: 600, fontSize: '14px'
        }}>
          {message}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[['all', 'Todos'], ['pending', 'Aguardando'], ['paid', 'Pagos'], ['sent', 'Enviados']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '13px',
              background: filter === v ? '#1a237e' : '#e8eaf6',
              color: filter === v ? '#fff' : '#1a237e',
            }}>
            {l}
          </button>
        ))}
        <button onClick={fetchLeads}
          style={{
            marginLeft: 'auto', padding: '8px 16px', borderRadius: '8px', border: '1px solid #c5c6e8',
            cursor: 'pointer', fontWeight: 600, fontSize: '13px', background: '#fff', color: '#555'
          }}>
          🔄 Atualizar
        </button>
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#999' }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#999' }}>
          Nenhum lead encontrado
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9ff' }}>
                {['Figurinha', 'Nome', 'E-mail', 'Clube', 'Status', 'Data', 'Ação'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: '11px',
                    fontWeight: 700, color: '#7986cb', textTransform: 'uppercase',
                    letterSpacing: '0.5px', borderBottom: '1px solid #e8eaf6'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, idx) => {
                const statusInfo = STATUS_LABELS[lead.status] || STATUS_LABELS.pending;
                return (
                  <tr key={lead.id} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    {/* Miniatura */}
                    <td style={{ padding: '12px 16px' }}>
                      {lead.image_url ? (
                        <a href={lead.image_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={lead.image_url}
                            alt="Figurinha"
                            style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e8eaf6' }}
                          />
                        </a>
                      ) : (
                        <div style={{
                          width: '52px', height: '52px', background: '#e8eaf6', borderRadius: '8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                        }}>⏳</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1a237e', fontSize: '14px' }}>
                      {lead.nome || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#333', fontSize: '13px' }}>
                      {lead.email || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#555', fontSize: '13px' }}>
                      {lead.clube || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 10px', borderRadius: '20px',
                        fontSize: '11px', fontWeight: 700,
                        color: statusInfo.color, background: statusInfo.bg
                      }}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#777', fontSize: '12px' }}>
                      {new Date(lead.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {lead.image_url && lead.email && (
                        <button
                          onClick={() => sendEmail(lead.id)}
                          disabled={sendingId === lead.id}
                          style={{
                            padding: '6px 12px', borderRadius: '8px', border: 'none',
                            cursor: sendingId === lead.id ? 'not-allowed' : 'pointer',
                            fontWeight: 700, fontSize: '12px',
                            background: sendingId === lead.id ? '#c5c6e8' : '#1a237e',
                            color: sendingId === lead.id ? '#777' : '#fff',
                          }}>
                          {sendingId === lead.id ? '📤 Enviando...' : '📧 Enviar'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
