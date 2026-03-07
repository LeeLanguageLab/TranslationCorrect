import React, { createContext, useContext, useState } from "react";
import { Span } from "../util/qaComparisonUtils";

// Type Definitions
export type DatasetType = {
  mandarin_dataset: any[];
  cantonese_dataset: any[];
  shanghainese_dataset: any[];
  cantonese_pivot_dataset: any[];
};

export type SentenceDataItem = {
  _id: string;
  id: number;
  src: string;
  mt: string;
  ref: string;
  annotations: Record<string, any>;
};

type AnnotationAppContextType = {
  // User & Session
  username: string | null;
  setUsername: React.Dispatch<React.SetStateAction<string | null>>;
  annotator: string | null;
  setAnnotator: React.Dispatch<React.SetStateAction<string | null>>;

  // Dataset & Navigation
  currentDatabase: string | null;
  setCurrentDatabase: React.Dispatch<React.SetStateAction<string | null>>;
  dataset: DatasetType | null;
  setDataset: React.Dispatch<React.SetStateAction<DatasetType | null>>;
  sentenceData: SentenceDataItem[];
  setSentenceData: React.Dispatch<React.SetStateAction<SentenceDataItem[]>>;
  sentenceID: string | null;
  setSentenceID: React.Dispatch<React.SetStateAction<string | null>>;

  // Mode & Language
  currentMode: "Annotation Mode" | "QA Mode" | "QA Comparison";
  setCurrentMode: React.Dispatch<
    React.SetStateAction<"Annotation Mode" | "QA Mode" | "QA Comparison">
  >;
  activeLanguage: string;
  setActiveLanguage: React.Dispatch<React.SetStateAction<string>>;

  // UI State
  forceScroll: boolean;
  setForceScroll: React.Dispatch<React.SetStateAction<boolean>>;
};

const AnnotationAppContext = createContext<AnnotationAppContextType | undefined>(
  undefined
);

export const AnnotationAppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [username, setUsername] = useState<string | null>("");
  const [annotator, setAnnotator] = useState<string | null>("");
  const [sentenceID, setSentenceID] = useState<string | null>("undefined_id");
  const [currentDatabase, setCurrentDatabase] = useState<string | null>("");
  const [activeLanguage, setActiveLanguage] = useState("Mandarin");
  const [currentMode, setCurrentMode] = useState<
    "Annotation Mode" | "QA Mode" | "QA Comparison"
  >("Annotation Mode");
  const [forceScroll, setForceScroll] = useState(false);
  const [dataset, setDataset] = useState<DatasetType | null>(null);
  const [sentenceData, setSentenceData] = useState<SentenceDataItem[]>([]);

  const value: AnnotationAppContextType = {
    username,
    setUsername,
    annotator,
    setAnnotator,
    sentenceID,
    setSentenceID,
    currentDatabase,
    setCurrentDatabase,
    activeLanguage,
    setActiveLanguage,
    currentMode,
    setCurrentMode,
    forceScroll,
    setForceScroll,
    dataset,
    setDataset,
    sentenceData,
    setSentenceData,
  };

  return (
    <AnnotationAppContext.Provider value={value}>
      {children}
    </AnnotationAppContext.Provider>
  );
};

export const useAnnotationApp = () => {
  const context = useContext(AnnotationAppContext);
  if (!context) {
    throw new Error(
      "useAnnotationApp must be used within an AnnotationAppProvider"
    );
  }
  return context;
};
