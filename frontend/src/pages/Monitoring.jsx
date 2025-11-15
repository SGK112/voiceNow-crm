import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, Zap, AlertTriangle, CheckCircle, Clock, TrendingUp, Users, Globe, HardDrive, Cpu } from 'lucide-react';
import api from '../utils/api';

const Monitoring = () => {
  const [healthData, setHealthData] = useState(null);
  const [metricsData, setMetricsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchMonitoringData = async () => {
    try {
      const [healthRes, metricsRes] = await Promise.all([
        api.get('/monitoring/health/detailed'),
        api.get('/monitoring/metrics')
      ]);

      setHealthData(healthRes.data);
      setMetricsData(metricsRes.data);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchMonitoringData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'configured':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'unhealthy':
      case 'error':
      case 'disconnected':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'configured':
        return 'bg-green-50 border-green-200';
      case 'degraded':
        return 'bg-yellow-50 border-yellow-200';
      case 'unhealthy':
      case 'error':
      case 'disconnected':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="w-12 h-12 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="w-8 h-8 text-indigo-600" />
              System Monitoring
            </h1>
            <p className="text-gray-600 mt-1">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                autoRefresh
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {autoRefresh ? '🔄 Auto-Refresh ON' : '⏸️ Auto-Refresh OFF'}
            </button>
            <button
              onClick={fetchMonitoringData}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              🔃 Refresh Now
            </button>
          </div>
        </div>
      </div>

      {/* System Status Overview */}
      <div className={`mb-8 p-6 rounded-xl border-2 ${getStatusBgColor(healthData?.status)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {healthData?.status === 'healthy' ? (
              <CheckCircle className="w-12 h-12 text-green-500" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-yellow-500" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 uppercase">
                System Status: {healthData?.status || 'Unknown'}
              </h2>
              <p className="text-gray-600">
                Environment: {healthData?.environment} | Uptime: {healthData?.uptime_seconds}s
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Version</div>
            <div className="text-xl font-bold text-gray-900">{healthData?.version}</div>
          </div>
        </div>
      </div>

      {/* Dependencies Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* MongoDB */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Database className={`w-6 h-6 ${getStatusColor(healthData?.dependencies?.mongodb?.status)}`} />
            <h3 className="font-semibold text-gray-900">MongoDB</h3>
          </div>
          <div className={`text-sm font-medium ${getStatusColor(healthData?.dependencies?.mongodb?.status)}`}>
            {healthData?.dependencies?.mongodb?.status || 'Unknown'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {healthData?.dependencies?.mongodb?.state}
          </div>
        </div>

        {/* Redis */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Zap className={`w-6 h-6 ${getStatusColor(healthData?.dependencies?.redis?.status)}`} />
            <h3 className="font-semibold text-gray-900">Redis</h3>
          </div>
          <div className={`text-sm font-medium ${getStatusColor(healthData?.dependencies?.redis?.status)}`}>
            {healthData?.dependencies?.redis?.status || 'Unknown'}
          </div>
          {healthData?.dependencies?.redis?.latency_ms && (
            <div className="text-xs text-gray-500 mt-1">
              {healthData.dependencies.redis.latency_ms}ms latency
            </div>
          )}
        </div>

        {/* ElevenLabs */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Globe className={`w-6 h-6 ${getStatusColor(healthData?.dependencies?.elevenlabs?.status)}`} />
            <h3 className="font-semibold text-gray-900">ElevenLabs</h3>
          </div>
          <div className={`text-sm font-medium ${getStatusColor(healthData?.dependencies?.elevenlabs?.status)}`}>
            {healthData?.dependencies?.elevenlabs?.status || 'Unknown'}
          </div>
        </div>

        {/* Stripe */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Server className={`w-6 h-6 ${getStatusColor(healthData?.dependencies?.stripe?.status)}`} />
            <h3 className="font-semibold text-gray-900">Stripe</h3>
          </div>
          <div className={`text-sm font-medium ${getStatusColor(healthData?.dependencies?.stripe?.status)}`}>
            {healthData?.dependencies?.stripe?.status || 'Unknown'}
          </div>
        </div>

        {/* Twilio */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Server className={`w-6 h-6 ${getStatusColor(healthData?.dependencies?.twilio?.status)}`} />
            <h3 className="font-semibold text-gray-900">Twilio</h3>
          </div>
          <div className={`text-sm font-medium ${getStatusColor(healthData?.dependencies?.twilio?.status)}`}>
            {healthData?.dependencies?.twilio?.status || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Requests */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 opacity-80" />
            <div className="text-3xl font-bold">{metricsData?.requests?.total || 0}</div>
          </div>
          <div className="text-sm opacity-90">Total Requests</div>
          <div className="mt-2 text-xs opacity-75">
            Success: {metricsData?.requests?.success || 0} | Errors: {metricsData?.requests?.errors || 0}
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-8 h-8 opacity-80" />
            <div className="text-3xl font-bold">{metricsData?.requests?.success_rate || '0%'}</div>
          </div>
          <div className="text-sm opacity-90">Success Rate</div>
          <div className="mt-2 text-xs opacity-75">
            {metricsData?.requests?.success || 0} successful requests
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8 opacity-80" />
            <div className="text-3xl font-bold">{metricsData?.performance?.avg_response_time_ms || 0}ms</div>
          </div>
          <div className="text-sm opacity-90">Avg Response Time</div>
          <div className="mt-2 text-xs opacity-75">
            P95: {metricsData?.performance?.p95_response_time_ms || 0}ms
          </div>
        </div>

        {/* Slow Requests */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <div className="text-3xl font-bold">{metricsData?.performance?.slow_requests || 0}</div>
          </div>
          <div className="text-sm opacity-90">Slow Requests</div>
          <div className="mt-2 text-xs opacity-75">
            &gt; 1000ms response time
          </div>
        </div>
      </div>

      {/* System Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Memory Usage */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="w-6 h-6 text-indigo-600" />
            <h3 className="text-xl font-bold text-gray-900">Memory Usage</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">System Memory</span>
                <span className="font-medium">{metricsData?.system?.memory?.usage_percent || '0%'}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all"
                  style={{ width: metricsData?.system?.memory?.usage_percent || '0%' }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {metricsData?.system?.memory?.used_mb || 0}MB / {metricsData?.system?.memory?.total_mb || 0}MB
              </div>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Process Memory</span>
                <span className="font-medium">{metricsData?.system?.process?.memory_mb || 0}MB</span>
              </div>
            </div>
          </div>
        </div>

        {/* CPU Info */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="w-6 h-6 text-indigo-600" />
            <h3 className="text-xl font-bold text-gray-900">CPU Info</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Cores</span>
              <span className="font-medium">{metricsData?.system?.cpu?.cores || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Model</span>
              <span className="font-medium text-sm">{metricsData?.system?.cpu?.model || 'Unknown'}</span>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Load Average</div>
              <div className="flex gap-4">
                <div>
                  <div className="text-xs text-gray-500">1 min</div>
                  <div className="font-medium">{metricsData?.system?.cpu?.load_avg?.[0] || '0'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">5 min</div>
                  <div className="font-medium">{metricsData?.system?.cpu?.load_avg?.[1] || '0'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">15 min</div>
                  <div className="font-medium">{metricsData?.system?.cpu?.load_avg?.[2] || '0'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Endpoints */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-indigo-600" />
          Top Endpoints
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Endpoint</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Requests</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Response Time</th>
              </tr>
            </thead>
            <tbody>
              {metricsData?.requests?.top_endpoints?.map((endpoint, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm">{endpoint.endpoint}</td>
                  <td className="py-3 px-4 text-right font-medium">{endpoint.count}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2 py-1 rounded ${
                      endpoint.avg_response_time_ms > 1000
                        ? 'bg-red-100 text-red-700'
                        : endpoint.avg_response_time_ms > 500
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {endpoint.avg_response_time_ms}ms
                    </span>
                  </td>
                </tr>
              ))}
              {(!metricsData?.requests?.top_endpoints || metricsData.requests.top_endpoints.length === 0) && (
                <tr>
                  <td colSpan="3" className="py-8 text-center text-gray-500">
                    No endpoint data available yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          Recent Errors
        </h3>
        {metricsData?.recent_errors && metricsData.recent_errors.length > 0 ? (
          <div className="space-y-3">
            {metricsData.recent_errors.map((error, index) => (
              <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-red-900">{error.error}</div>
                    <div className="text-sm text-red-700 mt-1">
                      {error.method} {error.path}
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-red-200 text-red-800 rounded text-sm font-medium">
                    {error.statusCode}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-red-600">
                  <span>{new Date(error.timestamp).toLocaleString()}</span>
                  {error.userId && <span>User: {error.userId}</span>}
                  {error.ip && <span>IP: {error.ip}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p>No recent errors - System running smoothly!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Monitoring;
