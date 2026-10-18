import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { User, UserRole } from '../types';
import { dataService } from '../services/dataService';

export interface RegisterData {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  assignedClasses?: string[];
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  assignedClasses: string[];
  isLoading: boolean;
  isCloudConnected: boolean;
  firebaseUser: any;
  availableAccounts: User[];
  hasMultipleRoles: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithCredentials: (emailOrId: string, password?: string, role?: UserRole) => Promise<boolean>;
  registerUser: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  switchUserRole: (role: UserRole, className?: string) => Promise<void>;
  switchUserAccount: (targetUser: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'e_amaran_session_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [availableAccounts, setAvailableAccounts] = useState<User[]>([]);

  // Cari semua akaun yang berdaftar dengan alamat emel pengguna semasa
  const refreshMatchingAccounts = async (currentUser: User | null) => {
    if (!currentUser?.email) {
      setAvailableAccounts([]);
      return;
    }
    try {
      const email = currentUser.email.toLowerCase().trim();
      const allUsers = await dataService.getUsers();
      const matched = allUsers.filter(
        (u) => u.email && u.email.toLowerCase().trim() === email
      );
      setAvailableAccounts(matched);
    } catch {
      setAvailableAccounts([]);
    }
  };

  useEffect(() => {
    refreshMatchingAccounts(user);
  }, [user]);

  useEffect(() => {
    // 1. Initialize dataService (seeds sample data if first run)
    dataService.initialize().then(() => {
      // 2. Semak sesi tersimpan
      const savedUserStr = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr);
          if (parsed && parsed.id) {
            setUser(parsed);
            setIsLoading(false);
            return;
          }
        } catch {
          // ignore
        }
      }

      // Jika tiada sesi, jangan auto-login agar pengguna boleh memilih Log Masuk atau Daftar Akaun
      setUser(null);
      setIsLoading(false);
    });

    // 3. Listener Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Segerak data asas ke Firestore jika belum ada
        dataService.ensureFirestoreSeeded().catch(() => {});

        const email = fbUser.email || '';
        const isUmmiOrAdmin = email === 'ummihasya@gmail.com' || email.toLowerCase().includes('admin');

        // Cari profile dalam dataService (Firestore / Local cache)
        const allUsers = await dataService.getUsers();
        const matched = allUsers.find(
          (u) =>
            u.id === fbUser.uid ||
            (u.email && u.email.toLowerCase() === email.toLowerCase())
        );

        if (matched) {
          setUser(matched);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(matched));
        } else if (!fbUser.isAnonymous) {
          const role: UserRole = isUmmiOrAdmin ? 'admin' : 'teacher';
          const authedUser: User = {
            id: fbUser.uid,
            name: fbUser.displayName || email.split('@')[0],
            email,
            role,
            assignedClasses: role === 'teacher' ? ['3 AA'] : [],
            active: true,
            createdAt: new Date().toISOString(),
          };
          setUser(authedUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authedUser));
          await dataService.saveUser(authedUser, authedUser);
        }
      } else {
        // Jika belum ada pengguna Firebase, cuba sambung secara tanpa nama (Anonymous)
        // supaya setiap operasi baca & tulis ke Firestore berjaya tanpa disekat oleh peraturan keselamatan!
        try {
          await signInAnonymously(auth);
        } catch (anonErr) {
          console.warn('Anonymous auth auto-sign-in note:', anonErr);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      const res = await signInWithPopup(auth, googleProvider);
      const fbUser = res.user;
      await dataService.ensureFirestoreSeeded().catch(() => {});
      const email = fbUser.email || '';
      const isUmmiOrAdmin = email === 'ummihasya@gmail.com' || email.toLowerCase().includes('admin');

      const allUsers = await dataService.getUsers();
      let matched = allUsers.find(
        (u) =>
          u.id === fbUser.uid ||
          (u.email && u.email.toLowerCase() === email.toLowerCase())
      );

      if (!matched) {
        const role: UserRole = isUmmiOrAdmin ? 'admin' : 'teacher';
        matched = {
          id: fbUser.uid,
          name: fbUser.displayName || email.split('@')[0],
          email,
          role,
          assignedClasses: role === 'teacher' ? ['3 AA'] : [],
          active: true,
          createdAt: new Date().toISOString(),
        };
        await dataService.saveUser(matched, matched);
      }

      setUser(matched);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(matched));
      await dataService.addAuditLog('Log Masuk Google', 'user', matched.id, { email }, matched);
    } catch (e) {
      console.error('Google Sign-in failed: ', e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithCredentials = async (
    emailOrId: string,
    password?: string,
    targetRole?: UserRole
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const cleanInput = emailOrId.trim().toLowerCase();
      let matchedUser: User | null = null;

      // 1. Cuba Firebase Auth jika emel mengandungi '@' dan kata laluan dibekalkan
      if (password && cleanInput.includes('@')) {
        try {
          const res = await signInWithEmailAndPassword(auth, cleanInput, password);
          if (res.user) {
            const allUsers = await dataService.getUsers();
            matchedUser =
              allUsers.find(
                (u) =>
                  u.id === res.user.uid ||
                  u.email.toLowerCase() === cleanInput
              ) || null;

            if (!matchedUser) {
              const isUmmiOrAdmin =
                cleanInput === 'ummihasya@gmail.com' || cleanInput.includes('admin');
              const role: UserRole = targetRole || (isUmmiOrAdmin ? 'admin' : 'teacher');
              matchedUser = {
                id: res.user.uid,
                name: res.user.displayName || cleanInput.split('@')[0],
                email: cleanInput,
                role,
                assignedClasses: role === 'teacher' ? ['3 AA'] : [],
                active: true,
                createdAt: new Date().toISOString(),
              };
              await dataService.saveUser(matchedUser, matchedUser);
            }
          }
        } catch (fbErr: any) {
          console.warn('Firebase Auth sign in notice:', fbErr?.code);
          // Jika salah kata laluan di Firebase Auth, semak sama ada akaun tempatan mempunyai kata laluan
          if (
            fbErr?.code === 'auth/wrong-password' ||
            fbErr?.code === 'auth/invalid-credential'
          ) {
            const allUsers = await dataService.getUsers();
            const localMatch = allUsers.find((u) => u.email.toLowerCase() === cleanInput);
            if (localMatch && localMatch.password && localMatch.password !== password) {
              throw new Error('Kata laluan tidak tepat. Sila semak semula.');
            }
          }
        }
      }

      // 2. Jika belum matched, semak dalam pangkalan data pengguna sedia ada (Firestore / Local DataService)
      if (!matchedUser) {
        const users = await dataService.getUsers();
        const matchingUsers = users.filter(
          (u) =>
            (u.email && u.email.toLowerCase() === cleanInput) ||
            (u.id && u.id.toLowerCase() === cleanInput)
        );

        if (matchingUsers.length > 0) {
          // Jika pengguna memilih peranan spesifik, utamakan akaun dengan peranan tersebut!
          const found = targetRole
            ? matchingUsers.find((u) => u.role === targetRole) || matchingUsers[0]
            : matchingUsers[0];

          // Jika pengguna mempunyai kata laluan tersimpan, pastikan kata laluan sepadan
          if (found.password && password && found.password !== password) {
            throw new Error('Kata laluan tidak tepat. Sila semak semula.');
          }
          matchedUser = found;
        } else {
          // Semak jika pengguna menggunakan akaun demo lalai
          const isDemoAdmin =
            cleanInput === 'admin@sekolah.edu.my' || cleanInput === 'admin';
          const isDemoTeacher =
            cleanInput === 'guru.3aa@sekolah.edu.my' ||
            cleanInput === 'guru.3bb@sekolah.edu.my' ||
            cleanInput === 'guru';

          if (isDemoAdmin) {
            matchedUser = {
              id: 'user_admin_default',
              name: 'Pentadbir Sistem (Admin)',
              email: 'admin@sekolah.edu.my',
              role: 'admin',
              assignedClasses: [],
              active: true,
              createdAt: new Date().toISOString(),
            };
          } else if (isDemoTeacher) {
            matchedUser = {
              id: 'user_cikgu_ahmad',
              name: 'Cikgu Ahmad bin Razali',
              email: 'guru.3aa@sekolah.edu.my',
              role: 'teacher',
              assignedClasses: ['3 AA', 'class_3aa'],
              active: true,
              createdAt: new Date().toISOString(),
            };
          } else {
            throw new Error(
              'Akaun tidak dijumpai. Sila klik tab "Daftar Akaun" untuk mendaftar pengguna baru.'
            );
          }
        }
      }

      setUser(matchedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(matchedUser));
      await dataService.addAuditLog(
        'Log Masuk Sistem',
        'user',
        matchedUser.id,
        { role: matchedUser.role, email: matchedUser.email },
        matchedUser
      );
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const registerUser = async (data: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    try {
      const cleanEmail = data.email.trim().toLowerCase();
      const cleanName = data.name.trim();

      if (!cleanEmail || !cleanName) {
        throw new Error('Sila lengkapkan nama penuh dan alamat emel.');
      }

      // Semak sama ada emel sudah didaftarkan
      const existingUsers = await dataService.getUsers();
      const alreadyExists = existingUsers.some(
        (u) => u.email && u.email.toLowerCase() === cleanEmail
      );
      if (alreadyExists) {
        throw new Error(
          'Emel ini telah didaftarkan dalam sistem. Sila log masuk atau gunakan emel lain.'
        );
      }

      let userId = `user_${Date.now()}`;

      // 1. Cuba daftar di Firebase Auth jika kata laluan dibekalkan
      if (data.password && data.password.length >= 6) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, data.password);
          if (cred.user) {
            userId = cred.user.uid;
            try {
              await updateProfile(cred.user, { displayName: cleanName });
            } catch {
              // ignore
            }
          }
        } catch (fbErr: any) {
          console.warn('Firebase Auth registration note:', fbErr?.code);
          if (fbErr?.code === 'auth/email-already-in-use') {
            throw new Error(
              'Emel ini sudah berdaftar di pangkalan data Firebase. Sila gunakan tab "Log Masuk".'
            );
          } else if (fbErr?.code === 'auth/weak-password') {
            throw new Error('Kata laluan mestilah sekurang-kurangnya 6 aksara.');
          } else if (fbErr?.code === 'auth/invalid-email') {
            throw new Error('Format alamat emel tidak sah.');
          }
          // Jika operation-not-allowed atau ralat rangkaian, teruskan dengan simpanan profil
        }
      }

      const assigned =
        data.role === 'teacher' && data.assignedClasses && data.assignedClasses.length > 0
          ? data.assignedClasses
          : [];

      const newUser: User = {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        role: data.role,
        assignedClasses: assigned,
        active: true,
        createdAt: new Date().toISOString(),
        password: data.password,
      };

      // Simpan pengguna ke Firestore & tempatan
      await dataService.saveUser(newUser, newUser);

      // Jika guru ini memilih kelas, kemaskini maklumat guru dalam kelas tersebut
      if (data.role === 'teacher' && assigned.length > 0) {
        const classes = await dataService.getClasses();
        for (const clsName of assigned) {
          const targetCls = classes.find(
            (c) => c.className.trim().toUpperCase() === clsName.trim().toUpperCase()
          );
          if (targetCls) {
            await dataService.saveClass(
              {
                ...targetCls,
                teacherId: newUser.id,
                teacherName: newUser.name,
              },
              newUser
            );
          }
        }
      }

      // Log masuk pengguna secara automatik selepas pendaftaran berjaya
      setUser(newUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      await dataService.addAuditLog(
        'Pendaftaran Pengguna Baru',
        'user',
        newUser.id,
        { role: newUser.role, assignedClasses: assigned },
        newUser
      );

      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    }
    if (user) {
      await dataService.addAuditLog('Log Keluar Sistem', 'user', user.id, {}, user);
    }
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const switchUserAccount = async (targetUser: User) => {
    setUser(targetUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(targetUser));
    await refreshMatchingAccounts(targetUser);
    await dataService.addAuditLog(
      'Tukar Akaun Pengguna',
      'user',
      targetUser.id,
      { role: targetUser.role, email: targetUser.email, name: targetUser.name },
      targetUser
    );
  };

  const switchUserRole = async (newRole: UserRole, className: string = '3 AA') => {
    if (!user) return;

    const currentEmail = user.email ? user.email.toLowerCase().trim() : '';
    const allUsers = await dataService.getUsers();

    // 1. Semak sama ada terdapat akaun berasingan dengan emel ini dan peranan newRole
    const existingAccountWithRole = allUsers.find(
      (u) =>
        u.email &&
        u.email.toLowerCase().trim() === currentEmail &&
        u.role === newRole
    );

    if (existingAccountWithRole) {
      await switchUserAccount(existingAccountWithRole);
      return;
    }

    // 2. Jika tiada akaun kedua yang berasingan, tukar peranan akaun semasa secara lancar dengan mengekalkan nama & emel sebenar
    let targetClasses = user.assignedClasses || [];
    if (newRole === 'teacher' && (!targetClasses || targetClasses.length === 0)) {
      const allClasses = await dataService.getClasses();
      const firstClass = allClasses.length > 0 ? allClasses[0].className : className;
      targetClasses = [firstClass];
    }

    const updatedUser: User = {
      ...user,
      role: newRole,
      assignedClasses: newRole === 'teacher' ? targetClasses : (user.assignedClasses || []),
    };

    setUser(updatedUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    await refreshMatchingAccounts(updatedUser);

    try {
      await dataService.saveUser(updatedUser, updatedUser);
    } catch {
      // ignore
    }

    await dataService.addAuditLog(
      'Tukar Peranan Pengguna',
      'user',
      updatedUser.id,
      { previousRole: user.role, newRole: updatedUser.role, email: updatedUser.email },
      updatedUser
    );
  };

  const hasMultipleRoles =
    availableAccounts.length > 1 ||
    (user?.email?.toLowerCase().includes('ummi') ?? false) ||
    (user?.email?.toLowerCase().includes('admin') ?? false) ||
    user?.role === 'admin' ||
    user?.role === 'teacher';

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        assignedClasses: user?.assignedClasses || [],
        isLoading,
        isCloudConnected: !!firebaseUser,
        firebaseUser,
        availableAccounts,
        hasMultipleRoles,
        loginWithGoogle,
        loginWithCredentials,
        registerUser,
        logout,
        switchUserRole,
        switchUserAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
