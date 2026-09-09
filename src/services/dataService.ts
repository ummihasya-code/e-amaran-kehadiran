import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/firestoreErrors';
import {
  AttendanceRecord,
  AttendanceSettings,
  AuditLog,
  SchoolClass,
  Student,
  User,
  WarningLetter,
} from '../types';
import { DEFAULT_SETTINGS } from './warningEngine';
import {
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_USERS,
  generateInitialAttendance,
} from './sampleData';
import { sortSchoolClasses, STANDARD_SCHOOL_CLASSES } from '../utils/classOrder';
import { normalizeStudentName, normalizeClassName } from '../utils/studentMatcher';

const LOCAL_STORAGE_KEY_PREFIX = 'e_amaran_';

export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleanObj[key] = sanitizeForFirestore(value);
      }
    }
    return cleanObj as T;
  }
  return data;
}

function getLocal<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + key);
    if (!raw) return defaultVal;
    return JSON.parse(raw) as T;
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + key, JSON.stringify(val));
  } catch (e) {
    console.error('LocalStorage error: ', e);
  }
}

class DataService {
  private initialized = false;

  // Initialize data: seed if empty
  async initialize(): Promise<void> {
    if (this.initialized) return;

    let users = getLocal<User[]>('users', []);
    let classes = getLocal<SchoolClass[]>('classes', []);
    let students = getLocal<Student[]>('students', []);
    let attendance = getLocal<AttendanceRecord[]>('attendance', []);
    let settings = getLocal<AttendanceSettings>('settings', DEFAULT_SETTINGS);

    if (users.length === 0) {
      users = INITIAL_USERS;
      setLocal('users', users);
    }
    if (classes.length === 0) {
      classes = INITIAL_CLASSES;
      setLocal('classes', classes);
    }
    if (students.length === 0) {
      students = INITIAL_STUDENTS;
      setLocal('students', students);
    }
    if (attendance.length === 0) {
      attendance = generateInitialAttendance();
      setLocal('attendance', attendance);
    }

    // Try syncing initial documents to Firestore in background
    this.syncToFirestoreIfEmpty(users, classes, students, attendance, settings).catch((err) => {
      console.warn('Firestore initial sync deferred: ', err);
    });

    this.initialized = true;
  }

  private async syncToFirestoreIfEmpty(
    users: User[],
    classes: SchoolClass[],
    students: Student[],
    attendance: AttendanceRecord[],
    settings: AttendanceSettings
  ) {
    if (!auth.currentUser) {
      return;
    }
    try {
      const snap = await getDocs(collection(db, 'classes'));
      if (snap.empty) {
        const batch = writeBatch(db);
        for (const c of classes) {
          batch.set(doc(db, 'classes', c.id), c);
        }
        for (const u of users) {
          batch.set(doc(db, 'users', u.id), u);
        }
        for (const s of students) {
          batch.set(doc(db, 'students', s.id), s);
        }
        for (const a of attendance.slice(0, 50)) {
          batch.set(doc(db, 'attendance', a.id), a);
        }
        batch.set(doc(db, 'settings', settings.id), settings);
        await batch.commit();
      }
    } catch (e) {
      // Ignored if offline or rules deny initial anonymous sync
    }
  }

  // AUDIT LOG
  async addAuditLog(
    action: string,
    targetType: string,
    targetId: string,
    metadata: Record<string, any> = {},
    user?: { id: string; name?: string }
  ): Promise<AuditLog> {
    const log: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: user?.id || 'system',
      userName: user?.name || 'Sistem',
      action,
      targetType,
      targetId,
      timestamp: new Date().toISOString(),
      metadata,
    };

    const current = getLocal<AuditLog[]>('auditLogs', []);
    current.unshift(log);
    setLocal('auditLogs', current);

    try {
      await setDoc(doc(db, 'auditLogs', log.id), sanitizeForFirestore(log));
    } catch (e) {
      if (auth.currentUser) {
        handleFirestoreError(e, OperationType.WRITE, `auditLogs/${log.id}`, auth.currentUser);
      } else {
        console.warn('Audit log write to Firestore fallback to local: ', e);
      }
    }

    return log;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list = snap.docs.map((d) => d.data() as AuditLog);
        setLocal('auditLogs', list);
        return list;
      }
    } catch {
      // fallback
    }
    return getLocal<AuditLog[]>('auditLogs', []);
  }

  // STUDENTS
  async getStudents(includeInactive: boolean = false): Promise<Student[]> {
    try {
      const snap = await getDocs(collection(db, 'students'));
      if (!snap.empty) {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Student);
        setLocal('students', list);
        return includeInactive
          ? list
          : list.filter((s) => !s.isDeleted && s.status !== 'pindah' && s.status !== 'dibuang');
      }
    } catch {
      // fallback
    }
    const list = getLocal<Student[]>('students', INITIAL_STUDENTS);
    return includeInactive
      ? list
      : list.filter((s) => !s.isDeleted && s.status !== 'pindah' && s.status !== 'dibuang');
  }

  isStudentRemoved(name: string, studentNumber?: string, studentId?: string): boolean {
    const removedSet = new Set(getLocal<string[]>('removed_students_registry', []));
    if (studentId && removedSet.has(studentId)) return true;
    if (name && removedSet.has(normalizeStudentName(name))) return true;
    if (studentNumber && removedSet.has(studentNumber.trim().toUpperCase())) return true;
    return false;
  }

  async saveStudent(student: Student, user?: { id: string; name?: string }): Promise<void> {
    const list = getLocal<Student[]>('students', []);
    const idx = list.findIndex((s) => s.id === student.id);
    const isNew = idx === -1;

    if (isNew) {
      list.push(student);
    } else {
      list[idx] = { ...list[idx], ...student, updatedAt: new Date().toISOString() };
    }
    setLocal('students', list);

    try {
      await setDoc(doc(db, 'students', student.id), sanitizeForFirestore(student), { merge: true });
    } catch (e) {
      if (auth.currentUser) {
        handleFirestoreError(e, OperationType.WRITE, `students/${student.id}`, auth.currentUser);
      } else {
        console.warn('Firestore write warning for students: fallback to local cache:', e);
      }
    }

    await this.addAuditLog(
      isNew ? 'Tambah Murid' : 'Kemaskini Murid',
      'student',
      student.id,
      { name: student.name, className: student.className },
      user
    );
  }

  async deleteStudent(
    studentId: string,
    options?: {
      action?: 'pindah' | 'dibuang' | 'delete';
      reason?: string;
      deleteAllAttendance?: boolean;
    },
    user?: { id: string; name?: string }
  ): Promise<void> {
    const list = getLocal<Student[]>('students', []);
    const targetStudent = list.find((s) => s.id === studentId);
    const action = options?.action || 'delete';
    const reasonText =
      options?.reason ||
      (action === 'pindah'
        ? 'Pindah Sekolah'
        : action === 'dibuang'
        ? 'Dibuang Sekolah'
        : 'Padam Rekod Murid');

    if (action === 'delete') {
      const updated = list.filter((s) => s.id !== studentId);
      setLocal('students', updated);
      try {
        await deleteDoc(doc(db, 'students', studentId));
      } catch (e) {
        if (auth.currentUser) {
          handleFirestoreError(e, OperationType.DELETE, `students/${studentId}`, auth.currentUser);
        } else {
          console.warn('Firestore delete warning for students: fallback to local cache:', e);
        }
      }
    } else {
      // Tandakan murid sebagai 'pindah' atau 'dibuang' (soft delete dengan status)
      const updated = list.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            status: action,
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletedReason: reasonText,
          };
        }
        return s;
      });
      setLocal('students', updated);

      try {
        await updateDoc(doc(db, 'students', studentId), {
          status: action,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          deletedReason: reasonText,
        });
      } catch (e) {
        if (auth.currentUser) {
          handleFirestoreError(e, OperationType.UPDATE, `students/${studentId}`, auth.currentUser);
        } else {
          console.warn('Firestore update warning for student status: fallback to local cache:', e);
        }
      }
    }

    // Daftarkan ke rekod senarai murid disingkirkan supaya import masa hadapan tidak merekodkan murid ini lagi
    const removedSet = new Set(getLocal<string[]>('removed_students_registry', []));
    removedSet.add(studentId);
    if (targetStudent?.name) {
      removedSet.add(normalizeStudentName(targetStudent.name));
    }
    if (targetStudent?.studentNumber) {
      removedSet.add(targetStudent.studentNumber.trim().toUpperCase());
    }
    setLocal('removed_students_registry', Array.from(removedSet));

    // Padam atau tandakan rekod kehadiran murid ini agar tidak lagi tersenarai dalam rekod kehadiran & kiraan amaran
    const attendanceList = getLocal<AttendanceRecord[]>('attendance', []);
    const studentNormName = targetStudent?.name ? normalizeStudentName(targetStudent.name) : '';
    const affectedAttendance = attendanceList.filter(
      (a) =>
        a.studentId === studentId ||
        (studentNormName && a.studentName && normalizeStudentName(a.studentName) === studentNormName)
    );

    if (affectedAttendance.length > 0) {
      const updatedAttendance = attendanceList.map((a) => {
        if (
          a.studentId === studentId ||
          (studentNormName && a.studentName && normalizeStudentName(a.studentName) === studentNormName)
        ) {
          return {
            ...a,
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletedBy: user?.name || 'Sistem',
            deleteReason: `Murid telah ${reasonText}`,
          };
        }
        return a;
      });
      setLocal('attendance', updatedAttendance);

      // Kemaskini di Firestore secara latar
      for (const rec of affectedAttendance) {
        try {
          await updateDoc(doc(db, 'attendance', rec.id), {
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletedBy: user?.name || 'Sistem',
            deleteReason: `Murid telah ${reasonText}`,
          });
        } catch {
          // ignore
        }
      }
    }

    await this.addAuditLog(
      action === 'pindah'
        ? 'Murid Pindah Sekolah'
        : action === 'dibuang'
        ? 'Tindakan Buang Sekolah'
        : 'Padam Murid',
      'student',
      studentId,
      {
        name: targetStudent?.name || studentId,
        className: targetStudent?.className,
        tindakan: action,
        sebab: reasonText,
        rekodKehadiranDinyahaktif: affectedAttendance.length,
      },
      user
    );
  }

  // CLASSES
  async getClasses(): Promise<SchoolClass[]> {
    try {
      const snap = await getDocs(collection(db, 'classes'));
      if (!snap.empty) {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as SchoolClass);
        const sorted = sortSchoolClasses(list);
        setLocal('classes', sorted);
        return sorted;
      }
    } catch {
      // fallback
    }
    const localList = getLocal<SchoolClass[]>('classes', INITIAL_CLASSES);
    return sortSchoolClasses(localList);
  }

  async saveClass(cls: SchoolClass, user?: { id: string; name?: string }): Promise<void> {
    const list = getLocal<SchoolClass[]>('classes', []);
    const idx = list.findIndex((c) => c.id === cls.id);
    const isNew = idx === -1;
    if (isNew) {
      list.push(cls);
    } else {
      list[idx] = { ...list[idx], ...cls };
    }
    const sorted = sortSchoolClasses(list);
    setLocal('classes', sorted);

    try {
      await setDoc(doc(db, 'classes', cls.id), sanitizeForFirestore(cls), { merge: true });
    } catch (e) {
      if (auth.currentUser) {
        handleFirestoreError(e, OperationType.WRITE, `classes/${cls.id}`, auth.currentUser);
      } else {
        console.warn('Firestore write warning for classes: fallback to local cache:', e);
      }
    }

    const auditMeta: Record<string, any> = { className: cls.className };
    if (cls.teacherName) {
      auditMeta.teacherName = cls.teacherName;
    }

    await this.addAuditLog(
      isNew ? 'Tambah Kelas' : 'Kemaskini Kelas',
      'class',
      cls.id,
      auditMeta,
      user
    );
  }

  async seedStandardClasses(user?: { id: string; name?: string }): Promise<SchoolClass[]> {
    const existing = await this.getClasses();
    const existingNames = new Set(existing.map((c) => c.className.trim().toUpperCase()));
    const toAdd: SchoolClass[] = [];

    for (const name of STANDARD_SCHOOL_CLASSES) {
      if (!existingNames.has(name.toUpperCase())) {
        const cleanId = 'class_' + name.toLowerCase().replace(/[^a-z0-9]/g, '');
        toAdd.push({
          id: cleanId,
          className: name,
          active: true,
        });
      }
    }

    if (toAdd.length > 0) {
      const updated = sortSchoolClasses([...existing, ...toAdd]);
      setLocal('classes', updated);

      try {
        const batch = writeBatch(db);
        for (const c of toAdd) {
          batch.set(doc(db, 'classes', c.id), sanitizeForFirestore(c), { merge: true });
        }
        await batch.commit();
      } catch (e) {
        console.warn('Batch write warning for classes:', e);
      }

      await this.addAuditLog(
        'Jana Kelas Standard',
        'class',
        'standard_classes',
        { addedCount: toAdd.length },
        user
      );
      return updated;
    }

    return existing;
  }

  async deleteClass(classId: string, user?: { id: string; name?: string }): Promise<void> {
    const list = getLocal<SchoolClass[]>('classes', []);
    const targetClass = list.find((c) => c.id === classId);
    const updated = list.filter((c) => c.id !== classId);
    setLocal('classes', updated);

    // Also remove from any user's assignedClasses
    if (targetClass) {
      const userList = getLocal<User[]>('users', []);
      let usersChanged = false;
      const updatedUsers = userList.map((u) => {
        if (
          u.assignedClasses.includes(targetClass.className) ||
          u.assignedClasses.includes(classId)
        ) {
          usersChanged = true;
          return {
            ...u,
            assignedClasses: u.assignedClasses.filter(
              (nameOrId) => nameOrId !== targetClass.className && nameOrId !== classId
            ),
          };
        }
        return u;
      });
      if (usersChanged) {
        setLocal('users', updatedUsers);
      }
    }

    try {
      await deleteDoc(doc(db, 'classes', classId));
    } catch (e) {
      if (auth.currentUser) {
        handleFirestoreError(e, OperationType.DELETE, `classes/${classId}`, auth.currentUser);
      } else {
        console.warn('Firestore delete warning for classes: fallback to local cache:', e);
      }
    }

    await this.addAuditLog(
      'Padam Kelas',
      'class',
      classId,
      { className: targetClass?.className || classId },
      user
    );
  }

  async unassignTeacherFromClass(
    classId: string,
    user?: { id: string; name?: string }
  ): Promise<void> {
    const list = getLocal<SchoolClass[]>('classes', []);
    const cls = list.find((c) => c.id === classId);
    if (!cls) return;

    const prevTeacherId = cls.teacherId;
    const prevTeacherName = cls.teacherName;

    cls.teacherId = undefined;
    cls.teacherName = undefined;
    setLocal('classes', list);

    try {
      await updateDoc(doc(db, 'classes', classId), {
        teacherId: null,
        teacherName: null,
      });
    } catch (e) {
      console.warn('Firestore update warning for unassign teacher:', e);
    }

    // Remove from teacher assignedClasses
    if (prevTeacherId) {
      const userList = getLocal<User[]>('users', []);
      const teacher = userList.find((u) => u.id === prevTeacherId);
      if (teacher) {
        teacher.assignedClasses = teacher.assignedClasses.filter(
          (c) => c !== cls.className && c !== cls.id
        );
        setLocal('users', userList);
        try {
          await updateDoc(doc(db, 'users', prevTeacherId), {
            assignedClasses: teacher.assignedClasses,
          });
        } catch (e) {
          console.warn('Firestore update warning for teacher assignedClasses:', e);
        }
      }
    }

    await this.addAuditLog(
      'Padam Lantikan Guru Kelas',
      'class',
      classId,
      { className: cls.className, removedTeacher: prevTeacherName },
      user
    );
  }

  // USERS
  async getUsers(): Promise<User[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as User);
        setLocal('users', list);
        return list;
      }
    } catch {
      // fallback
    }
    return getLocal<User[]>('users', INITIAL_USERS);
  }

  async saveUser(u: User, user?: { id: string; name?: string }): Promise<void> {
    const list = getLocal<User[]>('users', []);
    const idx = list.findIndex((item) => item.id === u.id);
    const isNew = idx === -1;
    if (isNew) {
      list.push(u);
    } else {
      list[idx] = { ...list[idx], ...u };
    }
    setLocal('users', list);

    try {
      await setDoc(doc(db, 'users', u.id), sanitizeForFirestore(u), { merge: true });
    } catch (e) {
      if (auth.currentUser) {
        handleFirestoreError(e, OperationType.WRITE, `users/${u.id}`, auth.currentUser);
      } else {
        console.warn('Firestore write warning for users: fallback to local cache:', e);
      }
    }

    await this.addAuditLog(
      isNew ? 'Tambah Pengguna' : 'Kemaskini Pengguna',
      'user',
      u.id,
      { name: u.name, role: u.role, assignedClasses: u.assignedClasses },
      user
    );
  }

  async deleteUser(userId: string, user?: { id: string; name?: string }): Promise<void> {
    const list = getLocal<User[]>('users', []);
    const targetUser = list.find((u) => u.id === userId);
    const updated = list.filter((u) => u.id !== userId);
    setLocal('users', updated);

    // If teacher was assigned to any classes, clear that teacher from those classes
    const classList = getLocal<SchoolClass[]>('classes', []);
    let classesChanged = false;
    const updatedClasses = classList.map((c) => {
      if (c.teacherId === userId) {
        classesChanged = true;
        return {
          ...c,
          teacherId: undefined,
          teacherName: undefined,
        };
      }
      return c;
    });
    if (classesChanged) {
      setLocal('classes', updatedClasses);
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (e) {
      if (auth.currentUser) {
        handleFirestoreError(e, OperationType.DELETE, `users/${userId}`, auth.currentUser);
      } else {
        console.warn('Firestore delete warning for users: fallback to local cache:', e);
      }
    }

    await this.addAuditLog(
      'Padam Guru / Pengguna',
      'user',
      userId,
      { name: targetUser?.name || userId, email: targetUser?.email },
      user
    );
  }

  // ATTENDANCE
  private deduplicateAttendance(records: AttendanceRecord[]): AttendanceRecord[] {
    const sorted = [...records].sort((a, b) => {
      if (!a.isDeleted && b.isDeleted) return -1;
      if (a.isDeleted && !b.isDeleted) return 1;
      const aHasReason = a.reason && a.reason.trim() !== 'TIADA MAKLUMAN' && a.reason.trim() !== '';
      const bHasReason = b.reason && b.reason.trim() !== 'TIADA MAKLUMAN' && b.reason.trim() !== '';
      if (aHasReason && !bHasReason) return -1;
      if (!aHasReason && bHasReason) return 1;
      const aTime = a.updatedAt || a.createdAt || '';
      const bTime = b.updatedAt || b.createdAt || '';
      return bTime.localeCompare(aTime);
    });

    const seen = new Set<string>();
    const result: AttendanceRecord[] = [];

    for (const r of sorted) {
      if (r.isDeleted) {
        result.push(r);
        continue;
      }
      const normKey1 = `${r.studentId}__${r.date}`;
      const normKey2 = r.studentName
        ? `${normalizeStudentName(r.studentName)}__${normalizeClassName(r.className)}__${r.date}`
        : normKey1;

      if (seen.has(normKey1) || seen.has(normKey2)) {
        continue;
      }
      seen.add(normKey1);
      seen.add(normKey2);
      result.push(r);
    }

    return result;
  }

  async getAttendance(): Promise<AttendanceRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'attendance'));
      if (!snap.empty) {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as AttendanceRecord);
        const deduped = this.deduplicateAttendance(list);
        setLocal('attendance', deduped);
        return deduped;
      }
    } catch {
      // fallback
    }
    const local = getLocal<AttendanceRecord[]>('attendance', generateInitialAttendance());
    return this.deduplicateAttendance(local);
  }

  async syncOrAddAttendanceRecord(
    record: AttendanceRecord,
    user?: { id: string; name?: string }
  ): Promise<{ success: boolean; updated: boolean; duplicate?: boolean }> {
    const list = getLocal<AttendanceRecord[]>('attendance', []);
    const normName = record.studentName ? normalizeStudentName(record.studentName) : '';
    const normClass = record.className ? normalizeClassName(record.className) : '';

    // Cari jika sudah wujud rekod aktif bagi murid dan tarikh yang sama
    const existingIdx = list.findIndex((r) => {
      if (r.isDeleted) return false;
      if (r.studentId === record.studentId && r.date === record.date) return true;
      if (normName && r.studentName && normalizeStudentName(r.studentName) === normName && r.date === record.date) {
        if (!normClass || !r.className || normalizeClassName(r.className) === normClass) {
          return true;
        }
      }
      return false;
    });

    if (existingIdx !== -1) {
      const existing = list[existingIdx];
      // Jika maklumat sebab sama persis, tiada perubahan diperlukan
      if (existing.reason === record.reason && existing.countsTowardsWarning === record.countsTowardsWarning) {
        return { success: true, updated: false, duplicate: true };
      }

      // Segerak & kemaskini sebab ke dalam rekod sedia ada
      const updated: AttendanceRecord = {
        ...existing,
        reason: record.reason || existing.reason,
        countsTowardsWarning: record.countsTowardsWarning,
        className: record.className || existing.className,
        classId: record.classId || existing.classId,
        studentName: record.studentName || existing.studentName,
        studentId: record.studentId || existing.studentId,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.name || 'excel_sync',
      };

      list[existingIdx] = updated;
      const cleaned = this.deduplicateAttendance(list);
      setLocal('attendance', cleaned);

      try {
        await updateDoc(doc(db, 'attendance', existing.id), sanitizeForFirestore({
          reason: updated.reason,
          countsTowardsWarning: updated.countsTowardsWarning,
          className: updated.className,
          classId: updated.classId,
          studentName: updated.studentName,
          studentId: updated.studentId,
          updatedAt: updated.updatedAt,
          updatedBy: updated.updatedBy,
        }));
      } catch (e) {
        if (auth.currentUser) {
          handleFirestoreError(e, OperationType.UPDATE, `attendance/${existing.id}`, auth.currentUser);
        } else {
          console.warn('Firestore attendance sync fallback to local cache: ', e);
        }
      }

      await this.addAuditLog(
        'Segerak Sebab Kehadiran (Import Sync)',
        'attendance',
        existing.id,
        {
          studentName: updated.studentName,
          date: updated.date,
          sebabSebelum: existing.reason,
          sebabBaru: updated.reason,
        },
        user
      );

      return { success: true, updated: true };
    }

    // Jika tiada rekod lama, tambah sebagai rekod baharu
    list.unshift(record);
    const cleaned = this.deduplicateAttendance(list);
    setLocal('attendance', cleaned);

    try {
      await setDoc(doc(db, 'attendance', record.id), sanitizeForFirestore(record));
    } catch (e) {
      if (auth.currentUser) {
        handleFirestoreError(e, OperationType.WRITE, `attendance/${record.id}`, auth.currentUser);
      } else {
        console.warn('Firestore attendance write fallback: ', e);
      }
    }

    await this.addAuditLog(
      'Tambah Rekod Kehadiran',
      'attendance',
      record.id,
      {
        studentName: record.studentName,
        className: record.className,
        date: record.date,
        reason: record.reason,
        countsTowardsWarning: record.countsTowardsWarning,
      },
      user
    );

    return { success: true, updated: false };
  }

  async addAttendanceRecord(
    record: AttendanceRecord,
    user?: { id: string; name?: string }
  ): Promise<{ success: boolean; duplicate?: boolean }> {
    const res = await this.syncOrAddAttendanceRecord(record, user);
    return { success: res.success, duplicate: res.duplicate };
  }

  async updateAttendanceRecord(
    id: string,
    partial: Partial<AttendanceRecord>,
    user?: { id: string; name?: string }
  ): Promise<void> {
    const list = getLocal<AttendanceRecord[]>('attendance', []);
    let idx = list.findIndex((r) => r.id === id);

    // Fallback: jika id berbeza, cari rekod berdasarkan studentId & date atau nama & date
    if (idx === -1) {
      idx = list.findIndex((r) => {
        if (r.isDeleted) return false;
        if (partial.studentId && partial.date && r.studentId === partial.studentId && r.date === partial.date) {
          return true;
        }
        if (
          partial.studentName &&
          partial.date &&
          r.studentName &&
          normalizeStudentName(r.studentName) === normalizeStudentName(partial.studentName) &&
          r.date === partial.date
        ) {
          return true;
        }
        return false;
      });
    }

    if (idx === -1) {
      // Jika rekod tiada langsung dalam simpanan tempatan, tambah terus secara selamat
      if (partial.studentId && partial.date) {
        await this.syncOrAddAttendanceRecord(
          {
            id,
            studentId: partial.studentId,
            studentName: partial.studentName || '',
            classId: partial.classId || '',
            className: partial.className || '',
            date: partial.date,
            reason: partial.reason || 'TIADA MAKLUMAN',
            countsTowardsWarning: partial.countsTowardsWarning ?? true,
            createdAt: new Date().toISOString(),
            createdBy: user?.name || 'Admin',
          },
          user
        );
      }
      return;
    }

    const prev = list[idx];
    const targetDocId = prev.id || id;
    const updated: AttendanceRecord = {
      ...prev,
      ...partial,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.name || 'Admin',
    };

    list[idx] = updated;
    setLocal('attendance', list);

    try {
      await updateDoc(doc(db, 'attendance', targetDocId), sanitizeForFirestore({
        ...partial,
        updatedAt: updated.updatedAt,
        updatedBy: updated.updatedBy,
      }));
    } catch (e) {
      if (auth.currentUser) {
        handleFirestoreError(e, OperationType.UPDATE, `attendance/${targetDocId}`, auth.currentUser);
      } else {
        console.warn('Firestore attendance update fallback (disimpan ke cache tempatan): ', e);
      }
    }

    await this.addAuditLog(
      'Kemaskini Rekod Kehadiran',
      'attendance',
      targetDocId,
      {
        previous: { reason: prev.reason, countsTowardsWarning: prev.countsTowardsWarning, date: prev.date },
        updated: { reason: updated.reason, countsTowardsWarning: updated.countsTowardsWarning, date: updated.date },
      },
      user
    );
  }

  async softDeleteAttendance(
    id: string,
    deleteReason: string,
    user?: { id: string; name?: string }
  ): Promise<void> {
    const list = getLocal<AttendanceRecord[]>('attendance', []);
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Rekod tidak ditemui');

    const updated: AttendanceRecord = {
      ...list[idx],
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: user?.name || 'Admin',
      deleteReason,
    };

    list[idx] = updated;
    setLocal('attendance', list);

    try {
      await updateDoc(doc(db, 'attendance', id), sanitizeForFirestore({
        isDeleted: true,
        deletedAt: updated.deletedAt,
        deletedBy: updated.deletedBy,
        deleteReason,
      }));
    } catch (e) {
      if (auth.currentUser) {
        handleFirestoreError(e, OperationType.UPDATE, `attendance/${id}`, auth.currentUser);
      } else {
        console.warn('Firestore soft delete fallback (disimpan ke cache tempatan): ', e);
      }
    }

    await this.addAuditLog(
      'Soft Delete Rekod Kehadiran',
      'attendance',
      id,
      {
        deleteReason,
        studentName: updated.studentName,
        date: updated.date,
      },
      user
    );
  }

  // WARNING LETTERS
  async getWarningLetters(): Promise<WarningLetter[]> {
    try {
      const snap = await getDocs(collection(db, 'warningLetters'));
      if (!snap.empty) {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as WarningLetter);
        setLocal('warningLetters', list);
        return list;
      }
    } catch {
      // fallback
    }
    return getLocal<WarningLetter[]>('warningLetters', []);
  }

  async saveWarningLetter(
    studentId: string,
    warningType: 'warning1' | 'warning2' | 'warning3',
    issueDate: string,
    notes: string = '',
    user?: { id: string; name?: string }
  ): Promise<WarningLetter> {
    const id = `${studentId}_${warningType}`;
    const list = getLocal<WarningLetter[]>('warningLetters', []);
    const existingIndex = list.findIndex((w) => w.id === id);
    const isEdit = existingIndex !== -1;

    const record: WarningLetter = isEdit
      ? {
          ...list[existingIndex],
          issueDate,
          notes,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.name || 'Guru Kelas',
        }
      : {
          id,
          studentId,
          warningType,
          issueDate,
          recordedAt: new Date().toISOString(),
          recordedBy: user?.name || 'Guru Kelas',
          notes,
        };

    if (isEdit) {
      const oldDate = list[existingIndex].issueDate;
      list[existingIndex] = record;
      setLocal('warningLetters', list);

      await this.addAuditLog(
        'Edit Tarikh Surat Amaran',
        'warningLetter',
        id,
        {
          warningType,
          previousDate: oldDate,
          newDate: issueDate,
          notes,
        },
        user
      );
    } else {
      list.push(record);
      setLocal('warningLetters', list);

      await this.addAuditLog(
        `Rekod Surat ${warningType === 'warning1' ? 'Amaran 1' : warningType === 'warning2' ? 'Amaran 2' : 'Amaran 3'}`,
        'warningLetter',
        id,
        {
          warningType,
          issueDate,
          notes,
        },
        user
      );
    }

    try {
      await setDoc(doc(db, 'warningLetters', id), sanitizeForFirestore(record), { merge: true });
    } catch (e) {
      if (auth.currentUser) {
        handleFirestoreError(e, OperationType.WRITE, `warningLetters/${id}`, auth.currentUser);
      } else {
        console.warn('Firestore warningLetter write fallback: ', e);
      }
    }

    return record;
  }

  // SETTINGS
  async getSettings(): Promise<AttendanceSettings> {
    try {
      const snap = await getDocs(collection(db, 'settings'));
      if (!snap.empty) {
        const found = snap.docs.find((d) => d.id === 'rules');
        if (found) {
          const data = found.data() as AttendanceSettings;
          setLocal('settings', data);
          return data;
        }
      }
    } catch {
      // fallback
    }
    return getLocal<AttendanceSettings>('settings', DEFAULT_SETTINGS);
  }

  async saveSettings(
    settings: AttendanceSettings,
    user?: { id: string; name?: string }
  ): Promise<void> {
    const updated: AttendanceSettings = {
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.name || 'Admin',
    };
    setLocal('settings', updated);

    try {
      await setDoc(doc(db, 'settings', 'rules'), sanitizeForFirestore(updated), { merge: true });
    } catch (e) {
      if (auth.currentUser) {
        handleFirestoreError(e, OperationType.WRITE, `settings/rules`, auth.currentUser);
      } else {
        console.warn('Firestore settings write fallback: ', e);
      }
    }

    await this.addAuditLog(
      'Kemaskini Tetapan Peraturan',
      'settings',
      'rules',
      {
        warning1Threshold: updated.warning1Threshold,
        warning2Threshold: updated.warning2Threshold,
        warning3Threshold: updated.warning3Threshold,
        calculationMethod: updated.calculationMethod,
      },
      user
    );
  }
}

export const dataService = new DataService();
