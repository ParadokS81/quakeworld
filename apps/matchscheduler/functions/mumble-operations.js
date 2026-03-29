// Mumble Operations Cloud Functions (Phase M3)
// Manages Mumble voice server lifecycle: enable (pending) and disable

const functions = require('firebase-functions');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const db = getFirestore();

/**
 * enableMumble - Create pending mumbleConfig for a team
 * Quad's Firestore listener picks this up and creates the Mumble channel
 */
exports.enableMumble = functions
    .region('europe-west3')
    .https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = context.auth.uid;
        const { teamId } = data;

        if (!teamId || typeof teamId !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'teamId is required');
        }

        // Verify team exists and caller is leader
        const teamDoc = await db.collection('teams').doc(teamId).get();
        if (!teamDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Team not found');
        }

        const team = teamDoc.data();
        if (team.leaderId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Only the team leader can enable Mumble');
        }

        // Check no existing mumbleConfig for this team
        const existingConfig = await db.collection('mumbleConfig').doc(teamId).get();
        if (existingConfig.exists) {
            const existingStatus = existingConfig.data().status;
            if (existingStatus !== 'disabled' && existingStatus !== 'error') {
                throw new functions.https.HttpsError('already-exists',
                    'Mumble is already enabled or pending for this team');
            }
        }

        // Create mumbleConfig document (quad's listener will create the channel + register users)
        const config = {
            teamId,
            teamTag: team.teamTag || '',
            teamName: team.teamName,
            enabledBy: userId,
            status: 'pending',
            mumbleUsers: {},
            autoRecord: true,
            channelId: null,
            channelName: null,
            channelPath: null,
            serverAddress: null,
            serverPort: null,
            recordingBotJoined: false,
            errorMessage: null,
            createdAt: FieldValue.serverTimestamp(),
            activatedAt: null,
            updatedAt: FieldValue.serverTimestamp(),
        };

        await db.collection('mumbleConfig').doc(teamId).set(config);

        console.log('✅ Mumble enabled (pending):', { teamId, teamName: team.teamName });

        return { success: true, status: 'pending' };

    } catch (error) {
        console.error('❌ enableMumble error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to enable Mumble: ' + error.message);
    }
});

/**
 * disableMumble - Set status to 'disabling' so quad can clean up
 * Quad's listener will delete the Mumble channel + unregister users, then delete the doc
 */
exports.disableMumble = functions
    .region('europe-west3')
    .https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = context.auth.uid;
        const { teamId } = data;

        if (!teamId || typeof teamId !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'teamId is required');
        }

        // Verify team exists and caller is leader
        const teamDoc = await db.collection('teams').doc(teamId).get();
        if (!teamDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Team not found');
        }

        const team = teamDoc.data();
        if (team.leaderId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Only the team leader can disable Mumble');
        }

        const configDoc = await db.collection('mumbleConfig').doc(teamId).get();
        if (!configDoc.exists) {
            // Already disabled — idempotent success
            return { success: true };
        }

        // Set status to 'disabling' — quad will pick this up and clean up
        await configDoc.ref.update({
            status: 'disabling',
            updatedAt: FieldValue.serverTimestamp(),
        });

        console.log('✅ Mumble disable requested:', { teamId });

        return { success: true };

    } catch (error) {
        console.error('❌ disableMumble error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to disable Mumble: ' + error.message);
    }
});

/**
 * updateMumbleSettings - Toggle auto-record and other settings
 */
exports.updateMumbleSettings = functions
    .region('europe-west3')
    .https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = context.auth.uid;
        const { teamId, autoRecord } = data;

        if (!teamId || typeof teamId !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'teamId is required');
        }

        // Verify team exists and caller is leader or scheduler
        const teamDoc = await db.collection('teams').doc(teamId).get();
        if (!teamDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Team not found');
        }

        const team = teamDoc.data();
        const isLeader = team.leaderId === userId;
        const isScheduler = (team.schedulers || []).includes(userId);
        if (!isLeader && !isScheduler) {
            throw new functions.https.HttpsError('permission-denied', 'Only team leaders and schedulers can update Mumble settings');
        }

        const configDoc = await db.collection('mumbleConfig').doc(teamId).get();
        if (!configDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Mumble is not enabled for this team');
        }

        const updateData = { updatedAt: FieldValue.serverTimestamp() };

        if (autoRecord !== undefined) {
            if (typeof autoRecord !== 'boolean') {
                throw new functions.https.HttpsError('invalid-argument', 'autoRecord must be a boolean');
            }
            updateData.autoRecord = autoRecord;
        }

        await configDoc.ref.update(updateData);

        console.log('✅ Mumble settings updated:', { teamId, autoRecord });

        return { success: true };

    } catch (error) {
        console.error('❌ updateMumbleSettings error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to update Mumble settings: ' + error.message);
    }
});
