// RecordingSessionService - Listen to recording sessions for admin panel
// Slice A3: Cache + callback pattern (pragmatic choice for single admin consumer)

const RecordingSessionService = (function() {
    'use strict';

    let _activeSessions = new Map();  // sessionDocId → session data
    let _unsubscribe = null;
    let _callbacks = [];

    /**
     * Subscribe to live recording sessions.
     * Queries where status == 'recording' with real-time listener.
     */
    async function subscribeToActiveSessions(callback) {
        _callbacks.push(callback);

        // Already listening — just fire callback with current data
        if (_unsubscribe) {
            callback(getActiveSessions());
            return;
        }

        const { collection, query, where, onSnapshot } = await import(
            'https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js'
        );

        const q = query(
            collection(window.firebase.db, 'recordingSessions'),
            where('status', '==', 'recording')
        );

        _unsubscribe = onSnapshot(q, (snapshot) => {
            _activeSessions.clear();
            snapshot.forEach(doc => {
                _activeSessions.set(doc.id, { id: doc.id, ...doc.data() });
            });
            _notifyCallbacks();
        });
    }

    /**
     * Get active sessions from cache, enriching with stale flag.
     * A session is stale if lastHeartbeat > 2 minutes ago.
     */
    function getActiveSessions() {
        const now = Date.now();
        const STALE_THRESHOLD = 2 * 60 * 1000; // 2 minutes
        const sessions = [];

        for (const session of _activeSessions.values()) {
            const heartbeat = session.lastHeartbeat?.toDate?.() || session.lastHeartbeat
                || session.startedAt?.toDate?.() || session.startedAt;
            const isStale = heartbeat && (now - new Date(heartbeat).getTime()) > STALE_THRESHOLD;
            sessions.push({ ...session, isStale });
        }

        return sessions;
    }

    /**
     * Get recording history for a specific team (completed sessions).
     * One-time query, not real-time.
     */
    async function getTeamHistory(teamId, limit = 20) {
        const { collection, query, where, orderBy, limit: fbLimit, getDocs } = await import(
            'https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js'
        );

        const q = query(
            collection(window.firebase.db, 'recordingSessions'),
            where('teamId', '==', teamId),
            orderBy('startedAt', 'desc'),
            fbLimit(limit)
        );

        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    /**
     * Get recording counts per team for admin overview.
     * Returns { teamId: { sessions, uploaded, maps } }
     *   sessions = completed recordingSessions
     *   uploaded = sessions that produced at least one voiceRecording
     *   maps     = total voiceRecording docs (one per map)
     */
    async function getRecordingCountsByTeam() {
        const { collection, query, where, getDocs } = await import(
            'https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js'
        );

        // Query both collections in parallel
        const [sessionSnap, voiceSnap] = await Promise.all([
            getDocs(query(
                collection(window.firebase.db, 'recordingSessions'),
                where('status', '==', 'completed')
            )),
            getDocs(collection(window.firebase.db, 'voiceRecordings'))
        ]);

        // Count completed sessions per team
        const counts = {};
        sessionSnap.forEach(doc => {
            const teamId = doc.data().teamId;
            if (teamId) {
                if (!counts[teamId]) counts[teamId] = { sessions: 0, uploaded: 0, maps: 0, _sessionIds: new Set() };
                counts[teamId].sessions++;
            }
        });

        // Count maps and unique uploaded sessions per team
        voiceSnap.forEach(doc => {
            const data = doc.data();
            const teamId = data.teamId;
            if (teamId) {
                if (!counts[teamId]) counts[teamId] = { sessions: 0, uploaded: 0, maps: 0, _sessionIds: new Set() };
                counts[teamId].maps++;
                if (data.sessionId) counts[teamId]._sessionIds.add(data.sessionId);
            }
        });

        // Finalize uploaded counts and remove temp sets
        for (const teamId of Object.keys(counts)) {
            counts[teamId].uploaded = counts[teamId]._sessionIds.size;
            delete counts[teamId]._sessionIds;
        }

        return counts;
    }

    function _notifyCallbacks() {
        const sessions = getActiveSessions();
        _callbacks.forEach(cb => cb(sessions));
    }

    function unsubscribe() {
        if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
        _callbacks = [];
        _activeSessions.clear();
    }

    return {
        subscribeToActiveSessions,
        getActiveSessions,
        getTeamHistory,
        getRecordingCountsByTeam,
        unsubscribe
    };
})();
