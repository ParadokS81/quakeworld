---
paths:
  - "public/js/**"
  - "functions/**"
---

# Cache + Listener Pattern

**This is the #1 most important pattern. Every data-displaying component MUST follow it.**

## The Pattern
1. **Services manage cache only** - Pre-load data, provide instant access, NO listeners
2. **Components own their Firebase listeners** - Get initial data from cache, subscribe to updates
3. **Updates flow**: Firebase -> Component -> UI + Cache

## Correct Implementation
```javascript
// Service manages cache only
const TeamService = {
    teams: {},
    async loadAllTeams() {
        const snapshot = await getDocs(collection(db, 'teams'));
        snapshot.forEach(doc => { this.teams[doc.id] = doc.data(); });
    },
    getTeam(teamId) { return this.teams[teamId]; },
    updateCachedTeam(teamId, data) { this.teams[teamId] = data; }
};

// Component owns its listener
const TeamInfo = (function() {
    let _unsubscribe;
    async function init(teamId) {
        const team = TeamService.getTeam(teamId);
        render(team);
        const { doc, onSnapshot } = await import('firebase/firestore');
        _unsubscribe = onSnapshot(
            doc(window.firebase.db, 'teams', teamId),
            (doc) => {
                const data = doc.data();
                updateUI(data);
                TeamService.updateCachedTeam(teamId, data);
            }
        );
    }
    function cleanup() { if (_unsubscribe) _unsubscribe(); }
    return { init, cleanup };
})();
```

## What NOT to Do
- Service managing subscriptions (creates warehouse pattern)
- Forgetting to update cache in listener callback
- Component asking service for updates via callbacks

## Frontend <-> Backend Integration

**A feature isn't done until frontend and backend are connected.**

Every feature needs:
- Button click handler attached and working
- Loading state during operation
- Backend function called with correct parameters
- Success updates UI (via listener or directly)
- Error cases show user-friendly messages
- Network failures handled gracefully
- Button re-enabled after operation

## Common Integration Mistakes

1. **No error handling** - Always wrap in try/catch, show user feedback
2. **No listener** - Backend updates DB but UI doesn't reflect it
3. **No loading state** - User doesn't know something is happening
