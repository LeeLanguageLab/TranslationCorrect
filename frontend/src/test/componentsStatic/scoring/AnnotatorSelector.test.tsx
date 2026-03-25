import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnnotatorSelectorDropdown } from '../../../componentsStatic/scoring/AnnotatorSelector';

const mockUseAnnotationApp = vi.fn();

vi.mock('../../../context/AnnotationAppContext', () => ({
  useAnnotationApp: () => mockUseAnnotationApp(),
}));

vi.mock('../../../context/TextAnnotationContext', () => ({
  useTextAnnotation: () => ({
    setModifiedText: vi.fn(),
    setAddedErrorSpans: vi.fn(),
  }),
}));

vi.mock('../../../componentsStatic/SpanEvalProvider', () => ({
  useSpanEvalContext: () => ({
    setDiffContent: vi.fn(),
    setErrorSpans: vi.fn(),
  }),
}));

describe('AnnotatorSelectorDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAnnotationApp.mockReturnValue({
      username: 'qa_user',
      annotator: 'Hannah',
      setAnnotator: vi.fn(),
      sentenceID: 'sentence-1',
      activeLanguage: 'Mandarin',
      sentenceData: [
        {
          _id: 'sentence-1',
          mt: 'machine text',
          annotations: {
            RuntongLiang_annotations: { annotatedSpans: [] },
            newMandarinAnnotator_annotations: { annotatedSpans: [] },
            qa_user_qa: { annotator: 'Hannah', annotatedSpans: [] },
          },
        },
      ],
    });
  });

  it('shows fixed options plus sentence annotators from database', () => {
    render(<AnnotatorSelectorDropdown />);

    expect(screen.getByRole('option', { name: 'RuntongLiang' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Hannah' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'qianshi2' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'newMandarinAnnotator' })).toBeInTheDocument();
  });
});
