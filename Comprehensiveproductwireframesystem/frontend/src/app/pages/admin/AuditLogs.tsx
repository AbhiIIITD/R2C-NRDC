import { useEffect, useMemo, useState } from 'react';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeInput } from '../../components/WireframeInput';
import { WireframeTable } from '../../components/WireframeTable';
import { WireframeCard } from '../../components/WireframeCard';
import { api } from '@/services/api';

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  createdAt: string;
  actor?: { name?: string; email?: string };
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('7');

  useEffect(() => {
    api.get<AuditLogItem[]>('/audit-logs').then(setLogs).catch((error) => console.error('Failed to load audit logs:', error));
  }, []);

  const eventTypes = useMemo(() => Array.from(new Set(logs.map((log) => log.entityType))).sort(), [logs]);
  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const cutoff = dateFilter === 'all' ? undefined : new Date(Date.now() - Number(dateFilter) * 24 * 60 * 60 * 1000);
    return logs.filter((log) => {
      const actor = log.actor?.email || log.actor?.name || 'system';
      const matchesSearch =
        !query ||
        log.action.toLowerCase().includes(query) ||
        log.entityType.toLowerCase().includes(query) ||
        log.entityId?.toLowerCase().includes(query) ||
        actor.toLowerCase().includes(query);
      const matchesEvent = eventFilter === 'all' || log.entityType === eventFilter;
      const matchesUser = userFilter === 'all' || (userFilter === 'system' ? !log.actor : Boolean(log.actor));
      const matchesDate = !cutoff || new Date(log.createdAt) >= cutoff;
      return matchesSearch && matchesEvent && matchesUser && matchesDate;
    });
  }, [logs, searchTerm, eventFilter, userFilter, dateFilter]);

  const exportLogs = () => {
    const rows = [
      ['Timestamp', 'Event Type', 'User', 'Action', 'Details', 'IP Address'],
      ...filteredLogs.map((log) => [
        new Date(log.createdAt).toISOString(),
        log.entityType,
        log.actor?.email || log.actor?.name || 'System',
        log.action,
        log.entityId || '',
        log.ipAddress || '',
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'audit-logs.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setEventFilter('all');
    setUserFilter('all');
    setDateFilter('7');
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl text-neutral-800 mb-2">Audit Logs</h1>
          <p className="text-sm text-neutral-600">Track all platform activities and changes</p>
        </div>
        <WireframeButton label="Export Logs" variant="secondary" onClick={exportLogs} />
      </div>

      <div className="mb-6 border-2 border-neutral-400 bg-white p-4">
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="col-span-2">
            <WireframeInput placeholder="Search logs..." type="search" value={searchTerm} onChange={setSearchTerm} />
          </div>
          <div>
            <div className="text-sm mb-1 text-neutral-700">Event Type</div>
            <select className="w-full border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-600" value={eventFilter} onChange={(event) => setEventFilter(event.target.value)}>
              <option value="all">All Events</option>
              {eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <div className="text-sm mb-1 text-neutral-700">User Type</div>
            <select className="w-full border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-600" value={userFilter} onChange={(event) => setUserFilter(event.target.value)}>
              <option value="all">All Users</option>
              <option value="actor">User Actions</option>
              <option value="system">System Events</option>
            </select>
          </div>
          <div>
            <div className="text-sm mb-1 text-neutral-700">Date Range</div>
            <select className="w-full border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-600" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="all">All Dates</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <WireframeButton label="Apply Filters" variant="secondary" size="sm" />
          <WireframeButton label="Clear" variant="ghost" size="sm" onClick={clearFilters} />
        </div>
      </div>

      <div className="mb-4 border-b-2 border-neutral-400">
        <div className="flex gap-6">
          <button className="px-4 py-3 border-b-2 border-neutral-800 text-sm text-neutral-800" onClick={() => setUserFilter('all')}>All Events</button>
          <button className="px-4 py-3 text-sm text-neutral-600 hover:text-neutral-800" onClick={() => setUserFilter('actor')}>User Actions</button>
          <button className="px-4 py-3 text-sm text-neutral-600 hover:text-neutral-800" onClick={() => setEventFilter('LicenseRequest')}>License Events</button>
          <button className="px-4 py-3 text-sm text-neutral-600 hover:text-neutral-800" onClick={() => setUserFilter('system')}>System Events</button>
        </div>
      </div>

      <WireframeTable
        headers={['Timestamp', 'Event Type', 'User', 'Action', 'Details', 'IP Address']}
        rows={filteredLogs.map((log) => [
          new Date(log.createdAt).toLocaleString(),
          log.entityType,
          log.actor?.email || log.actor?.name || 'System',
          log.action,
          log.entityId || '-',
          log.ipAddress || '-',
        ])}
      />

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-neutral-600">Showing {filteredLogs.length} of {logs.length} events</div>
        <div className="flex gap-2">
          <WireframeButton label="Previous" variant="ghost" size="sm" disabled />
          <WireframeButton label="1" variant="primary" size="sm" />
          <WireframeButton label="Next" variant="ghost" size="sm" disabled />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-6">
        <WireframeCard title="Event Distribution">
          <div className="space-y-2 text-sm">
            {eventTypes.slice(0, 4).map((type) => (
              <div key={type} className="flex justify-between">
                <span className="text-neutral-600">{type}</span>
                <span className="text-neutral-800">{logs.filter((log) => log.entityType === type).length}</span>
              </div>
            ))}
          </div>
        </WireframeCard>

        <WireframeCard title="Most Active Users">
          <div className="space-y-2 text-sm">
            {Array.from(new Set(logs.map((log) => log.actor?.email || log.actor?.name).filter(Boolean))).slice(0, 3).map((actor) => (
              <div key={actor} className="flex justify-between">
                <span className="text-neutral-700">{actor}</span>
                <span className="text-neutral-600">{logs.filter((log) => (log.actor?.email || log.actor?.name) === actor).length} actions</span>
              </div>
            ))}
          </div>
        </WireframeCard>

        <WireframeCard title="Security Alerts">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-neutral-400 rounded-full"></div>
              <span className="text-neutral-700">No active alerts</span>
            </div>
            <div className="text-xs text-neutral-500">Audit stream is connected to backend events.</div>
          </div>
        </WireframeCard>
      </div>
    </div>
  );
}
