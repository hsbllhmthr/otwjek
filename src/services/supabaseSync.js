import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';

export const CLOUD_TABLES = {
  users: {
    table: 'otw_users',
    notifyKey: 'users',
    orderBy: { column: 'created_at', ascending: true },
    toRow: (item) => ({
      id: String(item.id),
      phone: item.phone || null,
      email: item.email || null,
      full_name: item.full_name || item.fullName || '',
      role: item.role || 'customer',
      status: item.status || 'active',
      payload: item,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || item.created_at || new Date().toISOString()
    })
  },
  drivers: {
    table: 'otw_drivers',
    notifyKey: 'drivers',
    orderBy: { column: 'created_at', ascending: false },
    toRow: (item) => ({
      id: String(item.id),
      user_id: item.user_id || null,
      name: item.name || '',
      phone: item.phone || null,
      vehicle_type: item.vehicleType || item.vehicle_type || 'motor',
      verification_status: item.verification_status || 'pending',
      is_online: Boolean(item.is_online),
      payload: item,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || item.created_at || new Date().toISOString()
    })
  },
  driver_docs: {
    table: 'otw_driver_documents',
    notifyKey: 'drivers',
    orderBy: { column: 'created_at', ascending: false },
    toRow: (item) => ({
      id: String(item.id),
      driver_id: String(item.driver_id || ''),
      document_type: String(item.document_type || ''),
      verification_status: item.verification_status || 'pending',
      payload: item,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || item.created_at || new Date().toISOString()
    })
  },
  bookings: {
    table: 'otw_bookings',
    notifyKey: 'bookings',
    orderBy: { column: 'created_at', ascending: false },
    toRow: (item) => ({
      id: String(item.id),
      order_code: item.order_code || null,
      booking_code: item.booking_code || null,
      customer_id: item.customer_id || null,
      driver_id: item.driver_id || null,
      service_type: item.service_type || 'motor',
      assignment_status: item.assignment_status || 'unassigned',
      booking_status: item.booking_status || 'in_progress',
      driver_step: item.driver_step || null,
      fare_amount: Number(item.fare_amount || 0),
      payload: item,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || item.created_at || new Date().toISOString()
    })
  }
};

function sortDomainItems(domain, items) {
  if (!Array.isArray(items)) return [];
  if (domain !== 'bookings' && domain !== 'drivers') return items;
  return [...items].sort((a, b) => {
    const tA = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return tB - tA;
  });
}

function extractPayload(row) {
  if (!row || typeof row !== 'object') return null;
  if (row.payload && typeof row.payload === 'object') {
    return {
      ...row.payload,
      id: row.payload.id || row.id,
      updated_at: row.updated_at || row.payload.updated_at,
      created_at: row.payload.created_at || row.created_at
    };
  }
  return row;
}

/**
 * Fungsi murni untuk menggabungkan snapshot cloud dengan mutasi lokal yang masih in-flight.
 */
export function mergeCloudCollection({
  domain,
  cloudItems = [],
  pendingUpsertsMap = new Map(),
  pendingDeletesMap = new Map(),
  ensureLocalRecords = null
}) {
  const seen = new Set();
  const merged = [];

  for (const rawItem of cloudItems) {
    const item = extractPayload(rawItem);
    if (!item?.id) continue;
    if (pendingDeletesMap.has(item.id)) continue;

    seen.add(item.id);
    if (pendingUpsertsMap.has(item.id)) {
      merged.push(pendingUpsertsMap.get(item.id).item);
    } else {
      merged.push(item);
    }
  }

  for (const [id, entry] of pendingUpsertsMap.entries()) {
    if (!seen.has(id) && !pendingDeletesMap.has(id) && entry?.item) {
      merged.push(entry.item);
    }
  }

  const normalized = sortDomainItems(domain, merged);
  return typeof ensureLocalRecords === 'function' ? ensureLocalRecords(normalized) : normalized;
}

/**
 * Fungsi murni untuk menerapkan satu event Realtime INSERT / UPDATE / DELETE pada array lokal.
 * Mengembalikan array baru jika ada perubahan, atau null jika event diabaikan.
 */
export function applyRealtimeRecordChange({
  domain,
  eventType,
  newRow,
  oldRow,
  currentLocalItems = [],
  pendingUpsertsMap = new Map(),
  pendingDeletesMap = new Map()
}) {
  const list = Array.isArray(currentLocalItems) ? [...currentLocalItems] : [];

  if (eventType === 'DELETE') {
    const deletedId = oldRow?.id;
    if (!deletedId || pendingUpsertsMap.has(deletedId)) return null;
    const filtered = list.filter((entry) => entry && entry.id !== deletedId);
    if (filtered.length === list.length) return null;
    return filtered;
  }

  const incoming = extractPayload(newRow);
  if (!incoming?.id || pendingDeletesMap.has(incoming.id)) return null;

  const pendingEntry = pendingUpsertsMap.get(incoming.id);
  if (pendingEntry) {
    const cloudUpdated = new Date(incoming.updated_at || incoming.created_at || 0).getTime();
    if (!cloudUpdated || cloudUpdated < pendingEntry.ts) {
      return null;
    }
  }

  const idx = list.findIndex((entry) => entry && entry.id === incoming.id);
  if (idx !== -1) {
    list[idx] = incoming;
  } else {
    list.unshift(incoming);
  }

  return sortDomainItems(domain, list);
}

const pendingUpserts = {
  users: new Map(),
  drivers: new Map(),
  driver_docs: new Map(),
  bookings: new Map()
};

const pendingDeletes = {
  users: new Map(),
  drivers: new Map(),
  driver_docs: new Map(),
  bookings: new Map()
};

let adapters = null;
let realtimeChannel = null;
let pollTimer = null;
let listenersBound = false;
let hydrationPromise = null;
let initStarted = false;

const syncState = {
  configured: isSupabaseConfigured(),
  status: isSupabaseConfigured() ? 'connecting' : 'disabled',
  channelState: 'CLOSED',
  hydrated: false,
  lastSyncedAt: null,
  lastError: null
};

const statusListeners = new Set();

function emitSyncStatus(patch = {}) {
  Object.assign(syncState, patch);
  const snapshot = getCloudSyncStatus();
  statusListeners.forEach((cb) => {
    try {
      cb(snapshot);
    } catch {
      // ignore listener errors
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('otwjek_sync_status', { detail: snapshot }));
  }
}

export function getCloudSyncStatus() {
  return {
    ...syncState,
    configured: isSupabaseConfigured()
  };
}

export function subscribeCloudStatus(callback) {
  if (typeof callback !== 'function') return () => {};
  statusListeners.add(callback);
  callback(getCloudSyncStatus());
  return () => {
    statusListeners.delete(callback);
  };
}

function getDomainStorageOps(domain) {
  const spec = CLOUD_TABLES[domain];
  if (!spec || !adapters) return null;
  return { spec, ...adapters };
}

async function pullSingleDomain(client, domain) {
  const ops = getDomainStorageOps(domain);
  if (!ops) return null;
  const { spec, writeDomainArray, ensureAdminUser } = ops;

  let query = client.from(spec.table).select('id, payload, created_at, updated_at');
  if (spec.orderBy) {
    query = query.order(spec.orderBy.column, { ascending: spec.orderBy.ascending });
  }

  const { data, error } = await query;
  if (error) throw error;

  const merged = mergeCloudCollection({
    domain,
    cloudItems: Array.isArray(data) ? data : [],
    pendingUpsertsMap: pendingUpserts[domain],
    pendingDeletesMap: pendingDeletes[domain],
    ensureLocalRecords: domain === 'users' ? ensureAdminUser : null
  });

  writeDomainArray(domain, merged, spec.notifyKey);
  return merged;
}

export async function hydrateAllFromCloud(force = false) {
  if (typeof window === 'undefined' || !isSupabaseConfigured() || !adapters) {
    return false;
  }
  if (hydrationPromise && !force) {
    return hydrationPromise;
  }

  const client = getSupabaseClient();
  if (!client) return false;

  hydrationPromise = (async () => {
    try {
      emitSyncStatus({
        configured: true,
        status: syncState.channelState === 'SUBSCRIBED' ? 'live' : 'connecting',
        lastError: null
      });

      await Promise.all(
        Object.keys(CLOUD_TABLES).map((domain) => pullSingleDomain(client, domain))
      );

      const nowIso = new Date().toISOString();
      const firstHydration = !syncState.hydrated;
      emitSyncStatus({
        status: 'live',
        hydrated: true,
        lastSyncedAt: nowIso,
        lastError: null
      });

      adapters.notifyChange('all');
      if (firstHydration && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('otwjek_cloud_hydrated', { detail: { timestamp: Date.now() } }));
      }
      return true;
    } catch (err) {
      console.warn('[OTWJek Sync] Gagal menarik data dari Supabase:', err?.message || err);
      emitSyncStatus({
        status: 'error',
        lastError: err?.message || 'Gagal terhubung ke Supabase'
      });
      return false;
    } finally {
      hydrationPromise = null;
    }
  })();

  return hydrationPromise;
}

function handleRealtimeEvent(domain, payload) {
  const ops = getDomainStorageOps(domain);
  if (!ops) return;
  const { spec, readDomainArray, writeDomainArray, ensureAdminUser } = ops;

  const currentItems = readDomainArray(domain);
  const nextItems = applyRealtimeRecordChange({
    domain,
    eventType: payload.eventType,
    newRow: payload.new,
    oldRow: payload.old,
    currentLocalItems: currentItems,
    pendingUpsertsMap: pendingUpserts[domain],
    pendingDeletesMap: pendingDeletes[domain]
  });

  if (!nextItems) return;

  const finalItems =
    domain === 'users' && typeof ensureAdminUser === 'function'
      ? ensureAdminUser(nextItems)
      : nextItems;

  writeDomainArray(domain, finalItems, spec.notifyKey);
  emitSyncStatus({
    status: 'live',
    hydrated: true,
    lastSyncedAt: new Date().toISOString(),
    lastError: null
  });
}

function startRealtimeChannel() {
  const client = getSupabaseClient();
  if (!client || realtimeChannel) return;

  const channel = client.channel('otwjek-realtime-sync');
  Object.entries(CLOUD_TABLES).forEach(([domain, spec]) => {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: spec.table },
      (payload) => handleRealtimeEvent(domain, payload)
    );
  });

  realtimeChannel = channel.subscribe((status, err) => {
    const patch = { channelState: status };
    if (status === 'SUBSCRIBED') {
      patch.status = 'live';
      patch.lastError = null;
      hydrateAllFromCloud();
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      patch.status = 'error';
      if (err) patch.lastError = err.message || String(err);
    }
    emitSyncStatus(patch);
  });
}

export function initCloudSync(storageAdapters) {
  adapters = storageAdapters;
  if (typeof window === 'undefined' || !isSupabaseConfigured()) {
    emitSyncStatus({ configured: false, status: 'disabled' });
    return;
  }
  if (initStarted) return;
  initStarted = true;

  hydrateAllFromCloud();
  startRealtimeChannel();

  if (!listenersBound) {
    listenersBound = true;
    window.addEventListener('online', () => hydrateAllFromCloud(true));
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          hydrateAllFromCloud();
        }
      });
    }
    pollTimer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        hydrateAllFromCloud();
      }
    }, 15000);
  }
}

export function stopCloudSync() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  const client = getSupabaseClient();
  if (realtimeChannel && client) {
    client.removeChannel(realtimeChannel);
  }
  realtimeChannel = null;
  initStarted = false;
}

export function pushUpsert(domain, itemsOrItem) {
  if (typeof window === 'undefined' || !isSupabaseConfigured()) return;
  const spec = CLOUD_TABLES[domain];
  const client = getSupabaseClient();
  if (!spec || !client) return;

  const list = (Array.isArray(itemsOrItem) ? itemsOrItem : [itemsOrItem]).filter((x) => x?.id);
  if (!list.length) return;

  const nowTs = Date.now();
  const rows = list.map((item) => {
    const cleanItem = { ...item, updated_at: item.updated_at || new Date(nowTs).toISOString() };
    pendingDeletes[domain].delete(cleanItem.id);
    pendingUpserts[domain].set(cleanItem.id, { ts: nowTs, item: cleanItem });
    return spec.toRow(cleanItem);
  });

  client
    .from(spec.table)
    .upsert(rows, { onConflict: 'id' })
    .then(({ error }) => {
      if (error) {
        console.warn(`[OTWJek Sync] Gagal menyimpan ${domain} ke Supabase:`, error.message);
        emitSyncStatus({ status: 'error', lastError: error.message });
      } else {
        emitSyncStatus({ status: 'live', lastSyncedAt: new Date().toISOString(), lastError: null });
      }
      rows.forEach((r) => {
        const entry = pendingUpserts[domain].get(r.id);
        if (entry && entry.ts <= nowTs) {
          pendingUpserts[domain].delete(r.id);
        }
      });
    })
    .catch((err) => {
      console.warn(`[OTWJek Sync] Error jaringan upsert ${domain}:`, err?.message || err);
    });
}

export function pushDelete(domain, idsOrId) {
  if (typeof window === 'undefined' || !isSupabaseConfigured()) return;
  const spec = CLOUD_TABLES[domain];
  const client = getSupabaseClient();
  if (!spec || !client) return;

  const ids = (Array.isArray(idsOrId) ? idsOrId : [idsOrId]).filter(Boolean).map(String);
  if (!ids.length) return;

  const nowTs = Date.now();
  ids.forEach((id) => {
    pendingUpserts[domain].delete(id);
    pendingDeletes[domain].set(id, nowTs);
  });

  client
    .from(spec.table)
    .delete()
    .in('id', ids)
    .then(({ error }) => {
      if (error) {
        console.warn(`[OTWJek Sync] Gagal menghapus ${domain} di Supabase:`, error.message);
      } else {
        emitSyncStatus({ status: 'live', lastSyncedAt: new Date().toISOString(), lastError: null });
      }
      ids.forEach((id) => {
        const ts = pendingDeletes[domain].get(id);
        if (ts && ts <= nowTs) {
          pendingDeletes[domain].delete(id);
        }
      });
    })
    .catch((err) => {
      console.warn(`[OTWJek Sync] Error jaringan delete ${domain}:`, err?.message || err);
    });
}

export function pushDeleteByField(domain, field, value) {
  if (typeof window === 'undefined' || !isSupabaseConfigured() || !value) return;
  const spec = CLOUD_TABLES[domain];
  const client = getSupabaseClient();
  if (!spec || !client) return;

  client
    .from(spec.table)
    .delete()
    .eq(field, String(value))
    .then(({ error }) => {
      if (error) {
        console.warn(`[OTWJek Sync] Gagal menghapus ${domain} (${field}=${value}):`, error.message);
      }
    })
    .catch((err) => {
      console.warn(`[OTWJek Sync] Error jaringan delete ${domain}:`, err?.message || err);
    });
}

export function pushClearTable(domain, preserveAdmin = false) {
  if (typeof window === 'undefined' || !isSupabaseConfigured()) return;
  const spec = CLOUD_TABLES[domain];
  const client = getSupabaseClient();
  if (!spec || !client) return;

  pendingUpserts[domain].clear();

  let query = client.from(spec.table).delete();
  if (domain === 'users' && preserveAdmin) {
    query = query.neq('role', 'admin').neq('id', 'admin-master-01');
  } else {
    query = query.neq('id', '__otw_never_match__');
  }

  query
    .then(({ error }) => {
      if (error) {
        console.warn(`[OTWJek Sync] Gagal membersihkan tabel ${spec.table}:`, error.message);
      } else {
        emitSyncStatus({ status: 'live', lastSyncedAt: new Date().toISOString(), lastError: null });
      }
    })
    .catch((err) => {
      console.warn(`[OTWJek Sync] Error jaringan reset ${spec.table}:`, err?.message || err);
    });
}
