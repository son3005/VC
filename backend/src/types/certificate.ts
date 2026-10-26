export type CertificateType = "degree" | "course" | "credit" | "other";
export type ArtifactType = "pdf" | "image" | "web";
export type CertificateStatus = "active" | "revoked" | "locked";

export interface DegreeDetails {
  degreeTitle: string;
  major: string;
  graduationYear: number;
  gpa: number;
  classification: string;
  studyMode?: string;
  thesisTitle?: string;
}

export interface CourseDetails {
  courseCode: string;
  courseName: string;
  credits: number;
  semester: string;
  grade: number | string;
  gradeScale: "10" | "4" | "letter";
  grade4?: number;
  durationHours?: number;
  instructor?: string;
}

export interface CreditModule {
  code: string;
  name: string;
  credits: number;
  grade: number | string;
  grade4?: number;
}

export interface CreditDetails {
  programName: string;
  totalCredits: number;
  completedCredits: number;
  gpa?: number;
  gradeScale: "10" | "4" | "letter";
  modules?: CreditModule[];
}

export interface OtherDetails {
  title: string;
  description: string;
  organizer?: string;
  eventDate?: string;
  role?: string;
  result?: string;
  validUntil?: string;
}

export type CertificateDetails =
  | DegreeDetails
  | CourseDetails
  | CreditDetails
  | OtherDetails;
