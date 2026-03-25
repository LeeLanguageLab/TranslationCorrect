import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DatabaseSentenceView } from '../../../componentsStatic/scoring/DatabaseSentenceView';

const mockSetModifiedText = vi.fn();
const mockSetAddedErrorSpans = vi.fn();
const mockSetOrigText = vi.fn();
const mockSetTranslatedText = vi.fn();
const mockSetDiffContent = vi.fn();
const mockSetErrorSpans = vi.fn();

const mockUseAnnotationApp = vi.fn();

vi.mock('../../../context/AnnotationAppContext', () => ({
  useAnnotationApp: () => mockUseAnnotationApp(),
}));

vi.mock('../../../context/TextAnnotationContext', () => ({
  useTextAnnotation: () => ({
    setModifiedText: mockSetModifiedText,
    setAddedErrorSpans: mockSetAddedErrorSpans,
  }),
}));

vi.mock('../../../componentsStatic/SpanEvalProvider', () => ({
  useSpanEvalContext: () => ({
    setOrigText: mockSetOrigText,
    setTranslatedText: mockSetTranslatedText,
    setDiffContent: mockSetDiffContent,
    setErrorSpans: mockSetErrorSpans,
  }),
}));

describe('DatabaseSentenceView QA revisit', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAnnotationApp.mockReturnValue({
      username: 'qa_user',
      annotator: 'loka9',
      setAnnotator: vi.fn(),
      sentenceID: 'sentence-1',
      setSentenceID: vi.fn(),
      setCurrentDatabase: vi.fn(),
      sentenceData: [
        {
          _id: 'sentence-1',
          id: 1,
          src: 'source',
          mt: 'machine text',
          ref: 'reference',
          annotations: {
            loka9_annotations: {
              corrected_sentence: 'annotator corrected',
              annotatedSpans: [
                {
                  error_text_segment: 'annotator span',
                  start_index: 0,
                  end_index: 4,
                  error_type: 'Grammar',
                  error_severity: 'Minor',
                },
              ],
            },
            qa_user_qa: {
              annotator: 'loka9',
              corrected_sentence: 'qa corrected',
              annotatedSpans: [
                {
                  error_text_segment: 'qa span',
                  start_index: 2,
                  end_index: 7,
                  error_type: 'Spelling',
                  error_severity: 'Major',
                },
              ],
            },
          },
        },
      ],
      setSentenceData: vi.fn(),
      dataset: { mandarin_dataset: [], cantonese_dataset: [], shanghainese_dataset: [] },
      setDataset: vi.fn(),
      activeLanguage: 'Cantonese',
      setActiveLanguage: vi.fn(),
      forceScroll: false,
      setForceScroll: vi.fn(),
      currentMode: 'QA Mode',
      setCurrentMode: vi.fn(),
    });
  });

  it('loads previously submitted QA spans when revisiting sentence in QA mode', () => {
    render(<DatabaseSentenceView />);

    fireEvent.click(screen.getByText('source'));

    expect(mockSetDiffContent).toHaveBeenCalledWith('qa corrected');

    const lastAddedSpansCall = mockSetAddedErrorSpans.mock.calls[mockSetAddedErrorSpans.mock.calls.length - 1][0];
    expect(lastAddedSpansCall).toHaveLength(1);
    expect(lastAddedSpansCall[0]).toMatchObject({
      original_text: 'qa span',
      start_index_translation: 2,
      end_index_translation: 7,
      error_type: 'Spelling',
      error_severity: 'Major',
    });
  });
});
