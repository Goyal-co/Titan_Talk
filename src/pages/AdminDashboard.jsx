import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Helper function to determine MIME type from URL
const getAudioMimeType = (url) => {
  if (!url) return 'audio/mpeg';
  const ext = url.split('.').pop().toLowerCase();
  switch(ext) {
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'ogg': return 'audio/ogg';
    case 'webm': return 'audio/webm';
    case 'm4a': return 'audio/mp4';
    default: return 'audio/mpeg'; // default to MP3
  }
};

const AdminDashboard = () => {
  const [showProjectObjections, setShowProjectObjections] = useState(false);
const [projectObjections, setProjectObjections] = useState([]);

  const navigate = useNavigate();
  const [stats, setStats] = useState({
    conversationsToday: 0,
    pitchAvg: 0,
    topObjections: "Loading...",
  });
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartData, setChartData] = useState({ objectionBreakdown: [], pitchTrend: [] });
  
  // Log chartData changes for debugging
  useEffect(() => {
    console.log('Chart data updated:', chartData);
    if (chartData?.pitchTrend) {
      console.log('Pitch trend data:', chartData.pitchTrend);
      console.log('Pitch trend data type:', typeof chartData.pitchTrend);
      console.log('Pitch trend data length:', chartData.pitchTrend.length);
      console.log('First pitch trend item:', chartData.pitchTrend[0]);
    }
  }, [chartData]);
  const [selectedProject, setSelectedProject] = useState("All Projects");
  const [selectedSalesperson, setSelectedSalesperson] = useState("All Salespersons");
  const [timePeriod, setTimePeriod] = useState("day");
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchStatsAndRecordings();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchStatsAndRecordings(), 30000);
    return () => clearInterval(interval);
  }, [timePeriod]); // Add timePeriod as a dependency

  const fetchStatsAndRecordings = async (forceRefresh = false) => {
    setLoading(true);
    setIsLoadingChart(true);
    try {
      console.log(' Fetching admin dashboard data...', forceRefresh ? '(FORCE REFRESH)' : '');
      
      // Add cache busting for force refresh and include time period
      const params = new URLSearchParams();
      if (forceRefresh) params.append('t', Date.now());
      params.append('period', timePeriod);
      
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/admin/dashboard?${params.toString()}`;
      console.log(' API URL:', url);
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log(' Response status:', res.status, res.statusText);
      
      const data = await res.json();
      console.log(' Raw API Response:', JSON.stringify(data, null, 2));
      console.log(' ChartData structure:', data.chartData);
      console.log(' PitchTrend data:', data.chartData?.pitchTrend);
      
      if (res.ok) {
        const newStats = {
          conversationsToday: Number(data.conversationsToday) || 0,
          pitchAvg: Number(data.pitchAvg) || 0,
          topObjections: data.topObjections || "No data",
        };
        
        console.log(' Setting new stats:', newStats);
        console.log(' Chart data received:', data.chartData);
        console.log(' Pitch trend data:', data.chartData?.pitchTrend);
        
        setStats(newStats);
        setRecordings(data.recent || []);
        setChartData(data.chartData || { objectionBreakdown: [], pitchTrend: [] });
        setProjectObjections(data.projectObjections || []);
        setError(""); // Clear any previous errors
      } else {
        console.error(" Failed to fetch admin stats:", data);
        setError("Failed to fetch dashboard data");
      }
    } catch (err) {
      console.error(" Error fetching admin dashboard:", err);
      setError("Network error: " + err.message);
    } finally {
      setLoading(false);
      setIsLoadingChart(false);
    }
  };

  // Filter recordings based on selected criteria
  const filteredRecordings = recordings.filter((rec) => {
    return (
      (selectedProject === "All Projects" || rec.project === selectedProject) &&
      (selectedSalesperson === "All Salespersons" || rec.userName === selectedSalesperson || rec.email === selectedSalesperson)
    );
  });

  const pageCount = Math.ceil(filteredRecordings.length / itemsPerPage);
  const paginatedData = filteredRecordings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const uniqueProjects = [...new Set(recordings.map((r) => r.project).filter(Boolean))];
  const uniqueSalespersons = [...new Set(recordings.map((r) => r.userName || r.email))];

  // Helper function to render project objections in a table
  const renderProjectObjections = (objections) => {
    if (!objections || objections.length === 0) {
      return <div className="text-gray-400 text-xs italic">No objection data available</div>;
    }

    return (
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left text-gray-500 pb-1">Objection</th>
            <th className="text-left text-gray-500 pb-1">Count</th>
          </tr>
        </thead>
        <tbody>
          {objections.map((obj, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="text-gray-700 py-1">{obj.name || 'No objections'}</td>
              <td className="text-gray-700 py-1">{obj.count || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Leaderboard calculation
  const leaderboard = React.useMemo(() => {
    const scores = {};
    recordings.forEach((rec) => {
      const key = rec.userName || rec.email || 'Unknown';
      if (!scores[key]) scores[key] = { total: 0, count: 0 };
      if (rec.score && rec.score > 0) {
        scores[key].total += rec.score;
        scores[key].count += 1;
      }
    });
    return Object.entries(scores)
      .map(([name, { total, count }]) => ({
        name,
        avgScore: count ? (total / count).toFixed(2) : 0,
        count
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [recordings]);

  return (
    <div className="min-h-screen bg-[#f7fbff] p-6 font-sans">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => fetchStatsAndRecordings(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            disabled={loading}
          >
            {loading ? '🔄 Refreshing...' : '🔄 Refresh Data'}
          </button>
          <button className="text-blue-600 font-medium hover:underline">Log out</button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-md">
          <p className="text-sm text-gray-500">Conversations Today</p>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-2xl font-bold text-gray-800">{stats.conversationsToday}</p>
            {loading && <span className="text-xs text-blue-500">🔄</span>}
            {stats.conversationsToday > 0 && <span className="text-xs text-green-500">✅</span>}
            {stats.conversationsToday === 0 && !loading && <span className="text-xs text-orange-500">⚠️</span>}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {loading ? 'Loading...' : `Last updated: ${new Date().toLocaleTimeString()}`}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md">
          <p className="text-sm text-gray-500">Pitch Score Avg.</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">{stats.pitchAvg}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Top Objections Found</p>
              <p className="text-2xl font-bold text-gray-800">{stats.topObjections}</p>
            </div>
            <button 
              onClick={() => setShowProjectObjections((v) => !v)}
              className="text-sm text-blue-600 hover:underline"
            >
              {showProjectObjections ? 'Hide details' : 'Show details'}
            </button>
          </div>
          
          {showProjectObjections && (
            <div className="mt-3">
              <div className="mb-3">
                <label htmlFor="projectFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Project:
                </label>
                <select
                  id="projectFilter"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="All Projects">All Projects</option>
                  {uniqueProjects.filter(p => p).map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="border-t pt-2 max-h-64 overflow-y-auto space-y-4">
                {!projectObjections || projectObjections.length === 0 ? (
                  <div className="text-gray-400 text-sm py-2">
                    No project data available. Recordings may not have project assignments.
                  </div>
                ) : selectedProject === "All Projects" ? (
                  // Show all projects when 'All Projects' is selected
                  projectObjections.map((proj) => (
                    <div key={proj.project || 'unknown'} className="border-b pb-2 last:border-b-0">
                      <div className="font-semibold text-gray-700 mb-1">{proj.project || 'Unassigned'}</div>
                      {renderProjectObjections(proj.objections)}
                    </div>
                  ))
                ) : (
                  // Show only selected project
                  (() => {
                    const selectedProj = projectObjections.find(p => p.project === selectedProject);
                    return selectedProj ? (
                      <div className="border-b pb-2">
                        <div className="font-semibold text-gray-700 mb-1">{selectedProj.project || 'Unassigned'}</div>
                        {renderProjectObjections(selectedProj.objections)}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm py-2">
                        No data available for the selected project.
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}
</div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-md h-[300px] col-span-1 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Pitch Score Trend</h3>
            <select 
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              className="text-sm border rounded px-2 py-1 bg-white"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
          
          {isLoadingChart ? (
            <div className="h-[240px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="relative h-[240px]">
              {/* Y-axis with labels */}
              <div className="absolute left-0 top-0 bottom-8 w-8 border-r border-gray-200 flex flex-col justify-between">
                {[10, 8, 6, 4, 2, 0].map((y) => (
                  <div key={y} className="text-xs text-gray-400 text-right pr-1" style={{
                    marginTop: y === 10 ? 0 : -8,
                    marginBottom: y === 0 ? 0 : -8
                  }}>
                    {y}
                  </div>
                ))}
              </div>
              
              {/* Chart area */}
              <div className="absolute left-8 right-0 top-0 bottom-8 pl-2 pr-1 overflow-visible">
                <div className="relative h-full w-full">
                  {/* Grid lines */}
                  {[0, 2, 4, 6, 8, 10].map((y) => (
                    <div 
                      key={y}
                      className="absolute left-0 right-0 border-t border-gray-100"
                      style={{ bottom: `${y * 10}%`, height: '1px' }}
                    ></div>
                  ))}
                  
                  {/* Bars */}
                  <div className="flex h-[200px] items-end justify-between gap-1" style={{ minHeight: '200px' }}>
                    {!chartData?.pitchTrend || !Array.isArray(chartData.pitchTrend) || chartData.pitchTrend.length === 0 ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                        <div>No pitch trend data available</div>
                        <div className="text-xs mt-2 text-gray-500">
                          {!chartData?.pitchTrend ? 'No data' : 
                           !Array.isArray(chartData.pitchTrend) ? 'Invalid data format' : 
                           'No records found for the selected period'}
                        </div>
                      </div>
                    ) : (
                      chartData.pitchTrend.map((item, index) => {
                        if (!item || typeof item.score === 'undefined') {
                          console.warn('Invalid pitch trend item:', item);
                          return null;
                        }
                        
                        // Only show a subset of labels if there are many data points
                        const showLabel = chartData.pitchTrend.length <= 7 || 
                                       index === 0 || 
                                       index === chartData.pitchTrend.length - 1 ||
                                       index % Math.ceil(chartData.pitchTrend.length / 4) === 0;
                        
                        // Convert score to 0-10 scale (divide by 10 if > 10)
                        let score = Number(item.score) || 0;
                        if (score > 10) {
                          score = score / 10;
                        }
                        score = Math.min(Math.max(score, 0), 10);
                        const count = Number(item.count) || 0;
                        
                        // Format date for tooltip
                        let dateStr = '';
                        try {
                          const date = new Date(item.period);
                          if (!isNaN(date.getTime())) {
                            dateStr = date.toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            });
                          } else {
                            dateStr = item.period; // Fallback to raw period if date parsing fails
                          }
                        } catch (e) {
                          dateStr = item.period; // Fallback to raw period on error
                        }
                        
                        console.log(`Bar ${index}:`, { 
                          originalScore: item.score, 
                          normalizedScore: score, 
                          count, 
                          period: item.period,
                          dateStr
                        });
                        
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center group h-full" style={{ minHeight: '200px' }}>
                            <div 
                              className="w-4/5 mx-auto"
                              style={{ 
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'flex-end',
                              }}
                            >
                              <div 
                                className="w-full bg-gradient-to-t from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 rounded-t transition-all relative"
                                style={{
                                  height: `${score * 10}%`,
                                  minHeight: '2px',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                }}
                                title={`${dateStr}\nScore: ${score.toFixed(1)}/10 (${count} ${count === 1 ? 'recording' : 'recordings'})`}
                              >
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  {dateStr}
                                  <div className="text-center">
                                    {score.toFixed(1)}/10 ({count} {count === 1 ? 'recording' : 'recordings'})
                                  </div>
                                </div>
                              </div>
                            </div>
                            {showLabel && (
                              <span className="text-xs text-gray-500 mt-1 truncate w-full text-center">
                                {item.label || 'N/A'}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
              
              {/* X-axis with labels */}
              <div className="absolute left-8 right-0 bottom-0 h-8 flex items-start justify-between px-2">
                {chartData.pitchTrend.length > 0 && (
                  <>
                    <div className="text-xs text-gray-500 text-center w-full">
                      <div className="flex justify-between px-2">
                        <span className="w-1/3 text-left">
                          {chartData.pitchTrend[0].label}
                        </span>
                        {timePeriod === 'day' || timePeriod === 'week' ? (
                          <span className="w-1/3 text-center">
                            {chartData.pitchTrend[Math.floor(chartData.pitchTrend.length / 2)]?.label || ''}
                          </span>
                        ) : null}
                        <span className="w-1/3 text-right">
                          {chartData.pitchTrend[chartData.pitchTrend.length - 1].label}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md h-[240px] col-span-1">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Top Objections</h3>
          <div className="space-y-3">
            {chartData.objectionBreakdown.slice(0, 5).map((item, index) => {
              const maxCount = Math.max(...chartData.objectionBreakdown.map(d => d.count));
              const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={index} className="flex items-center">
                  <div className="w-24 text-xs text-gray-600 truncate">{item.name}</div>
                  <div className="flex-1 mx-2">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 w-8">{item.count}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="col-span-1 grid grid-rows-2 gap-4">
          <div
            onClick={() => navigate("/admin/team-management")}
            className="bg-white rounded-xl p-4 shadow-md h-[110px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
          >
            <div className="text-3xl text-gray-500 mb-1">👥</div>
            <p className="text-base font-semibold">Team Management</p>
            <p className="text-xs text-gray-500">View & Manage Sales Team</p>
          </div>
          <div
            onClick={() => navigate("/admin/pros-cons")}
            className="bg-white rounded-xl p-4 shadow-md h-[110px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
          >
            <div className="text-3xl text-green-600 mb-1">📋</div>
            <p className="text-base font-semibold">Pros & Objections</p>
            <p className="text-xs text-gray-500 text-center">Edit pitch points & objections</p>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Leaderboard (Avg. Pitch Score / 10)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Rank</th>
              <th className="pb-2">Salesperson</th>
              <th className="pb-2">Avg. Score</th>
              <th className="pb-2">Conversations</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, idx) => (
              <tr key={entry.name} className="border-b text-gray-700">
                <td className="py-2">{idx + 1}</td>
                <td>{entry.name}</td>
                <td>{entry.avgScore}</td>
                <td>{entry.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
          <h2 className="text-lg font-semibold text-gray-800">Latest Recordings</h2>
          <div className="flex gap-2">
            <select 
              value={selectedProject} 
              onChange={(e) => setSelectedProject(e.target.value)} 
              className="border rounded p-1 text-sm"
            >
              <option value="All Projects">All Projects</option>
              {uniqueProjects.map((p, idx) => (
                <option key={idx} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select 
              value={selectedSalesperson} 
              onChange={(e) => setSelectedSalesperson(e.target.value)} 
              className="border rounded p-1 text-sm"
            >
              <option value="All Salespersons">All Salespersons</option>
              {uniqueSalespersons.map((u, idx) => (
                <option key={idx} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Date</th>
              <th className="pb-2">Customer</th>
              <th className="pb-2">Phone</th>
              <th className="pb-2">Project</th>
              <th className="pb-2">Salesperson</th>
              <th className="pb-2">Pitch Score</th>
              <th className="pb-2">Top Objection</th>
              <th className="pb-2">Missed Pros</th>
              <th className="pb-2">Recording</th>
              <th className="pb-2">Transcript & Analysis</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((rec, idx) => (
              <tr key={idx} className="border-b text-gray-700">
                <td className="py-2">{new Date(rec.date).toLocaleDateString()}</td>
                <td>{rec.name}</td>
                <td>{rec.phone}</td>
                <td>{rec.project}</td>
                <td>{rec.userName || rec.email}</td>
                <td className="font-semibold">{typeof rec.score === 'number' ? `${rec.score}/10` : '-'}</td>
                <td className="max-w-32 truncate">{rec.topObjection || 'None'}</td>
                <td className="font-semibold text-center">{typeof rec.missedPros === 'number' ? rec.missedPros : '-'}</td>
                <td>
                  {rec.recordingUrl ? (
                    <div className="flex flex-col items-start">
                      <audio 
                        controls 
                        className="w-48"
                        onError={(e) => console.error('Audio playback error:', e.target.error, 'URL:', rec.recordingUrl)}
                        onCanPlayThrough={(e) => console.log('Audio can play through:', rec.recordingUrl)}
                      >
                        <source src={rec.recordingUrl} type={getAudioMimeType(rec.recordingUrl)} />
                        Your browser does not support the audio element.
                      </audio>
                      <a
                        href={rec.recordingUrl}
                        download={`recording-${rec.name}-${new Date(rec.date).toISOString().slice(0,10)}.mp3`}
                        className="text-blue-600 text-xs mt-1 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ⬇ Download
                      </a>
                    </div>
                  ) : (
                    <span className="text-red-500 text-xs">No recording available</span>
                  )}
                </td>
                <td>
                  <button
                    onClick={() => {
                      const modal = document.createElement('div');
                      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:1000;display:flex;align-items:center;justify-content:center;';
                      modal.onclick = (e) => {
                        if (e.target === modal) modal.remove();
                      };
                      modal.innerHTML = `
                        <div style="background:white;padding:20px;border-radius:10px;max-width:80%;max-height:90%;width:800px;overflow:auto;" onclick="event.stopPropagation()">
                          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;border-bottom:1px solid #eee;padding-bottom:10px;">
                            <h2 style="font-size:1.25rem;font-weight:600;color:#1f2937;">Call Analysis - ${rec.name}</h2>
                            <div style="display:flex;gap:10px;align-items:center;">
                              <span style="font-weight:500;color:${rec.score >= 7 ? '#10b981' : rec.score >= 4 ? '#f59e0b' : '#ef4444'};">
                                Pitch Score: ${rec.score || 'N/A'}/10
                              </span>
                              <button 
                                onclick="this.closest('div[style*=&quot;background:white&quot;]').parentElement.remove()" 
                                style="padding:6px 12px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;font-size:0.875rem;"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                          
                          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                            <div>
                              <h3 style="font-weight:600;margin-bottom:10px;color:#1f2937;border-bottom:1px solid #eee;padding-bottom:5px;">Transcript</h3>
                              <div style="background:#f9fafb;padding:15px;border-radius:6px;max-height:400px;overflow-y:auto;font-size:0.875rem;line-height:1.5;white-space:pre-wrap;">
                                ${rec.transcript || 'No transcript available'}
                              </div>
                            </div>
                            
                            <div>
                              <h3 style="font-weight:600;margin-bottom:10px;color:#1f2937;border-bottom:1px solid #eee;padding-bottom:5px;">AI Analysis</h3>
                              <div style="background:#f0f9ff;padding:15px;border-radius:6px;max-height:400px;overflow-y:auto;font-size:0.875rem;line-height:1.5;white-space:pre-wrap;">
                                ${rec.aiInsights || 'No analysis available'}
                              </div>
                              
                              ${rec.topObjection ? `
                                <div style="margin-top:15px;padding:10px;background:#fef2f2;border-radius:6px;border-left:3px solid #ef4444;">
                                  <h4 style="font-weight:600;margin-bottom:5px;color:#b91c1c;">Top Objection</h4>
                                  <p style="color:#7f1d1d;font-size:0.875rem;">${rec.topObjection}</p>
                                </div>
                              ` : ''}
                              
                              ${rec.missedPros ? `
                                <div style="margin-top:10px;padding:10px;background:#ecfdf5;border-radius:6px;border-left:3px solid #10b981;">
                                  <h4 style="font-weight:600;margin-bottom:5px;color:#065f46;">Missed Pros</h4>
                                  <p style="color:#064e3b;font-size:0.875rem;">${rec.missedPros} key points not mentioned</p>
                                </div>
                              ` : ''}
                            </div>
                          </div>
                        </div>
                      `;
                      document.body.appendChild(modal);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3 rounded"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pageCount > 1 && (
          <div className="flex justify-center mt-4 gap-2">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => setCurrentPage(num)}
                className={`px-3 py-1 rounded ${
                  num === currentPage ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
