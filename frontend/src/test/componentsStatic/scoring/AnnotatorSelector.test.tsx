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
            Hannah_annotations: { annotatedSpans: [] },
            RuntongLiang_annotations: { annotatedSpans: [] },
            newMandarinAnnotator_annotations: { annotatedSpans: [] },
            qa_user_qa: { annotator: 'Hannah', annotatedSpans: [] },
          },
        },
        {
          _id: 'sentence-2',
          mt: 'other machine text',
          annotations: {
            offSentenceAnnotator_annotations: { annotatedSpans: [] },
          },
        },
      ],
    });
  });

  it('shows only annotators from the selected sentence', () => {
    render(<AnnotatorSelectorDropdown />);

    expect(screen.getByRole('option', { name: 'RuntongLiang' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Hannah' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'newMandarinAnnotator' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'offSentenceAnnotator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'qianshi2' })).not.toBeInTheDocument();
  });

  it('renders selector in Shanghainese mode', () => {
    mockUseAnnotationApp.mockReturnValue({
      username: 'qa_user',
      annotator: 'sh_user',
      setAnnotator: vi.fn(),
      sentenceID: 'sentence-sh',
      activeLanguage: 'Shanghainese',
      sentenceData: [
        {
          _id: 'sentence-sh',
          mt: 'machine text',
          annotations: {
            sh_user_annotations: { annotatedSpans: [] },
          },
        },
      ],
    });

    render(<AnnotatorSelectorDropdown />);

    expect(screen.getByRole('combobox', { name: '' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'sh_user' })).toBeInTheDocument();
  });
});
