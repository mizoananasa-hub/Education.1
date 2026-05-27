import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";

interface TeacherContextType {
  currentSubject: string;
  currentGrade: string;
  setCurrentSubject: (s: string) => void;
  setCurrentGrade: (g: string) => void;
  subjects: string[];
  grades: string[];
}

const TeacherContext = createContext<TeacherContextType | undefined>(undefined);

export function TeacherProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const u = user as any;

  const subjects: string[] = u?.subjects && u.subjects.length > 0
    ? u.subjects
    : u?.subject ? [u.subject] : [];

  const grades: string[] = u?.grades ?? [];

  const [currentSubject, setCurrentSubject] = useState<string>(subjects[0] ?? "");
  const [currentGrade, setCurrentGrade] = useState<string>(grades[0] ?? "All");

  // Re-sync when user data loads (e.g. after /auth/me resolves)
  useEffect(() => {
    if (subjects.length > 0 && !currentSubject) {
      setCurrentSubject(subjects[0]);
    }
  }, [subjects.join(",")]);

  useEffect(() => {
    if (!currentGrade || currentGrade === "All") {
      setCurrentGrade(grades.length > 0 ? grades[0] : "All");
    }
  }, [grades.join(",")]);

  return (
    <TeacherContext.Provider value={{
      currentSubject, currentGrade,
      setCurrentSubject, setCurrentGrade,
      subjects, grades,
    }}>
      {children}
    </TeacherContext.Provider>
  );
}

export function useTeacher(): TeacherContextType {
  const ctx = useContext(TeacherContext);
  if (!ctx) throw new Error("useTeacher must be used within TeacherProvider");
  return ctx;
}
