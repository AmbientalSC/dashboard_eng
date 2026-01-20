/* eslint-disable react-refresh/only-export-components -- este arquivo exporta tipos e um provider (component) */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/app';

export type Role = 'ADM' | 'USUARIO';

export interface FilialAccess {
  filialId: string;
  nome: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  nome: string;
  role: Role;
  filiais: FilialAccess[];
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const profileSnap = await getDoc(doc(db, 'usuarios', user.uid));
        if (!profileSnap.exists()) {
          console.warn('Documento de perfil nao encontrado para o usuario autenticado.');
          setProfile(null);
          setLoading(false);
          return;
        }

        const data = profileSnap.data();
        type RawFilial = {
          filialId?: string;
          filial_id?: string;
          nomeCache?: string;
          nome?: string;
        };
        const rawFiliais: RawFilial[] = Array.isArray(data.filiais_acesso)
          ? (data.filiais_acesso as RawFilial[])
          : data.filiais_acesso && typeof data.filiais_acesso === 'object'
          ? (Object.values(data.filiais_acesso as Record<string, RawFilial>) as RawFilial[])
          : [];
        setProfile({
          uid: user.uid,
          email: data.email,
          nome: data.nome,
          role: data.role,
          filiais: rawFiliais
            .map((item) => ({
              filialId: item.filialId ?? item.filial_id ?? '',
              nome: item.nomeCache ?? item.nome ?? 'Filial',
            }))
            .filter((item): item is FilialAccess => Boolean(item.filialId)),
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading,
      signOut: () => auth.signOut(),
    }),
    [firebaseUser, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa ser usado dentro de AuthProvider.');
  return context;
};
