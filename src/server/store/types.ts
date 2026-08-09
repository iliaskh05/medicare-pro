export type StudyModality = "XR" | "CT" | "MR" | "US" | "MG";

export type ImagingStudy = {
  id: string;
  patientId: string;
  patientName: string;
  modality: StudyModality;
  examLabel: string;
  bodyPart: string;
  acquiredAt: string;
  seriesCount: number;
  thumbnailUrl?: string;
  status: "ready" | "analyzing" | "reported";
};

export type ImageFinding = {
  code: string;
  label: string;
  confidence: number;
  laterality?: "G" | "D" | "bilatéral";
  region?: string;
  severity: "info" | "moderate" | "severe";
};

export type ImageAnalysisResult = {
  studyId: string;
  analyzedAt: string;
  qualityScore: number;
  metrics: {
    meanIntensity: number;
    contrast: number;
    edgeDensity: number;
    noiseEstimate: number;
    sharpness: number;
  };
  findings: ImageFinding[];
  model: string;
  latencyMs: number;
};

export type StructuredReport = {
  id: string;
  studyId: string;
  patientId: string;
  examLabel: string;
  language: "fr";
  sections: {
    indication: string;
    technique: string;
    resultats: string;
    conclusion: string;
  };
  codes: { system: string; code: string; display: string }[];
  generatedAt: string;
  model: string;
  draft: boolean;
};

export type ChatUser = {
  id: string;
  name: string;
  role: "radiologue" | "technicien" | "admin" | "secretaire";
};

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  studyId?: string;
};

export type ChatRoom = {
  id: string;
  name: string;
  members: ChatUser[];
  createdAt: string;
};

export type WhatsAppInbound = {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: string;
  patientHint?: string;
  raw: unknown;
};

export type FraudFeatureVector = {
  invoiceId: string;
  patientId: string;
  patientName: string;
  examType: string;
  amount: number;
  mutuelleShare: number;
  daysSinceLastSameExam: number;
  examsLast30Days: number;
  isGenderIncoherent: number;
  isDuplicate: number;
  mutuelleExpired: number;
  baremeRatio: number;
  hourOfDay: number;
  weekday: number;
  label?: 0 | 1;
};

export type FraudScoreResult = {
  invoiceId: string;
  patientName: string;
  amount: number;
  score: number;
  niveau: "critique" | "eleve" | "moyen" | "faible";
  raison: string[];
  unsupervised: {
    clusterId: number;
    anomalyDistance: number;
    isWeakSignal: boolean;
  };
  supervised: {
    probability: number;
    modelVersion: string;
  };
  decision: "pending" | "validated" | "blocked";
  scoredAt: string;
};

export type RealtimeEvent =
  | { type: "chat.message"; payload: ChatMessage }
  | { type: "fraud.alert"; payload: FraudScoreResult }
  | { type: "imaging.analysis"; payload: ImageAnalysisResult }
  | { type: "report.ready"; payload: StructuredReport }
  | { type: "whatsapp.inbound"; payload: WhatsAppInbound }
  | { type: "system.ping"; payload: { at: string } };
