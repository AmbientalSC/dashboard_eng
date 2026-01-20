"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserHttp = exports.updateUser = exports.createUser = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const firestore = admin.firestore();
exports.createUser = functions
    .region('southamerica-east1')
    .https.onCall(async (data, context) => {
    if (!context.auth?.uid) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuário precisa estar autenticado.');
    }
    const adminDoc = await firestore.doc(`usuarios/${context.auth.uid}`).get();
    if (!adminDoc.exists || adminDoc.get('role') !== 'ADM') {
        throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem criar usuários.');
    }
    const { email, password, nome, role, filiais } = data;
    if (!email || !password || !nome || !role) {
        throw new functions.https.HttpsError('invalid-argument', 'Informações obrigatórias ausentes.');
    }
    if (!Array.isArray(filiais) || filiais.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Informe pelo menos uma filial.');
    }
    if (!['ADM', 'USUARIO'].includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', 'Perfil inválido.');
    }
    const uniqueFiliais = [...new Set(filiais)];
    const filialRefs = uniqueFiliais.map((filialId) => firestore.doc(`filiais/${filialId}`));
    const filialSnapshots = await firestore.getAll(...filialRefs);
    filialSnapshots.forEach((snapshot, index) => {
        if (!snapshot.exists) {
            throw new functions.https.HttpsError('invalid-argument', `Filial informada não encontrada (${uniqueFiliais[index]}).`);
        }
    });
    const existingUser = await admin.auth().getUserByEmail(email).catch(() => null);
    if (existingUser) {
        throw new functions.https.HttpsError('already-exists', 'E-mail já cadastrado.');
    }
    let userRecord = null;
    try {
        userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: nome,
            disabled: false,
        });
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role,
            filiais: uniqueFiliais,
        });
        const batch = firestore.batch();
        const docRef = firestore.doc(`usuarios/${userRecord.uid}`);
        batch.set(docRef, {
            email,
            nome,
            role,
            ativo: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: context.auth.uid,
            filiais_acesso: filialRefs.map((ref, index) => ({
                filialId: ref.id,
                filialPath: ref.path,
                nomeCache: filialSnapshots[index].get('nome_fantasia') ?? '',
            })),
        });
        await batch.commit();
        return { uid: userRecord.uid };
    }
    catch (error) {
        if (userRecord) {
            await admin.auth().deleteUser(userRecord.uid).catch(() => undefined);
        }
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Erro ao criar usuário', error);
        throw new functions.https.HttpsError('internal', 'Erro interno ao criar usuário.');
    }
});
exports.updateUser = functions
    .region('southamerica-east1')
    .https.onCall(async (data, context) => {
    if (!context.auth?.uid) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuário precisa estar autenticado.');
    }
    const adminDoc = await firestore.doc(`usuarios/${context.auth.uid}`).get();
    if (!adminDoc.exists || adminDoc.get('role') !== 'ADM') {
        throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem atualizar usuários.');
    }
    if (!data || typeof data !== 'object' || typeof data.uid !== 'string' || !data.uid.trim()) {
        throw new functions.https.HttpsError('invalid-argument', 'Identificador do usuário inválido.');
    }
    const uid = data.uid.trim();
    const nome = typeof data.nome === 'string' ? data.nome.trim() : undefined;
    const email = typeof data.email === 'string' ? data.email.trim() : undefined;
    const password = typeof data.password === 'string' ? data.password : undefined;
    const ativo = typeof data.ativo === 'boolean' ? data.ativo : undefined;
    const role = typeof data.role === 'string' ? data.role : undefined;
    const filiais = Array.isArray(data.filiais) ? data.filiais : undefined;
    if (!nome && !email && !password && typeof ativo === 'undefined' && !role && !filiais) {
        throw new functions.https.HttpsError('invalid-argument', 'Informe ao menos um campo para atualização.');
    }
    if (typeof ativo === 'boolean' && !ativo && uid === context.auth.uid) {
        throw new functions.https.HttpsError('failed-precondition', 'Você não pode desativar o próprio usuário.');
    }
    const updateAuth = {};
    if (nome)
        updateAuth.displayName = nome;
    if (email)
        updateAuth.email = email;
    if (password)
        updateAuth.password = password;
    if (typeof ativo === 'boolean')
        updateAuth.disabled = !ativo;
    const updateDoc = {};
    if (nome)
        updateDoc.nome = nome;
    if (email)
        updateDoc.email = email;
    if (typeof ativo === 'boolean')
        updateDoc.ativo = ativo;
    try {
        if (Object.keys(updateAuth).length > 0) {
            await admin.auth().updateUser(uid, updateAuth);
        }
        if (Object.keys(updateDoc).length > 0) {
            updateDoc.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            updateDoc.updatedBy = context.auth.uid;
            await firestore.doc(`usuarios/${uid}`).set(updateDoc, { merge: true });
        }
        // Only ADM may update role or filiais
        if ((typeof role !== 'undefined' || typeof filiais !== 'undefined')) {
            const adminDoc = await firestore.doc(`usuarios/${context.auth.uid}`).get();
            if (!adminDoc.exists || adminDoc.get('role') !== 'ADM') {
                throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem atualizar perfil/filiais do usuário.');
            }
            const claimsUpdate = {};
            if (typeof role === 'string')
                claimsUpdate.role = role;
            if (Array.isArray(filiais)) {
                if (filiais.length === 0) {
                    throw new functions.https.HttpsError('invalid-argument', 'Informe pelo menos uma filial.');
                }
                const uniqueFiliais = [...new Set(filiais)];
                const filialRefs = uniqueFiliais.map((filialId) => firestore.doc(`filiais/${filialId}`));
                const filialSnapshots = await firestore.getAll(...filialRefs);
                filialSnapshots.forEach((snapshot, index) => {
                    if (!snapshot.exists) {
                        throw new functions.https.HttpsError('invalid-argument', `Filial informada não encontrada (${uniqueFiliais[index]}).`);
                    }
                });
                claimsUpdate.filiais = uniqueFiliais;
                // update user doc filiais_acesso
                const filiaisCache = filialSnapshots.map((snap) => ({
                    filialId: snap.id,
                    filialPath: snap.ref.path,
                    nomeCache: snap.get('nome_fantasia') ?? snap.get('nome') ?? '',
                }));
                // fetch current target user doc to preserve existing role when role not provided
                const targetDoc = await firestore.doc(`usuarios/${uid}`).get();
                const prevRole = targetDoc.exists ? targetDoc.get('role') : undefined;
                await firestore.doc(`usuarios/${uid}`).set({ filiais_acesso: filiaisCache, role: role ?? prevRole }, { merge: true });
            }
            if (Object.keys(claimsUpdate).length > 0) {
                // merge with existing custom claims to avoid overriding unrelated claims
                const user = await admin.auth().getUser(uid);
                const existing = user.customClaims ?? {};
                const merged = { ...existing, ...claimsUpdate };
                await admin.auth().setCustomUserClaims(uid, merged);
            }
        }
        return { uid };
    }
    catch (error) {
        console.error('Erro ao atualizar usuário', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        if (error instanceof Error && 'code' in error) {
            const { code, message } = error;
            if (code === 'auth/email-already-exists') {
                throw new functions.https.HttpsError('already-exists', 'E-mail já cadastrado.');
            }
            if (code === 'auth/invalid-password') {
                throw new functions.https.HttpsError('invalid-argument', message);
            }
        }
        throw new functions.https.HttpsError('internal', 'Erro interno ao atualizar usuário.');
    }
});
const cors_1 = __importDefault(require("cors"));
const corsHandler = (0, cors_1.default)({ origin: true });
// HTTP endpoint with explicit CORS handling to support cross-origin requests (e.g. local dev)
exports.updateUserHttp = functions
    .region('southamerica-east1')
    .https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            // Authenticate user by bearer token
            const authHeader = req.get('Authorization') || '';
            const match = authHeader.match(/^Bearer (.*)$/);
            if (!match) {
                res.status(401).json({ error: 'unauthenticated' });
                return;
            }
            const idToken = match[1];
            let decodedToken = null;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            }
            catch (error) {
                res.status(401).json({ error: 'unauthenticated' });
                return;
            }
            const callerUid = decodedToken.uid;
            const data = req.body;
            // Reuse logic from updateUser call: validate caller and execute update
            // For simplicity, call the same internal logic by extracting the core code into a helper
            const result = await (async () => {
                // We'll replicate the essential parts: validate and perform update similar to onCall version
                if (!data || typeof data !== 'object' || typeof data.uid !== 'string' || !data.uid.trim()) {
                    throw new functions.https.HttpsError('invalid-argument', 'Identificador do usuário inválido.');
                }
                const uid = data.uid.trim();
                const nome = typeof data.nome === 'string' ? data.nome.trim() : undefined;
                const email = typeof data.email === 'string' ? data.email.trim() : undefined;
                const password = typeof data.password === 'string' ? data.password : undefined;
                const ativo = typeof data.ativo === 'boolean' ? data.ativo : undefined;
                const role = typeof data.role === 'string' ? data.role : undefined;
                const filiais = Array.isArray(data.filiais) ? data.filiais : undefined;
                if (!nome && !email && !password && typeof ativo === 'undefined' && !role && !filiais) {
                    throw new functions.https.HttpsError('invalid-argument', 'Informe ao menos um campo para atualização.');
                }
                if (typeof ativo === 'boolean' && !ativo && uid === callerUid) {
                    throw new functions.https.HttpsError('failed-precondition', 'Você não pode desativar o próprio usuário.');
                }
                // verify caller is admin for role/filiais updates
                const adminDoc = await firestore.doc(`usuarios/${callerUid}`).get();
                if (!adminDoc.exists || adminDoc.get('role') !== 'ADM') {
                    // only allow name/email/password/ativo updates for non-admins
                    if (role || filiais) {
                        throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem atualizar perfil/filiais do usuário.');
                    }
                }
                const updateAuth = {};
                if (nome)
                    updateAuth.displayName = nome;
                if (email)
                    updateAuth.email = email;
                if (password)
                    updateAuth.password = password;
                if (typeof ativo === 'boolean')
                    updateAuth.disabled = !ativo;
                const updateDoc = {};
                if (nome)
                    updateDoc.nome = nome;
                if (email)
                    updateDoc.email = email;
                if (typeof ativo === 'boolean')
                    updateDoc.ativo = ativo;
                if (Object.keys(updateAuth).length > 0) {
                    await admin.auth().updateUser(uid, updateAuth);
                }
                if (Object.keys(updateDoc).length > 0) {
                    updateDoc.updatedAt = admin.firestore.FieldValue.serverTimestamp();
                    updateDoc.updatedBy = callerUid;
                    await firestore.doc(`usuarios/${uid}`).set(updateDoc, { merge: true });
                }
                if ((typeof role !== 'undefined' || typeof filiais !== 'undefined')) {
                    const claimsUpdate = {};
                    if (typeof role === 'string')
                        claimsUpdate.role = role;
                    if (Array.isArray(filiais)) {
                        if (filiais.length === 0) {
                            throw new functions.https.HttpsError('invalid-argument', 'Informe pelo menos uma filial.');
                        }
                        const uniqueFiliais = [...new Set(filiais)];
                        const filialRefs = uniqueFiliais.map((filialId) => firestore.doc(`filiais/${filialId}`));
                        const filialSnapshots = await firestore.getAll(...filialRefs);
                        filialSnapshots.forEach((snapshot, index) => {
                            if (!snapshot.exists) {
                                throw new functions.https.HttpsError('invalid-argument', `Filial informada não encontrada (${uniqueFiliais[index]}).`);
                            }
                        });
                        claimsUpdate.filiais = uniqueFiliais;
                        const filiaisCache = filialSnapshots.map((snap) => ({ filialId: snap.id, filialPath: snap.ref.path, nomeCache: snap.get('nome_fantasia') ?? snap.get('nome') ?? '' }));
                        const targetDoc = await firestore.doc(`usuarios/${uid}`).get();
                        const prevRole = targetDoc.exists ? targetDoc.get('role') : undefined;
                        await firestore.doc(`usuarios/${uid}`).set({ filiais_acesso: filiaisCache, role: role ?? prevRole }, { merge: true });
                    }
                    if (Object.keys(claimsUpdate).length > 0) {
                        const user = await admin.auth().getUser(uid);
                        const existing = user.customClaims ?? {};
                        const merged = { ...existing, ...claimsUpdate };
                        await admin.auth().setCustomUserClaims(uid, merged);
                    }
                }
                return { uid };
            })();
            res.status(200).json(result);
        }
        catch (error) {
            console.error('Erro em updateUserHttp', error);
            // map known errors
            if (error instanceof functions.https.HttpsError) {
                res.status(400).json({ error: error.message });
                return;
            }
            res.status(500).json({ error: 'internal' });
        }
    });
});
