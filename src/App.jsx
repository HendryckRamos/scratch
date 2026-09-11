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
  const [sistemas, setSistemas] = useState([]); // from nies_consolidado
    const [rankingsGlobal, setRankingsGlobal] = useState([]);
    const [selectedGlobalMonth, setSelectedGlobalMonth] = useState('01/2026');
  const [loading, setLoading] = useState(true);
  
  // Tabs: 1=Matrizes/Tabelas, 2=Rankings, 3=Demandas, 4=Sistemas NIES
  const [activeTab, setActiveTab] = useState(1);
  const [modalInfo, setModalInfo] = useState(null);
  const [comarca, setComarca] = useState('Belém');
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
      fetch(`/data/auditoria_completa.json?t=${t}`).then(r => r.json()).catch(() => [])
    ]).then(([t, a, rDefs, rAcoes, sis, rGlobal, aud]) => {
      setTotals(t);
      setAverages(a);
      setRankingsDefs(rDefs);
      setRankingsAcoes(rAcoes);
      setSistemas(sis);
      setRankingsGlobal(rGlobal);
      setAuditoriaData(aud || []);
      setLoading(false);
    }).catch(err => {
      console.error("Erro ao carregar dados avançados", err);
      setLoading(false);
    });
  }, [comarca]);

  if (loading) {
  
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
  const footerTotals = calculateFooterTotals(totals);
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
  const getAcoes = (groupPrefix) => {
    const acc = {};
    rankingsAcoes.filter(d => d.Grupo.startsWith(groupPrefix)).forEach(d => {
      acc[d.Ações] = (acc[d.Ações] || 0) + d.Processos;
    });
    return Object.entries(acc).map(([name, count]) => ({name, count})).sort((a,b) => b.count - a.count);
  };
  const acoesNies = getAcoes('NIES');
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

  
  // --- TAB 5 CALCULATIONS (Megaranking Global) ---
  const availableGlobalMonths = [...new Set(rankingsGlobal.map(d => d.Mes))].sort();
  
  const getGlobalMonthlyRanking = (mes) => {
    const filtered = rankingsGlobal.filter(d => d.Mes === mes);
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
  
  const getGlobalAllTimeRanking = () => {
    const aggregated = rankingsGlobal.reduce((acc, curr) => {
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

  const globalMonthlyRanking = getGlobalMonthlyRanking(selectedGlobalMonth);
  const globalAllTimeRanking = getGlobalAllTimeRanking();

// --- TAB 4 CALCULATIONS (Sistemas NIES) ---
  const monthsSistemas = Array.from(new Set(sistemas.map(d => d.mes))).sort((a,b) => {
    const [ma, ya] = a.split('/');
    const [mb, yb] = b.split('/');
    return new Date(`${ya}-${ma}-01`) - new Date(`${yb}-${mb}-01`);
  });
  const chartSistemasData = monthsSistemas.map(mes => {
    const monthData = sistemas.filter(d => d.mes === mes);
    return {
      mes,
      'SOLAR': monthData.filter(d => d.sistema === 'SOLAR').reduce((acc, curr) => acc + curr.quantidade, 0),
      'SCPJ': monthData.filter(d => d.sistema === 'SCPJ').reduce((acc, curr) => acc + curr.quantidade, 0),
    };
  });


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
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16, marginTop: 16 }}>
        <button className={`tab-button ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}><LayoutDashboard size={14} style={{display:'inline', marginRight:6}}/> Matrizes Mensais</button>
        <button className={`tab-button ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}><Trophy size={14} style={{display:'inline', marginRight:6}}/> Ranking Defensores</button>
        <button className={`tab-button ${activeTab === 3 ? 'active' : ''}`} onClick={() => setActiveTab(3)}><ListOrdered size={14} style={{display:'inline', marginRight:6}}/> Top Demandas (Ações)</button>
        <button className={`tab-button ${activeTab === 4 ? 'active' : ''}`} onClick={() => setActiveTab(4)}><Activity size={14} style={{display:'inline', marginRight:6}}/> Sistemas NIES</button>
        <button className={`tab-button ${activeTab === 5 ? 'active' : ''}`} onClick={() => setActiveTab(5)}><Database size={14} style={{display:'inline', marginRight:6}}/> Auditoria</button>
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
                    <h3 className="chart-title" style={{color: '#60a5fa'}}>Comparativo Cível</h3>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>Mês</th><th>DP Oficial</th><th>NIES</th><th>NIES %</th></tr></thead>
                    <tbody>
                      {totals.map(r => {
                        const pct = r['DP Cível'] > 0 ? Math.round((r['NIES Cível'] / r['DP Cível']) * 100) : 0;
                        const isGood = pct >= 50;
                      
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
                      {totals.map(r => {
                        const pct = r['DP Família'] > 0 ? Math.round((r['NIES Família'] / r['DP Família']) * 100) : 0;
                        const isGood = pct >= 50;
                      
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
                      {totals.map(r => {
                        const pct = r['DP Geral'] > 0 ? Math.round((r['NIES Geral'] / r['DP Geral']) * 100) : 0;
                        const isGood = pct >= 50;
                      
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
              <div className="glass-panel chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <h2 className="chart-title">Top Demandas: NIES</h2>
                  <p style={{fontSize: 12, color: 'var(--text-secondary)', marginTop: 4}}>*Inclui contagem manual não catalogada via SCPJ</p>
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
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
      </section>
    </div>
  );
};

export default App;

