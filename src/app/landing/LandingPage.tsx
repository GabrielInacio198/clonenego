'use client';

import { useState } from 'react';
import './landing.css';

const FEATURES = [
  { icon: '⚡', title: 'Clone em Segundos', desc: 'Cola a URL do funil. Nós fazemos o resto. Qualquer funil. Qualquer tecnologia.' },
  { icon: '🌐', title: 'Seu Domínio. Sua Identidade.', desc: 'Conecte seu domínio. Zero rastros de origem. Parece que você construiu do zero.' },
  { icon: '📡', title: 'UTM em Todo Clique', desc: 'Cada lead rastreado. Cada pixel informado. Nenhum real de tráfego no escuro.' },
  { icon: '🎨', title: 'Editor Visual sem Código', desc: 'Cores, fontes, imagens, emojis — pelo painel. Seu funil, do seu jeito.' },
  { icon: '💸', title: 'Checkout Redirecionado', desc: 'O funil original leva para o produto deles. O seu leva para o SEU produto.' },
  { icon: '🔒', title: 'Scripts Avançados', desc: 'Pixel, Utmify, GTM — injete no head/body. Rastreio completo. Campanhas cirúrgicas.' },
];

const PLANS = [
  {
    name: 'Starter',
    tag: 'O Explorador',
    price: '97',
    features: [
      { text: 'Até 5 funis ativos', ok: true },
      { text: 'Visual Editor completo', ok: true },
      { text: 'UTM automático', ok: true },
      { text: 'Redirecionamento de checkout', ok: true },
      { text: 'Suporte via chat', ok: true },
      { text: 'Domínio próprio', ok: false },
      { text: 'Scripts head/body', ok: false },
      { text: 'Múltiplos checkouts', ok: false },
    ],
    popular: false,
  },
  {
    name: 'Pro',
    tag: 'O Operador',
    price: '197',
    features: [
      { text: 'Até 20 funis ativos', ok: true },
      { text: 'Domínio próprio incluso', ok: true },
      { text: 'Visual Editor + CSS injection', ok: true },
      { text: 'Scripts head/body (Pixel, GTM)', ok: true },
      { text: 'Múltiplos checkouts por funil', ok: true },
      { text: 'Suporte prioritário', ok: true },
      { text: 'Recursos beta antecipados', ok: true },
      { text: 'Múltiplos usuários', ok: false },
    ],
    popular: true,
  },
  {
    name: 'Agency',
    tag: 'O Arsenal',
    price: '397',
    features: [
      { text: 'Funis ilimitados', ok: true },
      { text: 'Até 10 domínios próprios', ok: true },
      { text: 'Até 5 membros na equipe', ok: true },
      { text: 'Todos os recursos do Pro', ok: true },
      { text: 'Dashboard de equipe', ok: true },
      { text: 'Suporte VIP (2h)', ok: true },
      { text: 'Onboarding dedicado', ok: true },
      { text: 'Acesso antecipado total', ok: true },
    ],
    popular: false,
  },
];

const FAQS = [
  { q: 'Isso é legal?', a: 'Sim. O SnapFunnel clona a estrutura visual pública de páginas, da mesma forma que qualquer browser faz. Você é responsável por usar seu próprio conteúdo e produto.' },
  { q: 'Meu concorrente vai saber?', a: 'Não. Seu funil fica no seu domínio, com sua identidade visual. Nenhum rastro de origem.' },
  { q: 'Funciona com qualquer funil?', a: 'Funciona com a grande maioria: Elementor, Hotmart Pages, WordPress, Webflow, Lovable e outras plataformas populares.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim. Sem fidelidade. Sem taxa de cancelamento. Cancele pelo painel a qualquer momento.' },
  { q: 'E se eu quiser mudar de plano?', a: 'Upgrade ou downgrade disponível a qualquer momento pelo painel, sem burocracia.' },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="lp-root">
      {/* NAV */}
      <nav className="lp-nav">
        <div className="lp-logo">Snap<span>Funnel</span></div>
        <a href="/login"><button className="lp-nav-cta">Começar →</button></a>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-scanlines" />
        <div className="lp-hero-content">
          <div className="lp-badge">
            <span className="lp-badge-dot" />
            SISTEMA ATIVO — ACESSO PÚBLICO
          </div>
          <h1 className="lp-h1">
            Eles levaram meses construindo.<br />
            Você leva <em>3 minutos</em> clonando.
          </h1>
          <p className="lp-hero-sub">
            O SnapFunnel decodifica os funis de maior conversão do mercado
            e os coloca no seu domínio — com seu produto, suas cores, seu checkout.
            Sem dev. Sem agência. Sem espera.
          </p>
          <div className="lp-hero-actions">
            <a href="#precos"><button className="lp-btn-primary">→ Ativar meu funil agora</button></a>
            <a href="#demo"><button className="lp-btn-ghost">Ver demonstração</button></a>
          </div>
        </div>
      </section>

      {/* DOR */}
      <section className="lp-section">
        <h2 className="lp-section-title">O mercado não espera você terminar de construir.</h2>
        <div className="lp-pain-block">
          <p>
            Enquanto você está na décima revisão do seu funil...<br />
            <strong>...alguém que conhece o SnapFunnel já está no ar.</strong>
          </p>
          <br />
          <p>
            Enquanto você paga <span className="lp-pain-highlight">R$ 3.000</span> numa agência para criar uma landing page...<br />
            <strong>...nós clonamos a melhor do seu nicho em 90 segundos.</strong>
          </p>
          <br />
          <p>
            Enquanto você testa qual cor de botão converte mais...<br />
            <strong>...nós já usamos o botão que foi testado com R$ 2 milhões em tráfego.</strong>
          </p>
          <br />
          <p style={{ color: 'var(--lp-text)', fontWeight: 600 }}>
            A questão não é <em>se</em> você vai usar funis que já convertem.<br />
            A questão é <em>quando</em>.
          </p>
        </div>
      </section>

      {/* SOLUÇÃO */}
      <section className="lp-section" id="demo">
        <h2 className="lp-section-title">O código por trás dos funis que você admira. <em style={{ color: 'var(--lp-primary)', fontStyle: 'normal' }}>Agora é seu.</em></h2>
        <p className="lp-section-sub">
          Cole a URL do funil que você quer. Em segundos, nossa infraestrutura captura,
          reconstrói e republica — no seu domínio, com seu checkout.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {['1. Cole a URL', '2. Personalize', '3. Publique'].map((step, i) => (
            <div key={i} style={{
              background: 'var(--lp-surface)',
              border: '1px solid var(--lp-border)',
              borderRadius: '16px',
              padding: '2rem 2.5rem',
              textAlign: 'center',
              minWidth: '200px',
              flex: 1,
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>
                {i === 0 ? '🔗' : i === 1 ? '🎨' : '🚀'}
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1rem' }}>
                {step}
              </div>
              <div style={{ color: 'var(--lp-muted)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                {i === 0 ? 'Do funil que converte' : i === 1 ? 'Cores, logo, checkout' : 'No seu domínio'}
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: 'var(--lp-muted)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
          Tempo médio: <span style={{ color: 'var(--lp-neon)' }}>4 minutos</span>
        </p>
      </section>

      {/* FEATURES */}
      <section className="lp-section">
        <h2 className="lp-section-title">Tudo que você precisa. Nada que você não precisa.</h2>
        <p className="lp-section-sub">Cada recurso foi pensado para uma coisa: colocar seu funil no ar com a maior velocidade possível.</p>
        <div className="lp-features-grid">
          {FEATURES.map((f, i) => (
            <div className="lp-feature-card" key={i}>
              <div className="lp-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="lp-section">
        <div className="lp-stats">
          {[
            { n: '340+', l: 'Funis clonados essa semana' },
            { n: '4min', l: 'Do clone ao ar' },
            { n: '0h', l: 'De dev necessárias' },
            { n: '99.9%', l: 'Uptime garantido' },
          ].map((s, i) => (
            <div key={i}>
              <div className="lp-stat-number">{s.n}</div>
              <div className="lp-stat-label">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* EXCLUSIVIDADE */}
      <section className="lp-section">
        <h2 className="lp-section-title">Nem todo mundo deveria ter acesso a isso.</h2>
        <div className="lp-pain-block" style={{ textAlign: 'center' }}>
          <p>
            Se todo mundo puder clonar qualquer funil...<br />
            os funis que convertem <strong>deixam de ser vantagem competitiva</strong>.
          </p>
          <br />
          <p>
            Por isso, <strong>monitoramos o acesso</strong>.<br />
            Se você chegou até aqui, é porque você está pronto.
          </p>
        </div>
      </section>

      {/* PREÇOS */}
      <section className="lp-section" id="precos">
        <h2 className="lp-section-title">Quanto custa uma campanha que não converte?</h2>
        <p className="lp-section-sub">Mais do que qualquer plano aqui. Escolha o seu.</p>
        <div className="lp-pricing-grid">
          {PLANS.map((plan, i) => (
            <div className={`lp-pricing-card ${plan.popular ? 'popular' : ''}`} key={i}>
              {plan.popular && <div className="lp-pricing-badge">MAIS POPULAR</div>}
              <div className="lp-pricing-name">{plan.name}</div>
              <div className="lp-pricing-desc">{plan.tag}</div>
              <div className="lp-pricing-price">
                R$ {plan.price}<span>/mês</span>
              </div>
              <div className="lp-pricing-period">Cancele quando quiser</div>
              <ul className="lp-pricing-features">
                {plan.features.map((f, fi) => (
                  <li key={fi}>
                    <span className={f.ok ? 'check' : 'cross'}>{f.ok ? '✓' : '✕'}</span>
                    {f.text}
                  </li>
                ))}
              </ul>
              <button className="lp-pricing-btn">Começar agora</button>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: 'var(--lp-muted)', marginTop: '2rem', fontSize: '0.85rem' }}>
          ✅ Acesso imediato após pagamento &nbsp;·&nbsp; ✅ Suporte em português &nbsp;·&nbsp; ✅ Time brasileiro
        </p>
      </section>

      {/* FAQ */}
      <section className="lp-section">
        <h2 className="lp-section-title">Perguntas Frequentes</h2>
        <div className="lp-faq">
          {FAQS.map((faq, i) => (
            <div className="lp-faq-item" key={i}>
              <button className="lp-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {faq.q}
                <span style={{ color: 'var(--lp-muted)', fontSize: '1.2rem' }}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <div className="lp-faq-a">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="lp-cta-final">
        <h2 className="lp-section-title">Seu próximo cliente está vendo um funil agora.</h2>
        <p className="lp-section-sub">
          A pergunta é: é o seu ou o do seu concorrente?<br />
          Em 4 minutos você pode ter um funil testado, no seu domínio, pronto para tráfego.
        </p>
        <a href="#precos"><button className="lp-btn-primary">→ Começar agora — R$ 97/mês</button></a>
        <p style={{ color: 'var(--lp-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>
          Acesso imediato. Cancele quando quiser.
        </p>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        SNAPFUNNEL © 2026 · SECURE ACCESS LAYER
      </footer>
    </div>
  );
}
