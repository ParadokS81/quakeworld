// MumbleConfigService - Mumble voice server config per team (Phase M3)
// Following CLAUDE.md architecture: Cache + Listeners pattern

const MumbleConfigService = (function() {
    'use strict';

    let _initialized = false;
    let _db = null;
    let _functions = null;
    let _cache = new Map();       // Key: teamId, Value: mumbleConfig data or null
    let _initRetryCount = 0;

    /**
     * Initialize the service
     */
    function init() {
        if (_initialized) return;

        if (typeof window.firebase === 'undefined') {
            if (_initRetryCount < 50) {
                _initRetryCount++;
                setTimeout(init, 100);
                return;
            }
            console.error('❌ MumbleConfigService: Firebase failed to load');
            return;
        }

        _initRetryCount = 0;
        _db = window.firebase.db;
        _functions = window.firebase.functions;
        _initialized = true;

        console.log('🎙️ MumbleConfigService initialized');
    }

    /**
     * Call Cloud Function to enable Mumble for a team
     */
    async function enableMumble(teamId) {
        if (!_initialized || !_functions) {
            throw new Error('MumbleConfigService not initialized');
        }

        const { httpsCallable } = await import(
            'https://www.gstatic.com/firebasejs/11.0.0/firebase-functions.js'
        );

        const fn = httpsCallable(_functions, 'enableMumble');
        const result = await fn({ teamId });
        return result.data;
    }

    /**
     * Call Cloud Function to disable Mumble for a team
     */
    async function disableMumble(teamId) {
        if (!_initialized || !_functions) {
            throw new Error('MumbleConfigService not initialized');
        }

        const { httpsCallable } = await import(
            'https://www.gstatic.com/firebasejs/11.0.0/firebase-functions.js'
        );

        const fn = httpsCallable(_functions, 'disableMumble');
        const result = await fn({ teamId });

        if (result.data.success) {
            // Optimistically clear cache — listener will confirm
            _cache.delete(teamId);
        }
        return result.data;
    }

    /**
     * Call Cloud Function to update Mumble settings (autoRecord toggle)
     */
    async function updateMumbleSettings(teamId, settings) {
        if (!_initialized || !_functions) {
            throw new Error('MumbleConfigService not initialized');
        }

        const { httpsCallable } = await import(
            'https://www.gstatic.com/firebasejs/11.0.0/firebase-functions.js'
        );

        const fn = httpsCallable(_functions, 'updateMumbleSettings');
        const result = await fn({ teamId, ...settings });

        if (result.data.success && _cache.has(teamId) && _cache.get(teamId)) {
            const cached = _cache.get(teamId);
            if (settings.autoRecord !== undefined) cached.autoRecord = settings.autoRecord;
        }
        return result.data;
    }

    /**
     * Get current config (one-time read, cache-first)
     */
    async function getConfig(teamId) {
        if (_cache.has(teamId)) {
            return _cache.get(teamId);
        }

        if (!_initialized || !_db) return null;

        try {
            const { doc, getDoc } = await import(
                'https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js'
            );

            const docSnap = await getDoc(doc(_db, 'mumbleConfig', teamId));
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() };
                _cache.set(teamId, data);
                return data;
            }

            _cache.set(teamId, null);
            return null;
        } catch (error) {
            console.error('❌ Error getting mumble config:', error);
            return null;
        }
    }

    /**
     * Real-time listener for mumble config changes.
     * Auto-updates when quad creates the channel (pending → active).
     * Returns unsubscribe function.
     */
    function onConfigChange(teamId, callback) {
        if (!_initialized || !_db) {
            console.warn('MumbleConfigService not initialized');
            return () => {};
        }

        let unsubscribeFn = null;

        (async () => {
            try {
                const { doc, onSnapshot } = await import(
                    'https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js'
                );

                const docRef = doc(_db, 'mumbleConfig', teamId);

                unsubscribeFn = onSnapshot(
                    docRef,
                    (docSnap) => {
                        if (docSnap.exists()) {
                            const data = { id: docSnap.id, ...docSnap.data() };
                            _cache.set(teamId, data);
                            callback(data);
                        } else {
                            _cache.delete(teamId);
                            callback(null);
                        }
                    },
                    (error) => {
                        console.error('❌ Mumble config listener error:', error);
                        callback(null);
                    }
                );
            } catch (error) {
                console.error('❌ Error setting up mumble config listener:', error);
                callback(null);
            }
        })();

        // Return a function that will unsubscribe when the async setup completes
        return () => {
            if (unsubscribeFn) unsubscribeFn();
        };
    }

    /**
     * Get cached config (synchronous, for initial render)
     */
    function getCachedConfig(teamId) {
        return _cache.has(teamId) ? _cache.get(teamId) : undefined;
    }

    /**
     * Get the personalized Mumble join URL for a specific user
     */
    function getJoinUrl(teamId, userId) {
        const config = getCachedConfig(teamId);
        if (!config || config.status !== 'active') return null;

        const userEntry = config.mumbleUsers?.[userId];
        if (!userEntry) return null;

        const { serverAddress, serverPort, channelPath } = config;
        if (!serverAddress || !serverPort || !channelPath) return null;

        if (userEntry.certificatePinned) {
            // Returning user: include username (pre-fills client), cert handles auth
            const encodedUser = encodeURIComponent(userEntry.mumbleUsername);
            return `mumble://${encodedUser}@${serverAddress}:${serverPort}/${channelPath}`;
        } else {
            // First-time: personalized link with credentials
            const encodedUser = encodeURIComponent(userEntry.mumbleUsername);
            const encodedPass = encodeURIComponent(userEntry.tempPassword);
            return `mumble://${encodedUser}:${encodedPass}@${serverAddress}:${serverPort}/${channelPath}`;
        }
    }

    // Public API
    return {
        init,
        enableMumble,
        disableMumble,
        updateMumbleSettings,
        getConfig,
        onConfigChange,
        getCachedConfig,
        getJoinUrl,
    };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', MumbleConfigService.init);
