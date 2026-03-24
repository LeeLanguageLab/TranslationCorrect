import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostEditContainer } from '../../../componentsStatic/postEdit/PostEditContainer';

// Mock the context modules
vi.mock('../../../componentsStatic/SpanEvalProvider', () => ({
  useSpanEvalContext: vi.fn(),
}));

vi.mock('../../../context/TextAnnotationContext', () => ({
  useTextAnnotation: vi.fn(),
}));

vi.mock('../../../context/AnnotationAppContext', () => ({
  useAnnotationApp: vi.fn(),
}));

import { useSpanEvalContext } from '../../../componentsStatic/SpanEvalProvider';
import { useTextAnnotation } from '../../../context/TextAnnotationContext';
import { useAnnotationApp } from '../../../context/AnnotationAppContext';

describe('PostEditContainer', () => {
  const mockSpanEval = {
    translatedText: 'This is a test translated text.',
    setTranslatedText: vi.fn(),
    errorSpans: [],
    setErrorSpans: vi.fn(),
    addNewErrorSpan: vi.fn(),
    updateSpanErrorType: vi.fn(),
    updateSpanSeverity: vi.fn(),
    deleteErrorSpan: vi.fn(),
    clearErrorSpans: vi.fn(),
    spanSeverity: 'Minor',
    selectedSpanIdx: undefined,
    setSelectedSpanIdx: vi.fn()
  };

  const mockTextAnnotation = {
    modifiedText: 'This is a test translated text.',
    setModifiedText: vi.fn()
  };

  const mockAnnotationApp = {
    currentMode: 'Annotation Mode'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSpanEvalContext as any).mockReturnValue(mockSpanEval);
    (useTextAnnotation as any).mockReturnValue(mockTextAnnotation);
    (useAnnotationApp as any).mockReturnValue(mockAnnotationApp);
  });

  it('renders correctly', () => {
    render(<PostEditContainer initialMachineTranslation="Test" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
