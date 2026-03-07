import React, { createContext, useContext, useState } from "react";
import { HighlightedError } from "../types";
import { Span } from "../util/qaComparisonUtils";

type TextAnnotationContextType = {
  modifiedText: string;
  setModifiedText: React.Dispatch<React.SetStateAction<string>>;

  addedErrorSpans: HighlightedError[];
  setAddedErrorSpans: React.Dispatch<React.SetStateAction<HighlightedError[]>>;

  overallScore: number;
  setOverallScore: React.Dispatch<React.SetStateAction<number>>;

  agreedSpans: Span[];
  setAgreedSpans: React.Dispatch<React.SetStateAction<Span[]>>;
};

const TextAnnotationContext = createContext<
  TextAnnotationContextType | undefined
>(undefined);

export const TextAnnotationProvider: React.FC<{
  children: React.ReactNode;
  initialMachineTranslation?: string;
}> = ({ children, initialMachineTranslation = "" }) => {
  const [modifiedText, setModifiedText] = useState<string>(
    initialMachineTranslation
  );
  const [addedErrorSpans, setAddedErrorSpans] = useState<HighlightedError[]>(
    []
  );
  const [overallScore, setOverallScore] = useState<number>(50);
  const [agreedSpans, setAgreedSpans] = useState<Span[]>([]);

  const value: TextAnnotationContextType = {
    modifiedText,
    setModifiedText,
    addedErrorSpans,
    setAddedErrorSpans,
    overallScore,
    setOverallScore,
    agreedSpans,
    setAgreedSpans,
  };

  return (
    <TextAnnotationContext.Provider value={value}>
      {children}
    </TextAnnotationContext.Provider>
  );
};

export const useTextAnnotation = () => {
  const context = useContext(TextAnnotationContext);
  if (!context) {
    throw new Error(
      "useTextAnnotation must be used within a TextAnnotationProvider"
    );
  }
  return context;
};
