import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { LayoutDashboard, Users, Activity, Loader2, Trophy, ListOrdered, Database } from 'lucide-react';

const App = () => {

  const [auditoriaData, setAuditoriaData] = useState([]);
  const [filtrosAuditoria, setFiltrosAuditoria] = useState({
    comarcas: { 'Belém': true, 'Ananindeua': true, 'Icoaraci': true },
    grupos: { 'NIES Família': true, 'NIES Cível': true, 'NIES Outros': true, 'NAEFA / Família Oficial': true, 'Cível Oficial': true, 'Outros': true }
  });
  const [totals, setTotals] = useState([]);
  const [averages, setAverages] = useState([]);
  const [rankingsDefs, setRankingsDefs] = useState([]);
  const [rankingsAcoes, setRankingsAcoes] = useState([]);
  const [sistemas, setSistemas] = useState([]);
  const [rankingsGlobal, setRankingsGlobal] = useState([]);
  const [selectedGlobalMonth, setSelectedGlobalMonth] = useState('01/2026');
  const [loading, setLoading] = useState(true);
  // NIES actions by source
  const [niesAcoesSolar, setNiesAcoesSolar] = useState([]);
  const [niesAcoesSCPJ, setNiesAcoesSCPJ] = useState([]);
  const [niesAcoesUnificado, setNiesAcoesUnificado] = useState([]);
  // Impacto
  const [impactoNies, setImpactoNies] = useState([]);
  const [comparativoNucleos, setComparativoNucleos] = useState([]);
  const [servidoresStats, setServidoresStats] = useState([]);
  // Produtividade Defensoras
  const [defensorasData, setDefensorasData] = useState([]);
  const [selectedDefensoraMes, setSelectedDefensoraMes] = useState('Total'); // Can be a specific month or 'Total'
  const [produtividadeView, setProdutividadeView] = useState('unificado'); // 'solar', 'scpj', 'unificado'
  
  // 'solar' | 'scpj' | 'unificado'
  const [demandasNiesView, setDemandasNiesView] = useState('unificado');

  // Tabs: 1=Comparativo, 2=Rankings, 3=Demandas, 4=Sistemas NIES
  const [activeTab, setActiveTab] = useState(1);
  const [modalInfo, setModalInfo] = useState(null);
  const [comarca, setComarca] = useState('Belém');
  const [civelTarget, setCivelTarget] = useState('Total');
  const [selectedMonth, setSelectedMonth] = useState('01/2026');

  useEffect(() => {
    setLoading(true);
    let suffix = '';
    if (comarca === 'Ananindeua') suffix = '_ananindeua';
    if (comarca === 'Icoaraci') suffix = '_icoaraci';
      if (comarca === 'GERAL') suffix = '_geral';
    
    const t = Date.now();
    Promise.all([
      fetch(`/data/totals_compare${suffix}.json?t=${t}`).then(r => r.json()),
      fetch(`/data/averages_compare${suffix}.json?t=${t}`).then(r => r.json()),
      fetch(`/data/rankings_defensores${suffix}.json?t=${t}`).then(r => r.json()),
      fetch(`/data/rankings_acoes${suffix}.json?t=${t}`).then(r => r.json()),
      fetch(`/data/nies_consolidado.json?t=${t}`).then(r => r.json()),
      fetch(`/data/rankings_defensores_global.json?t=${t}`).then(r => r.json()),
      fetch(`/data/auditoria_completa.json?t=${t}`).then(r => r.json()).catch(() => []),
      fetch(`/data/nies_acoes_solar.json?t=${t}`).then(r => r.json()).catch(() => []),
      fetch(`/data/nies_acoes_scpj.json?t=${t}`).then(r => r.json()).catch(() => []),
      fetch(`/data/nies_acoes_unificado.json?t=${t}`).then(r => r.json()).catch(() => []),
      fetch(`/data/impacto_nies_belem.json?t=${t}`).then(r => r.json()).catch(() => []),
      fetch(`/data/defensoras_nies_detalhado.json?t=${t}`).then(r => r.json()).catch(() => []),
      fetch(`/data/comparativo_nucleos.json?t=${t}`).then(r => r.json()).catch(() => []),
      fetch(`/data/servidores_stats.json?t=${t}`).then(r => r.json()).catch(() => [])
    ]).then(([tot, avg, rDefs, rAcoes, sis, rGlobal, aud, solar, scpj, unif, imp, defsData, compNuc, servStats]) => {
      setTotals(tot);
      setAverages(avg);
      setRankingsDefs(rDefs);
      setRankingsAcoes(rAcoes);
      setSistemas(sis);
      setRankingsGlobal(rGlobal);
      setAuditoriaData(aud || []);
      if (aud) {
        const uniqueGroups = [...new Set(aud.map(a => a.grupo))];
        const gruposObj = {};
        uniqueGroups.forEach(g => gruposObj[g] = true);
        setFiltrosAuditoria(prev => ({...prev, grupos: gruposObj}));
      }
      setNiesAcoesSolar(solar || []);
      setNiesAcoesSCPJ(scpj || []);
      setNiesAcoesUnificado(unif || []);
      setImpactoNies(imp || []);
      setDefensorasData(defsData || []);
      setComparativoNucleos(compNuc || []);
      setServidoresStats(servStats || []);
      setLoading(false);
    }).catch(err => {
      console.error("Erro ao carregar dados avançados", err);
      setLoading(false);
    });
  }, [comarca]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>
        <Loader2 size={48} className="animate-spin" />
        <h2 style={{ marginLeft: 16 }}>Compilando Matrizes de Dados...</h2>
      </div>
    );
  }

  // --- TAB 1 CALCULATIONS (Totais & Médias) ---
  const calculateFooterTotals = (data) => {
    const footer = { Mes: 'TOTAL GERAL' };
    if (data.length === 0) return footer;
    Object.keys(data[0]).forEach(key => {
      if (key !== 'Mes') {
        footer[key] = data.reduce((acc, curr) => acc + (curr[key] || 0), 0);
        // If it's an average table, re-average it
        if (key.startsWith('Média')) {
           footer[key] = (footer[key] / data.length).toFixed(2);
        }
      }
    });
    return footer;
  };
  const processedTotals = totals.map(r => {
    if (comarca === 'Belém' && civelTarget !== 'Total' && comparativoNucleos.length > 0) {
      const comp = comparativoNucleos.find(c => c.mes === r.Mes);
      if (comp && comp[civelTarget.toLowerCase()] !== undefined) {
        const newCivel = comp[civelTarget.toLowerCase()];
        return {
          ...r,
          'DP Cível': newCivel,
          'DP Geral': newCivel + r['DP Família']
        };
      }
    }
    return r;
  });

  const footerTotals = calculateFooterTotals(processedTotals);
  const footerAverages = calculateFooterTotals(averages);

  // --- TAB 2 CALCULATIONS (Rankings Defensores) ---
  // Aggregate all time
  const getRanking = (grupo) => {
    const filtered = rankingsDefs.filter(d => d.Grupo === grupo || d.Grupo.startsWith(grupo));
    const aggregated = filtered.reduce((acc, curr) => {
      acc[curr.Defensores] = (acc[curr.Defensores] || 0) + curr.Processos;
      return acc;
    }, {});
    return Object.entries(aggregated)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };
  const rankingFamDP = getRanking('DP Família');
  const rankingCivDP = getRanking('DP Cível');
  const rankingNies = getRanking('NIES');

  
  // --- TAB 2 MONTHLY UNIFIED CALCULATIONS ---
  const getUnifiedMonthlyRanking = (area, mes) => {
    const filtered = rankingsDefs.filter(d => {
      if (d.Mes !== mes) return false;
      if (area === 'Geral') return true;
      const isFamilia = area === 'Família';
      const niesGroup = isFamilia ? 'NIES Família' : 'NIES Cível';
      const dpPrefix = isFamilia ? 'DP Família' : 'DP Cível';
      return d.Grupo === niesGroup || d.Grupo.startsWith(dpPrefix);
    });
    
    const aggregated = filtered.reduce((acc, curr) => {
      if (!acc[curr.Defensores]) {
        acc[curr.Defensores] = { count: 0, isNies: curr.Grupo.includes('NIES') };
      }
      acc[curr.Defensores].count += curr.Processos;
      return acc;
    }, {});
    
    return Object.entries(aggregated)
      .map(([name, data]) => ({ name, count: data.count, isNies: data.isNies }))
      .sort((a, b) => b.count - a.count);
  };
  
  const availableMonths = [...new Set(rankingsDefs.map(d => d.Mes))].sort();
  const monthlyFamRanking = getUnifiedMonthlyRanking('Família', selectedMonth);
  const monthlyCivRanking = getUnifiedMonthlyRanking('Cível', selectedMonth);
  const monthlyGeralRanking = getUnifiedMonthlyRanking('Geral', selectedMonth);

  // --- TAB 3 CALCULATIONS (Rankings Absolutos Antigos) ---
  // Ações NIES agora vem dos 3 JSONs dependendo do switch (apenas para Belém)
  // Para outras comarcas, usa getAcoes('NIES') normal
  const getAcoes = (groupPrefix) => {
    const acc = {};
    rankingsAcoes.filter(d => d.Grupo.startsWith(groupPrefix)).forEach(d => {
      acc[d.Ações] = (acc[d.Ações] || 0) + d.Processos;
    });
    return Object.entries(acc).map(([name, count]) => ({name, count})).sort((a,b) => b.count - a.count);
  };
  
  // Aggregate NIES actions dynamically based on selected view
  const getAcoesNiesDynamic = () => {
    if (comarca !== 'Belém') return getAcoes('NIES');
    
    // For Belém, use the generated unified arrays based on the toggle
    const sourceArray = 
      demandasNiesView === 'solar' ? niesAcoesSolar :
      demandasNiesView === 'scpj' ? niesAcoesSCPJ :
      niesAcoesUnificado;
      
    // The Python script already outputs [{name, count}] aggregated
    return sourceArray || [];
  };

  const acoesNies = getAcoesNiesDynamic();
  const acoesFamDP = getAcoes('DP Família');
  const acoesCivDP = getAcoes('DP Cível');

  // --- TAB 3 CALCULATIONS (Demandas Cruzadas 3 Colunas) ---
  const getDemandasCruzadas = (area) => {
    const isFamilia = area === 'Família';
    const filtered = rankingsAcoes.filter(d => {
      if (area === 'Geral') return true;
      const niesGroup = isFamilia ? 'NIES Família' : 'NIES Cível';
      const dpPrefix = isFamilia ? 'DP Família' : 'DP Cível';
      return d.Grupo === niesGroup || d.Grupo.startsWith(dpPrefix);
    });
    
    const grouped = {};
    filtered.forEach(d => {
      const name = d.Ações;
      if (!grouped[name]) grouped[name] = { total: 0, dp: 0, nies: 0 };
      grouped[name].total += d.Processos;
      if (d.Grupo.includes('NIES')) {
        grouped[name].nies += d.Processos;
      } else {
        grouped[name].dp += d.Processos;
      }
    });
    return Object.entries(grouped)
      .map(([name, data]) => ({ 
        name, 
        total: data.total, 
        dp: data.dp, 
        nies: data.nies, 
        niesPercent: data.total > 0 ? ((data.nies / data.total) * 100).toFixed(1) : 0 
      }))
      .sort((a, b) => b.total - a.total);
  };
  
  const demandasFam = getDemandasCruzadas('Família');
  const demandasCiv = getDemandasCruzadas('Cível');
  const demandasGeral = getDemandasCruzadas('Geral');

  // --- TAB 4 CALCULATIONS (Sistemas) ---
  const sysObj = {};
  sistemas.forEach(d => {
    if (!sysObj[d.mes]) sysObj[d.mes] = { mes: d.mes, SOLAR: 0, SCPJ: 0 };
    if (d.sistema === 'SOLAR') sysObj[d.mes].SOLAR += d.quantidade;
    if (d.sistema === 'SCPJ') sysObj[d.mes].SCPJ += d.quantidade;
  });
  const chartSistemasData = Object.values(sysObj).sort((a,b) => a.mes.localeCompare(b.mes));

  // --- TAB 5 CALCULATIONS (Auditoria) ---
  const handleToggleFiltro = (categoria, valor) => {
    setFiltrosAuditoria(prev => ({
      ...prev,
      [categoria]: {
        ...prev[categoria],
        [valor]: !prev[categoria][valor]
      }
    }));
  };

  const auditoriaFiltrada = auditoriaData.filter(row => {
    const matchComarca = filtrosAuditoria.comarcas[row.comarca] !== false;
    const matchGrupo = filtrosAuditoria.grupos[row.grupo] !== false;
    return matchComarca && matchGrupo;
  });

  // --- TAB 6 CALCULATIONS (Impacto NIES) ---
  const impactoData = totals.map(r => ({
    mes: r.Mes,
    belem_total: r['DP Geral'],
    nies_total: r['NIES Geral'],
    nies_percent: r['DP Geral'] > 0 ? ((r['NIES Geral'] / r['DP Geral']) * 100).toFixed(1) : 0
  }));
  const totalProtocolado = impactoData.reduce((a, b) => a + b.belem_total, 0);
  const totalNies = impactoData.reduce((a, b) => a + b.nies_total, 0);
  const pctGeral = totalProtocolado > 0 ? ((totalNies / totalProtocolado) * 100).toFixed(1) : 0;
  
  const dpDefsSet = new Set(rankingsDefs.filter(d => !d.Grupo.startsWith('NIES')).map(d => d.Defensores));
  const niesDefsSet = new Set(rankingsDefs.filter(d => d.Grupo.startsWith('NIES')).map(d => d.Defensores));
  const totalDpDefs = dpDefsSet.size;
  const totalNiesDefs = niesDefsSet.size;

  return (
    <div className="dashboard-container">
      {modalInfo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20
        }} onClick={() => setModalInfo(null)}>
          <div className="glass-panel" style={{
            background: 'var(--bg-card)', 
            border: '1px solid rgba(255,255,255,0.2)',
            maxWidth: 400, width: '100%', padding: 24, borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{marginTop: 0, color: 'var(--text-primary)', fontSize: 18}}>{modalInfo.title}</h3>
            <p style={{color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 12, marginBottom: 24}}>{modalInfo.content}</p>
            <button onClick={() => setModalInfo(null)} style={{
              width: '100%', padding: '12px', background: 'var(--accent-primary)',
              color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600
            }}>Entendido</button>
          </div>
        </div>
      )}

      <header className="header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="title">Controladoria e Gestão (NIES)</h1>
            <p className="subtitle">Métricas, Metas e Ranking Consolidados</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '12px' }}>
            <button 
              onClick={() => setComarca('Belém')}
              style={{
                padding: '8px 16px', background: comarca === 'Belém' ? 'var(--accent-primary)' : 'transparent',
                color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              Belém
            </button>
            <button 
              onClick={() => setComarca('Ananindeua')}
              style={{
                padding: '8px 16px', background: comarca === 'Ananindeua' ? 'var(--accent-primary)' : 'transparent',
                color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              Ananindeua
            </button>
            <button 
              onClick={() => setComarca('Icoaraci')}
              style={{
                padding: '8px 16px', background: comarca === 'Icoaraci' ? 'var(--accent-primary)' : 'transparent',
                color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              Icoaraci
            </button>
            <button 
              onClick={() => setComarca('GERAL')}
              style={{
                padding: '8px 16px', background: comarca === 'GERAL' ? 'linear-gradient(45deg, #FFD700, #FFA500)' : 'transparent',
                color: comarca === 'GERAL' ? '#000' : '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              GERAL
            </button>
          </div>
        </div>
      </header>

      {/* TABS NAVIGATION */}
      <div className="tabs-container">
        <button className={`tab-button ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}><LayoutDashboard size={14} style={{display:'inline', marginRight:6}}/> Comparativo Mensal</button>
        <button className={`tab-button ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}><Trophy size={14} style={{display:'inline', marginRight:6}}/> Ranking Defensores</button>
        <button className={`tab-button ${activeTab === 3 ? 'active' : ''}`} onClick={() => setActiveTab(3)}><ListOrdered size={14} style={{display:'inline', marginRight:6}}/> Top Demandas</button>
        <button className={`tab-button ${activeTab === 6 ? 'active' : ''}`} onClick={() => setActiveTab(6)}><Activity size={14} style={{display:'inline', marginRight:6}}/> Impacto NIES</button>
        <button className={`tab-button ${activeTab === 7 ? 'active' : ''}`} onClick={() => setActiveTab(7)}><Users size={14} style={{display:'inline', marginRight:6}}/> Produtividade Defensoras</button>
        <button className={`tab-button ${activeTab === 4 ? 'active' : ''}`} onClick={() => setActiveTab(4)}><Activity size={14} style={{display:'inline', marginRight:6}}/> SOLAR vs SCPJ</button>
        <button className={`tab-button ${activeTab === 5 ? 'active' : ''}`} onClick={() => setActiveTab(5)}><Database size={14} style={{display:'inline', marginRight:6}}/> Auditoria de Dados</button>
      </div>

      <section style={{ marginTop: 24 }}>
        
        {/* TAB 1: MATRIZES MENSAIS */}
        {activeTab === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            {/* TOTAIS ABSOLUTOS */}
            <div>
              <h2 className="title" style={{fontSize: 20, marginBottom: 16}}>Totais Absolutos Mensais</h2>
              <div className="kpi-grid">
                
                {/* PAIR 1: CÍVEL */}
                <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(59, 130, 246, 0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="chart-title" style={{color: '#60a5fa'}}>Comparativo Cível</h3>
                        {comarca === 'Belém' && (
                          <select 
                            className="filter-select" 
                            style={{ padding: '4px 8px', fontSize: 12 }}
                            value={civelTarget} 
                            onChange={e => setCivelTarget(e.target.value)}
                          >
                            <option value="Total">Cível Total</option>
                            <option value="Fazenda">Fazenda Pública</option>
                            <option value="Consumidor">Consumidor</option>
                            <option value="Residual">Cível Residual</option>
                            <option value="Moradia">Moradia</option>
                          </select>
                        )}
                      </div>
                    </div>
                    <table className="data-table">
                      <thead><tr><th>Mês</th><th>DP Oficial</th><th>NIES</th><th>NIES %</th></tr></thead>
                      <tbody>
                        {processedTotals.map(r => {
                        const pct = r['DP Cível'] > 0 ? Math.round((r['NIES Cível'] / r['DP Cível']) * 100) : 0;
                        const isGood = pct >= 50;
                        return (
                          <tr key={r.Mes}>
                            <td>{r.Mes}</td>
                            <td title={`Base: ${r['DP Cível Defs']} defensores cíveis`} style={{cursor: 'help', textDecoration: 'underline dotted rgba(255,255,255,0.3)'}}>{r['DP Cível']}</td>
                            <td style={{fontWeight: 700}}>{r['NIES Cível']}</td>
                            <td><span className="kpi-trend" style={{background: isGood ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: isGood ? '#34d399' : '#60a5fa'}}>{pct}%</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{fontWeight: 700}}>{footerTotals.Mes}</td>
                        <td style={{fontWeight: 700}}>{footerTotals['DP Cível']}</td>
                        <td style={{fontWeight: 800}}>{footerTotals['NIES Cível']}</td>
                        <td><span className="kpi-trend" style={{background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa'}}>{footerTotals['DP Cível'] > 0 ? Math.round((footerTotals['NIES Cível']/footerTotals['DP Cível'])*100) : 0}%</span></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* PAIR 2: FAMÍLIA */}
                <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(245, 158, 11, 0.1)' }}>
                    <h3 className="chart-title" style={{color: '#fbbf24'}}>Comparativo Família</h3>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>Mês</th><th>DP Família</th><th>NIES</th><th>NIES %</th></tr></thead>
                    <tbody>
                      {processedTotals.map(r => {
                        const pct = r['DP Família'] > 0 ? Math.round((r['NIES Família'] / r['DP Família']) * 100) : 0;
                        const isGood = pct >= 50;
                        return (
                          <tr key={r.Mes}>
                            <td>{r.Mes}</td>
                            <td title={`Base: ${r['DP Família Defs']} defensores DP Família`} style={{cursor: 'help', textDecoration: 'underline dotted rgba(255,255,255,0.3)'}}>{r['DP Família']}</td>
                            <td style={{fontWeight: 700}}>{r['NIES Família']}</td>
                            <td><span className="kpi-trend" style={{background: isGood ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: isGood ? '#34d399' : '#fbbf24'}}>{pct}%</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{fontWeight: 700}}>{footerTotals.Mes}</td>
                        <td style={{fontWeight: 700}}>{footerTotals['DP Família']}</td>
                        <td style={{fontWeight: 800}}>{footerTotals['NIES Família']}</td>
                        <td><span className="kpi-trend" style={{background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24'}}>{footerTotals['DP Família'] > 0 ? Math.round((footerTotals['NIES Família']/footerTotals['DP Família'])*100) : 0}%</span></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* PAIR 3: GERAL */}
                <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(16, 185, 129, 0.1)' }}>
                    <h3 className="chart-title" style={{color: '#34d399'}}>Comparativo Geral</h3>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>Mês</th><th>DPs Totais</th><th>NIES Total</th><th>NIES %</th></tr></thead>
                    <tbody>
                      {processedTotals.map(r => {
                        const pct = r['DP Geral'] > 0 ? Math.round((r['NIES Geral'] / r['DP Geral']) * 100) : 0;
                        const isGood = pct >= 50;
                        return (
                          <tr key={r.Mes}>
                            <td>{r.Mes}</td>
                            <td title={`Base: ${r['DP Geral Defs']} defensores totais`} style={{cursor: 'help', textDecoration: 'underline dotted rgba(255,255,255,0.3)'}}>{r['DP Geral']}</td>
                            <td style={{fontWeight: 700}}>{r['NIES Geral']}</td>
                            <td><span className="kpi-trend" style={{background: isGood ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: isGood ? '#34d399' : '#10b981', boxShadow: isGood ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none'}}>{pct}%</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{fontWeight: 700}}>{footerTotals.Mes}</td>
                        <td style={{fontWeight: 700}}>{footerTotals['DP Geral']}</td>
                        <td style={{fontWeight: 800}}>{footerTotals['NIES Geral']}</td>
                        <td><span className="kpi-trend" style={{background: 'rgba(16, 185, 129, 0.2)', color: '#34d399'}}>{footerTotals['DP Geral'] > 0 ? Math.round((footerTotals['NIES Geral']/footerTotals['DP Geral'])*100) : 0}%</span></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

              </div>
            </div>

            {/* MÉDIAS DE PRODUTIVIDADE */}
            <div>
              <h2 className="title" style={{fontSize: 20, marginBottom: 16}}>Médias por Defensor(a) Mensais</h2>
              <div className="kpi-grid">
                
                {/* PAIR 1: CÍVEL */}
                <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(59, 130, 246, 0.1)' }}>
                    <h3 className="chart-title" style={{color: '#60a5fa'}}>Média Cível</h3>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>Mês</th><th>DP Oficial</th><th>NIES</th><th>NIES %</th></tr></thead>
                    <tbody>
                      {averages.map(r => {
                        const pct = r['Média DP Cível'] > 0 ? Math.round((r['Média NIES Cível'] / r['Média DP Cível']) * 100) : 0;
                        const isGood = pct >= 50;
                        return (
                          <tr key={r.Mes}>
                            <td>{r.Mes}</td>
                            <td title={`Base: ${r['DP Cível Defs']} defensores cíveis`} style={{cursor: 'help', textDecoration: 'underline dotted rgba(255,255,255,0.3)'}}>{r['Média DP Cível']}</td>
                            <td style={{fontWeight: 700}}>{r['Média NIES Cível']}</td>
                            <td><span className="kpi-trend" style={{background: isGood ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: isGood ? '#34d399' : '#60a5fa'}}>{pct}%</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{fontWeight: 700}}>{footerAverages.Mes}</td>
                        <td style={{fontWeight: 700}}>{footerAverages['Média DP Cível']}</td>
                        <td style={{fontWeight: 800}}>{footerAverages['Média NIES Cível']}</td>
                        <td><span className="kpi-trend" style={{background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa'}}>{footerAverages['Média DP Cível'] > 0 ? Math.round((footerAverages['Média NIES Cível']/footerAverages['Média DP Cível'])*100) : 0}%</span></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* PAIR 2: FAMÍLIA */}
                <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(245, 158, 11, 0.1)' }}>
                    <h3 className="chart-title" style={{color: '#fbbf24'}}>Média Família</h3>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>Mês</th><th>DP Família</th><th>NIES</th><th>NIES %</th></tr></thead>
                    <tbody>
                      {averages.map(r => {
                        const pct = r['Média DP Família'] > 0 ? Math.round((r['Média NIES Família'] / r['Média DP Família']) * 100) : 0;
                        const isGood = pct >= 50;
                        return (
                          <tr key={r.Mes}>
                            <td>{r.Mes}</td>
                            <td title={`Base: ${r['DP Família Defs']} defensores DP Família`} style={{cursor: 'help', textDecoration: 'underline dotted rgba(255,255,255,0.3)'}}>{r['Média DP Família']}</td>
                            <td style={{fontWeight: 700}}>{r['Média NIES Família']}</td>
                            <td><span className="kpi-trend" style={{background: isGood ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: isGood ? '#34d399' : '#fbbf24'}}>{pct}%</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{fontWeight: 700}}>{footerAverages.Mes}</td>
                        <td style={{fontWeight: 700}}>{footerAverages['Média DP Família']}</td>
                        <td style={{fontWeight: 800}}>{footerAverages['Média NIES Família']}</td>
                        <td><span className="kpi-trend" style={{background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24'}}>{footerAverages['Média DP Família'] > 0 ? Math.round((footerAverages['Média NIES Família']/footerAverages['Média DP Família'])*100) : 0}%</span></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* PAIR 3: GERAL */}
                <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(16, 185, 129, 0.1)' }}>
                    <h3 className="chart-title" style={{color: '#34d399'}}>Média Geral</h3>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>Mês</th><th>DPs Totais</th><th>NIES Total</th><th>NIES %</th></tr></thead>
                    <tbody>
                      {averages.map(r => {
                        const pct = r['Média DP Geral'] > 0 ? Math.round((r['Média NIES Geral'] / r['Média DP Geral']) * 100) : 0;
                        const isGood = pct >= 50;
                        return (
                          <tr key={r.Mes}>
                            <td>{r.Mes}</td>
                            <td 
                              title={`Base: ${r['DP Geral Defs']} defensores totais`} 
                              onClick={() => setModalInfo({title: `Média Geral (${r.Mes})`, content: `Esta média combinada de ${r['Média DP Geral']} foi calculada baseada na produção total de ${r['DP Geral Defs']} defensores oficiais (Cível + Família).`})}
                              style={{cursor: 'pointer', textDecoration: 'underline dotted rgba(255,255,255,0.3)'}}
                            >
                              {r['Média DP Geral']}
                            </td>
                            <td style={{fontWeight: 700}}>{r['Média NIES Geral']}</td>
                            <td><span className="kpi-trend" style={{background: isGood ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: isGood ? '#34d399' : '#10b981', boxShadow: isGood ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none'}}>{pct}%</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{fontWeight: 700}}>{footerAverages.Mes}</td>
                        <td style={{fontWeight: 700}}>{footerAverages['Média DP Geral']}</td>
                        <td style={{fontWeight: 800}}>{footerAverages['Média NIES Geral']}</td>
                        <td><span className="kpi-trend" style={{background: 'rgba(16, 185, 129, 0.2)', color: '#34d399'}}>{footerAverages['Média DP Geral'] > 0 ? Math.round((footerAverages['Média NIES Geral']/footerAverages['Média DP Geral'])*100) : 0}%</span></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 2: RANKINGS */}
        {activeTab === 2 && (
          <div className="tab-content fade-in">
            <h1 className="title" style={{ fontSize: '24px', marginBottom: '24px' }}>Rankings Totais (Todos os Tempos)</h1>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <h2 className="chart-title">Ranking: NIES (Interno)</h2>
                </div>
                <ul className="ranking-list">
                  {rankingNies.map((item, idx) => (
                    <li key={item.name}>
                      <span className="rank-pos">{idx + 1}º</span>
                      <span className="rank-name">{item.name}</span>
                      <span className="rank-count" style={{color: '#10b981'}}>{item.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <h2 className="chart-title">Ranking: {comarca === 'Belém' ? 'NAEFA (Família)' : (comarca === 'Ananindeua' ? 'Família (Ananindeua)' : 'Família (Icoaraci)')}</h2>
                </div>
                <ul className="ranking-list">
                  {rankingFamDP.map((item, idx) => (
                    <li key={item.name}>
                      <span className="rank-pos">{idx + 1}º</span>
                      <span className="rank-name">{item.name}</span>
                      <span className="rank-count">{item.count}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <h2 className="chart-title">Ranking: {comarca === 'Belém' ? 'Cível Oficial' : (comarca === 'Ananindeua' ? 'Cível (Ananindeua)' : 'Cível (Icoaraci)')}</h2>
                </div>
                <ul className="ranking-list">
                  {rankingCivDP.map((item, idx) => (
                    <li key={item.name}>
                      <span className="rank-pos">{idx + 1}º</span>
                      <span className="rank-name">{item.name}</span>
                      <span className="rank-count">{item.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* RANKING MENSAL MISTO */}
            <div style={{ width: '100%', marginTop: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h1 className="title" style={{ fontSize: '20px' }}>Ranking Mensal Unificado (Oficial + NIES)</h1>
                <select 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(e.target.value)}
                  style={{
                    padding: '8px 16px', background: 'rgba(255,255,255,0.1)',
                    color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer', outline: 'none'
                  }}
                >
                  {availableMonths.map(m => <option key={m} value={m} style={{color:'#000'}}>{m}</option>)}
                </select>
              </div>

              <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                
                <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <h2 className="chart-title">Ranking Unificado: {comarca === 'Belém' ? 'NAEFA + NIES' : 'Família (Oficial + NIES)'}</h2>
                  </div>
                  <ul className="ranking-list">
                    {monthlyFamRanking.map((item, idx) => (
                      <li key={item.name} style={item.isNies ? { background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.15) 0%, transparent 100%)', borderLeft: '4px solid gold' } : {}}>
                        <span className="rank-pos" style={item.isNies ? {color: 'gold'} : {}}>{idx + 1}º</span>
                        <span className="rank-name" style={item.isNies ? {color: 'gold', fontWeight: 600} : {}}>{item.name} {item.isNies && ' (NIES)'}</span>
                        <span className="rank-count">{item.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <h2 className="chart-title">Ranking Unificado: {comarca === 'Belém' ? 'Cível Oficial + NIES' : 'Cível (Oficial + NIES)'}</h2>
                  </div>
                  <ul className="ranking-list">
                    {monthlyCivRanking.map((item, idx) => (
                      <li key={item.name} style={item.isNies ? { background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.15) 0%, transparent 100%)', borderLeft: '4px solid gold' } : {}}>
                        <span className="rank-pos" style={item.isNies ? {color: 'gold'} : {}}>{idx + 1}º</span>
                        <span className="rank-name" style={item.isNies ? {color: 'gold', fontWeight: 600} : {}}>{item.name} {item.isNies && ' (NIES)'}</span>
                        <span className="rank-count">{item.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                  <div style={{ padding: 20, borderBottom: '1px solid rgba(255, 215, 0, 0.3)', background: 'linear-gradient(90deg, rgba(255,215,0,0.05), transparent)' }}>
                    <h2 className="chart-title" style={{color: '#FFD700'}}>Ranking Unificado: GERAL</h2>
                  </div>
                  <ul className="ranking-list">
                    {monthlyGeralRanking.map((item, idx) => (
                      <li key={item.name} style={item.isNies ? { background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.15) 0%, transparent 100%)', borderLeft: '4px solid gold' } : {}}>
                        <span className="rank-pos" style={item.isNies ? {color: 'gold'} : {}}>{idx + 1}º</span>
                        <span className="rank-name" style={item.isNies ? {color: 'gold', fontWeight: 600} : {}}>{item.name} {item.isNies && ' (NIES)'}</span>
                        <span className="rank-count">{item.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>


              </div>
            </div>

          </div>
        )}

        {/* TAB 3: DEMANDAS (AÇÕES) */}
        {activeTab === 3 && (
          <div className="tab-content fade-in">
            <h1 className="title" style={{ fontSize: '24px', marginBottom: '24px' }}>Rankings Absolutos de Demandas ({comarca})</h1>
            
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <h2 className="chart-title" style={{marginBottom: comarca === 'Belém' ? 12 : 0}}>Top Demandas: NIES</h2>
                  {comarca === 'Belém' && (
                    <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 8, width: 'fit-content' }}>
                      <button 
                        onClick={() => setDemandasNiesView('solar')}
                        style={{ padding: '4px 12px', fontSize: 11, borderRadius: 6, border: 'none', cursor: 'pointer', background: demandasNiesView === 'solar' ? 'var(--accent-primary)' : 'transparent', color: '#fff', fontWeight: demandasNiesView === 'solar' ? 600 : 400 }}
                      >SOLAR</button>
                      <button 
                        onClick={() => setDemandasNiesView('scpj')}
                        style={{ padding: '4px 12px', fontSize: 11, borderRadius: 6, border: 'none', cursor: 'pointer', background: demandasNiesView === 'scpj' ? 'var(--accent-secondary)' : 'transparent', color: '#fff', fontWeight: demandasNiesView === 'scpj' ? 600 : 400 }}
                      >SCPJ</button>
                      <button 
                        onClick={() => setDemandasNiesView('unificado')}
                        style={{ padding: '4px 12px', fontSize: 11, borderRadius: 6, border: 'none', cursor: 'pointer', background: demandasNiesView === 'unificado' ? 'linear-gradient(45deg, #10b981, #3b82f6)' : 'transparent', color: '#fff', fontWeight: demandasNiesView === 'unificado' ? 600 : 400 }}
                      >UNIFICADO</button>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <ul className="ranking-list">
                    {acoesNies.map((item, idx) => (
                      <li key={item.name}>
                        <span className="rank-pos">{idx + 1}º</span>
                        <span className="rank-name" style={{fontSize: 11}}>{item.name}</span>
                        <span className="rank-count" style={{color: '#10b981'}}>{item.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <h2 className="chart-title">{`Top Demandas: ${comarca === 'Belém' ? 'NAEFA (Família)' : (comarca === 'Ananindeua' ? 'Família (Ananindeua)' : 'Família (Icoaraci)')}`}</h2>
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <ul className="ranking-list">
                    {acoesFamDP.map((item, idx) => (
                      <li key={item.name}>
                        <span className="rank-pos">{idx + 1}º</span>
                        <span className="rank-name" style={{fontSize: 11}}>{item.name}</span>
                        <span className="rank-count">{item.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <h2 className="chart-title">{`Top Demandas: ${comarca === 'Belém' ? 'DPs Cíveis' : (comarca === 'Ananindeua' ? 'Cível (Ananindeua)' : 'Cível (Icoaraci)')}`}</h2>
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <ul className="ranking-list">
                    {acoesCivDP.map((item, idx) => (
                      <li key={item.name}>
                        <span className="rank-pos">{idx + 1}º</span>
                        <span className="rank-name" style={{fontSize: 11}}>{item.name}</span>
                        <span className="rank-count">{item.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div style={{ width: '100%', marginTop: '32px' }}>
              <h1 className="title" style={{ fontSize: '24px', marginBottom: '24px' }}>Tabelas Cruzadas de Demandas (Impacto NIES)</h1>
              <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                
                {/* FAMILIA */}
                <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <h2 className="chart-title">Demandas Família</h2>
                  </div>
                  <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table className="data-table" style={{ fontSize: '12px' }}>
                      <thead><tr><th style={{textAlign: 'left'}}>Ação</th><th>Total</th><th>NIES</th><th>%</th></tr></thead>
                      <tbody>
                        {demandasFam.map((d, i) => (
                          <tr key={i} style={d.nies > 0 ? {background: 'rgba(255,215,0,0.02)'} : {}}>
                            <td style={{textAlign: 'left', fontWeight: 600}}>{d.name}</td>
                            <td>{d.total}</td>
                            <td style={d.nies > 0 ? {color: 'gold'} : {}}>{d.nies}</td>
                            <td>{d.niesPercent > 0 ? <span style={{color: 'gold', fontWeight: 'bold'}}>{d.niesPercent}%</span> : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CIVEL */}
                <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <h2 className="chart-title">Demandas Cível</h2>
                  </div>
                  <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table className="data-table" style={{ fontSize: '12px' }}>
                      <thead><tr><th style={{textAlign: 'left'}}>Ação</th><th>Total</th><th>NIES</th><th>%</th></tr></thead>
                      <tbody>
                        {demandasCiv.map((d, i) => (
                          <tr key={i} style={d.nies > 0 ? {background: 'rgba(255,215,0,0.02)'} : {}}>
                            <td style={{textAlign: 'left', fontWeight: 600}}>{d.name}</td>
                            <td>{d.total}</td>
                            <td style={d.nies > 0 ? {color: 'gold'} : {}}>{d.nies}</td>
                            <td>{d.niesPercent > 0 ? <span style={{color: 'gold', fontWeight: 'bold'}}>{d.niesPercent}%</span> : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* GERAL */}
                <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                  <div style={{ padding: 20, borderBottom: '1px solid rgba(255, 215, 0, 0.3)', background: 'linear-gradient(90deg, rgba(255,215,0,0.05), transparent)' }}>
                    <h2 className="chart-title" style={{color: '#FFD700'}}>Demandas GERAL</h2>
                  </div>
                  <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table className="data-table" style={{ fontSize: '12px' }}>
                      <thead><tr><th style={{textAlign: 'left'}}>Ação</th><th>Total</th><th>NIES</th><th>%</th></tr></thead>
                      <tbody>
                        {demandasGeral.map((d, i) => (
                          <tr key={i} style={d.nies > 0 ? {background: 'rgba(255,215,0,0.02)'} : {}}>
                            <td style={{textAlign: 'left', fontWeight: 600}}>{d.name}</td>
                            <td>{d.total}</td>
                            <td style={d.nies > 0 ? {color: 'gold'} : {}}>{d.nies}</td>
                            <td>{d.niesPercent > 0 ? <span style={{color: 'gold', fontWeight: 'bold'}}>{d.niesPercent}%</span> : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SISTEMAS */}
        {activeTab === 4 && (
          <div className="glass-panel chart-card" style={{ gridColumn: '1 / -1' }}>
            <div className="chart-header">
              <h2 className="chart-title">Distribuição Interna NIES (SOLAR vs SCPJ)</h2>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartSistemasData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Bar dataKey="SOLAR" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="SCPJ" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}


        {/* TAB 5: AUDITORIA */}
        {activeTab === 5 && (
          <div className="tab-content fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <h1 className="title" style={{ fontSize: '24px' }}>Auditoria de Processos ({auditoriaFiltrada.length} registros)</h1>
              {auditoriaFiltrada.length > 0 && (
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: 8 }}>
                  Período: {auditoriaFiltrada[auditoriaFiltrada.length - 1].data.substring(0, 10)} até {auditoriaFiltrada[0].data.substring(0, 10)}
                </div>
              )}
            </div>

            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 24 }}>
              <div className="glass-panel" style={{ padding: 16 }}>
                <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>Filtrar Comarcas</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {['Belém', 'Ananindeua', 'Icoaraci'].map(c => (
                    <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                      <input type="checkbox" checked={filtrosAuditoria.comarcas[c] !== false} onChange={() => handleToggleFiltro('comarcas', c)} />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="glass-panel" style={{ padding: 16 }}>
                <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>Filtrar Grupos</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {Object.keys(filtrosAuditoria.grupos).map(g => (
                    <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                      <input type="checkbox" checked={filtrosAuditoria.grupos[g] !== false} onChange={() => handleToggleFiltro('grupos', g)} />
                      {g}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: '12px', width: '100%', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 10 }}>
                    <tr>
                      <th style={{ padding: '12px 16px' }}>Data</th>
                      <th style={{ padding: '12px 16px' }}>Processo</th>
                      <th style={{ padding: '12px 16px' }}>Ação</th>
                      <th style={{ padding: '12px 16px' }}>Defensoria</th>
                      <th style={{ padding: '12px 16px' }}>Comarca</th>
                      <th style={{ padding: '12px 16px' }}>Grupo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditoriaFiltrada.slice(0, 200).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{row.data}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{row.processo}</td>
                        <td style={{ padding: '12px 16px' }}>{row.acao}</td>
                        <td style={{ padding: '12px 16px', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.defensoria}>{row.defensoria}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{row.comarca}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ 
                            padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                            background: row.grupo.includes('NIES') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.1)',
                            color: row.grupo.includes('NIES') ? '#10b981' : 'var(--text-secondary)'
                          }}>
                            {row.grupo}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {auditoriaFiltrada.length > 200 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 16, color: 'var(--text-secondary)' }}>
                          Mostrando os primeiros 200 registros de {auditoriaFiltrada.length}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {/* TAB 6: IMPACTO NIES */}
        {activeTab === 6 && (
          <div className="tab-content fade-in">
            {comarca !== 'Belém' ? (
              <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
                <Activity size={48} style={{ color: 'var(--text-secondary)', marginBottom: 16 }} />
                <h2 style={{ fontSize: 24, marginBottom: 8 }}>Impacto não disponível</h2>
                <p style={{ color: 'var(--text-secondary)' }}>A aba de Impacto está disponível apenas para a comarca de Belém no momento.</p>
                <button onClick={() => setComarca('Belém')} className="tab-button active" style={{ marginTop: 24, padding: '12px 24px' }}>Mudar para Belém</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                <div>
                  <h1 className="title" style={{ fontSize: '24px', marginBottom: '8px' }}>Impacto Geral do NIES ({comarca})</h1>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Comparativo do volume protocolado pelo NIES frente ao total de processos em Belém.</p>
                </div>

                {impactoData.length > 0 && (
                  <div className="responsive-grid-3">
                    <div className="glass-panel kpi-card">
                      <p className="kpi-title">TOTAL PROTOCOLADO ({comarca})</p>
                      <h3 className="kpi-value">{totalProtocolado.toLocaleString()} <span style={{fontSize: 16, fontWeight: 400, color: 'var(--text-secondary)'}}>processos</span></h3>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        <span style={{color: '#fff', fontWeight: 600}}>{totalDpDefs}</span> defensores assinaram
                      </p>
                    </div>
                    
                    <div className="glass-panel kpi-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))' }}>
                      <p className="kpi-title" style={{ color: '#fff' }}>TOTAL NIES (Solar + SCPJ)</p>
                      <h3 className="kpi-value" style={{ color: 'var(--accent-secondary)' }}>{totalNies.toLocaleString()} <span style={{fontSize: 16, fontWeight: 400, color: 'var(--text-secondary)'}}>processos</span></h3>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        <span style={{color: '#fff', fontWeight: 600}}>{totalNiesDefs}</span> defensoras assinaram
                      </p>
                    </div>
                    
                    <div className="glass-panel kpi-card" style={{ border: '1px solid rgba(255, 215, 0, 0.3)', background: 'rgba(255, 215, 0, 0.05)' }}>
                      <p className="kpi-title" style={{ color: 'gold' }}>PARTICIPAÇÃO %</p>
                      <h3 className="kpi-value" style={{ color: 'gold' }}>
                        {pctGeral}%
                      </h3>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        do volume total com apenas <span style={{color: 'gold', fontWeight: 600}}>{totalDpDefs > 0 ? ((totalNiesDefs / totalDpDefs) * 100).toFixed(1) : 0}%</span> do quadro
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="responsive-grid-3">
                  <div className="glass-panel chart-card" style={{ gridColumn: '1 / -1' }}>
                    <div className="chart-header">
                      <h2 className="chart-title">Adoção Mensal do NIES em Relação ao Total (%)</h2>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={impactoData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="gold" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="gold" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                        <XAxis dataKey="mes" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-secondary)" tickLine={false} axisLine={false} unit="%" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="nies_percent" name="% NIES no Mês" stroke="gold" strokeWidth={3} fill="url(#colorPct)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <h2 className="chart-title">Breakdown: Composição do Impacto (Solar vs SCPJ)</h2>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Mês</th>
                          <th>Total Belém</th>
                          <th style={{color: '#60a5fa'}}>Belém Cível</th>
                          <th style={{color: '#f472b6'}}>Belém Fam.</th>
                          <th style={{color: 'gold'}}>NIES (Solar)</th>
                          <th style={{color: 'var(--accent-secondary)'}}>NIES (SCPJ)</th>
                          <th>NIES Total</th>
                          <th style={{background: 'rgba(255,215,0,0.1)', color: 'gold'}}>% NIES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {impactoNies.map(r => (
                          <tr key={r.mes}>
                            <td style={{fontWeight: 600}}>{r.mes}</td>
                            <td>{r.belem_total}</td>
                            <td style={{color: '#60a5fa'}}>{r.belem_civel}</td>
                            <td style={{color: '#f472b6'}}>{r.belem_familia}</td>
                            <td style={{color: 'gold'}}>{r.nies_solar}</td>
                            <td style={{color: 'var(--accent-secondary)'}}>{r.nies_scpj}</td>
                            <td style={{fontWeight: 600}}>{r.nies_total}</td>
                            <td style={{background: 'rgba(255,215,0,0.1)', color: 'gold', fontWeight: 'bold'}}>{r.nies_percent}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                {/* Eficiência da Equipe de Apoio */}
                {servidoresStats.length > 0 && (
                  <div className="glass-panel chart-card" style={{ marginTop: '32px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <div className="chart-header">
                      <h2 className="chart-title" style={{ color: '#10b981' }}>Eficiência da Equipe de Apoio (Servidores e Assessores)</h2>
                      <p style={{ color: 'var(--text-secondary)' }}>
                        Relação de protocolos enviados pela equipe de apoio frente ao quadro de servidores ativos em Belém.
                      </p>
                    </div>
                    <div style={{ overflowX: 'auto', marginTop: 16 }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Área / Núcleo</th>
                            <th>Protocolos Enviados</th>
                            <th>Qtd. Defensores</th>
                            <th>Qtd. Servidores (Apoio)</th>
                            <th style={{color: 'gold'}}>Média (Processos / Servidor)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {servidoresStats.map((row, idx) => (
                            <tr key={idx} style={row.Area.includes('NIES') ? {background: 'rgba(16, 185, 129, 0.05)'} : {}}>
                              <td style={row.Area.includes('NIES') ? {fontWeight: 'bold', color: 'var(--accent-secondary)'} : {fontWeight: 600}}>{row.Area}</td>
                              <td>{row.Protocolos}</td>
                              <td>{row.Defensores}</td>
                              <td>{row.Servidores}</td>
                              <td style={{color: 'gold', fontWeight: 'bold'}}>{row.Relacao_Processo_Servidor}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                </div>

                {/* Comparativo de Núcleos Cíveis (Fazenda, Residual, etc) */}
                {comparativoNucleos.length > 0 && (
                  <div className="glass-panel chart-card" style={{ marginTop: '32px' }}>
                    <div className="chart-header">
                      <h2 className="chart-title">Comparativo de Núcleos Cíveis (Belém)</h2>
                      <p style={{ color: 'var(--text-secondary)' }}>Evolução de protocolos iniciais do NIES Cível contra Fazenda Pública, Cível Residual, Consumidor e Moradia.</p>
                    </div>
                    <div style={{ width: '100%', height: 400 }}>
                      <ResponsiveContainer>
                        <LineChart data={comparativoNucleos} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="mes" stroke="rgba(255,255,255,0.5)" />
                          <YAxis stroke="rgba(255,255,255,0.5)" />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                          <Legend />
                          <Line type="monotone" dataKey="nies_civel" name="NIES (Cível)" stroke="var(--accent-secondary)" strokeWidth={4} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                          <Line type="monotone" dataKey="fazenda" name="Fazenda Pública" stroke="#10b981" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="consumidor" name="Consumidor" stroke="#f59e0b" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="residual" name="Cível Residual" stroke="#ec4899" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="moradia" name="Moradia" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* TAB 7: PRODUTIVIDADE DEFENSORAS NIES */}
        {activeTab === 7 && (
          <div className="tab-content fade-in">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h1 className="title" style={{ fontSize: '24px', marginBottom: '8px' }}>Produtividade: Defensoras do NIES</h1>
                  <p style={{ color: 'var(--text-secondary)' }}>Detalhamento da atuação (Família vs Cível) e cruzamento de sistemas (Solar vs SCPJ).</p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <select 
                    className="filter-select"
                    value={selectedDefensoraMes}
                    onChange={e => setSelectedDefensoraMes(e.target.value)}
                  >
                    <option value="Total">Total Acumulado (2026)</option>
                    {[...new Set(defensorasData.map(d => d.mes))].sort().map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  
                  <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 8 }}>
                    <button 
                      onClick={() => setProdutividadeView('solar')}
                      style={{ padding: '6px 16px', fontSize: 12, borderRadius: 6, border: 'none', cursor: 'pointer', background: produtividadeView === 'solar' ? 'var(--accent-primary)' : 'transparent', color: '#fff', fontWeight: produtividadeView === 'solar' ? 600 : 400 }}
                    >SOLAR</button>
                    <button 
                      onClick={() => setProdutividadeView('scpj')}
                      style={{ padding: '6px 16px', fontSize: 12, borderRadius: 6, border: 'none', cursor: 'pointer', background: produtividadeView === 'scpj' ? 'var(--accent-secondary)' : 'transparent', color: '#fff', fontWeight: produtividadeView === 'scpj' ? 600 : 400 }}
                    >SCPJ</button>
                    <button 
                      onClick={() => setProdutividadeView('unificado')}
                      style={{ padding: '6px 16px', fontSize: 12, borderRadius: 6, border: 'none', cursor: 'pointer', background: produtividadeView === 'unificado' ? 'linear-gradient(45deg, #10b981, #3b82f6)' : 'transparent', color: '#fff', fontWeight: produtividadeView === 'unificado' ? 600 : 400 }}
                    >UNIFICADO</button>
                  </div>
                </div>
              </div>

              {/* Aggregated data per defensora */}
              <div className="responsive-grid-3">
                {['ANA MARINA', 'PAULA CUNHA', 'VERENA MAUÉS'].map(defensora => {
                  // Filter data
                  const dataRows = defensorasData.filter(d => 
                    d.defensora === defensora && 
                    (selectedDefensoraMes === 'Total' || d.mes === selectedDefensoraMes)
                  );
                  
                  // Aggregate
                  const agg = {
                    fam_solar: dataRows.reduce((sum, r) => sum + r.fam_solar, 0),
                    fam_scpj: dataRows.reduce((sum, r) => sum + r.fam_scpj, 0),
                    fam_total: dataRows.reduce((sum, r) => sum + r.fam_total, 0),
                    civ_solar: dataRows.reduce((sum, r) => sum + r.civ_solar, 0),
                    civ_scpj: dataRows.reduce((sum, r) => sum + r.civ_scpj, 0),
                    civ_total: dataRows.reduce((sum, r) => sum + r.civ_total, 0),
                    total_geral: dataRows.reduce((sum, r) => sum + r.total_geral, 0)
                  };

                  // Aggregate actions based on view
                  let topAcoes = [];
                  if (selectedDefensoraMes === 'Total') {
                    const acoesCount = {};
                    dataRows.forEach(r => {
                      const listToUse = produtividadeView === 'solar' ? r.top_acoes_solar :
                                        produtividadeView === 'scpj' ? r.top_acoes_scpj :
                                        r.top_acoes_total;
                      listToUse.forEach(a => {
                        acoesCount[a.name] = (acoesCount[a.name] || 0) + a.count;
                      });
                    });
                    topAcoes = Object.entries(acoesCount).map(([name, count]) => ({name, count})).sort((a,b) => b.count - a.count);
                  } else {
                    if (dataRows.length > 0) {
                      topAcoes = produtividadeView === 'solar' ? dataRows[0].top_acoes_solar :
                                 produtividadeView === 'scpj' ? dataRows[0].top_acoes_scpj :
                                 dataRows[0].top_acoes_total;
                    }
                  }

                  return (
                    <div key={defensora} className="glass-panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ padding: 20, background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--accent-primary)' }}>{defensora}</h2>
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 32, fontWeight: 800 }}>{agg.total_geral}</span>
                          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>processos totais</span>
                        </div>
                      </div>

                      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                          {/* FAMILIA */}
                          <div style={{ background: 'rgba(244, 114, 182, 0.05)', padding: 12, borderRadius: 8, border: '1px solid rgba(244, 114, 182, 0.2)' }}>
                            <div style={{ fontSize: 12, color: '#f472b6', fontWeight: 600, marginBottom: 8 }}>FAMÍLIA ({agg.fam_total})</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Solar</span>
                              <span style={{ fontWeight: 600 }}>{agg.fam_solar}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                              <span style={{ color: 'var(--text-secondary)' }}>SCPJ</span>
                              <span style={{ fontWeight: 600 }}>{agg.fam_scpj}</span>
                            </div>
                          </div>

                          {/* CÍVEL */}
                          <div style={{ background: 'rgba(96, 165, 250, 0.05)', padding: 12, borderRadius: 8, border: '1px solid rgba(96, 165, 250, 0.2)' }}>
                            <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600, marginBottom: 8 }}>CÍVEL ({agg.civ_total})</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Solar</span>
                              <span style={{ fontWeight: 600 }}>{agg.civ_solar}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                              <span style={{ color: 'var(--text-secondary)' }}>SCPJ</span>
                              <span style={{ fontWeight: 600 }}>{agg.civ_scpj}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 }}>
                            Ranking de Ações ({produtividadeView.toUpperCase()})
                          </h3>
                          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '300px', paddingRight: 4 }}>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {topAcoes.map((acao, idx) => (
                                <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                  <span style={{ color: '#e2e8f0', flex: 1, paddingRight: 8, lineHeight: 1.4 }} title={acao.name}>
                                    {idx + 1}. {acao.name}
                                  </span>
                                  <span style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>{acao.count}</span>
                                </li>
                              ))}
                              {topAcoes.length === 0 && <li style={{fontSize: 12, color: 'var(--text-secondary)'}}>Sem dados para o período</li>}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </section>
    </div>
  );
};

export default App;

