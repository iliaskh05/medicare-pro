import { patients, factures, facturesSuspectes } from "@/data/mock";
import type {
  ChatMessage,
  ChatRoom,
  ChatUser,
  FraudScoreResult,
  ImageAnalysisResult,
  ImagingStudy,
  StructuredReport,
  WhatsAppInbound,
} from "./types";

const doctors: ChatUser[] = [
  { id: "doc-skalli", name: "Dr. Naima Skalli", role: "radiologue" },
  { id: "doc-kettani", name: "Dr. Anas Kettani", role: "radiologue" },
  { id: "doc-amrani", name: "Dr. Leila Amrani", role: "radiologue" },
  { id: "tech-hassan", name: "Hassan El Fassi", role: "technicien" },
  { id: "admin-souad", name: "Souad Bahri", role: "admin" },
];

function seedStudies(): ImagingStudy[] {
  return [
    {
      id: "STD-240801-01",
      patientId: "PAT-1042",
      patientName: "Karim Bennani",
      modality: "MR",
      examLabel: "IRM Cérébrale",
      bodyPart: "crâne",
      acquiredAt: "2026-08-04T09:12:00+01:00",
      seriesCount: 6,
      status: "ready",
    },
    {
      id: "STD-240801-02",
      patientId: "PAT-1043",
      patientName: "Fatima Idrissi",
      modality: "CT",
      examLabel: "Scanner Thoracique",
      bodyPart: "thorax",
      acquiredAt: "2026-08-04T09:40:00+01:00",
      seriesCount: 3,
      status: "ready",
    },
    {
      id: "STD-240801-03",
      patientId: "PAT-1044",
      patientName: "Youssef El Amrani",
      modality: "XR",
      examLabel: "Radio Thorax",
      bodyPart: "thorax",
      acquiredAt: "2026-08-04T10:05:00+01:00",
      seriesCount: 2,
      status: "ready",
    },
    {
      id: "STD-240801-04",
      patientId: "PAT-1047",
      patientName: "Nadia Berrada",
      modality: "MG",
      examLabel: "Mammographie",
      bodyPart: "sein",
      acquiredAt: "2026-08-04T10:50:00+01:00",
      seriesCount: 4,
      status: "ready",
    },
    {
      id: "STD-240801-05",
      patientId: "PAT-1046",
      patientName: "Abdelkrim Ouazzani",
      modality: "MR",
      examLabel: "IRM Lombaire",
      bodyPart: "rachis lombaire",
      acquiredAt: "2026-08-04T11:20:00+01:00",
      seriesCount: 5,
      status: "ready",
    },
  ];
}

function seedRooms(): ChatRoom[] {
  return [
    {
      id: "room-staff",
      name: "Équipe radiologie",
      members: doctors,
      createdAt: "2026-07-01T08:00:00+01:00",
    },
    {
      id: "room-urgences",
      name: "Urgences IRM / Scanner",
      members: doctors.filter((d) => d.role === "radiologue" || d.role === "technicien"),
      createdAt: "2026-07-15T08:00:00+01:00",
    },
  ];
}

type StoreShape = {
  studies: ImagingStudy[];
  analyses: Map<string, ImageAnalysisResult>;
  reports: Map<string, StructuredReport>;
  rooms: ChatRoom[];
  messages: ChatMessage[];
  whatsapp: WhatsAppInbound[];
  fraudScores: Map<string, FraudScoreResult>;
  fraudDecisions: Map<string, "validated" | "blocked">;
};

const g = globalThis as typeof globalThis & { __radiocrmStore?: StoreShape };

function createStore(): StoreShape {
  return {
    studies: seedStudies(),
    analyses: new Map(),
    reports: new Map(),
    rooms: seedRooms(),
    messages: [
      {
        id: "msg-1",
        roomId: "room-staff",
        senderId: "doc-skalli",
        senderName: "Dr. Naima Skalli",
        body: "Bonjour — IRM cérébrale de M. Bennani prête pour relecture.",
        createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        studyId: "STD-240801-01",
      },
      {
        id: "msg-2",
        roomId: "room-staff",
        senderId: "tech-hassan",
        senderName: "Hassan El Fassi",
        body: "Série T2 FLAIR rechargée, artefacts corrigés.",
        createdAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
        studyId: "STD-240801-01",
      },
    ],
    whatsapp: [],
    fraudScores: new Map(),
    fraudDecisions: new Map(),
  };
}

export const store = g.__radiocrmStore ?? (g.__radiocrmStore = createStore());

export const domainRefs = { patients, factures, facturesSuspectes, doctors };
