import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from '../../componentsStatic/App';

// We mock Contexts so we can set up exactly the state before hitting Submit
vi.mock('../../componentsStatic/SpanEvalProvider', () => ({
  useSpanEvalContext: () => ({
    origText: 'Original text',
    translatedText: 'Translated text',
    errorSpans: [
      {
        original_text: 'bad word',
        start_index_translation: 0,
        end_index_translation: 8,
        error_type: 'Grammar',
        error_severity: 'Major',
      }
    ],
    highlightedError: [
      {
        original_text: 'bad word',
        start_index_translation: 0,
        end_index_translation: 8,
        error_type: 'Grammar',
        error_severity: 'Major',
      }
    ],
    originalHighlightedError: [],
    setOrigText: vi.fn(),
    setTranslatedText: vi.fn(),
    setErrorSpans: vi.fn(),
    setDiffContent: vi.fn(),
    setSpanSeverity: vi.fn(),
  }),
}));

vi.mock('../../context/TextAnnotationContext', () => ({
  useTextAnnotation: () => ({
    modifiedText: 'Fixed text',
    overallScore: 80,
    agreedSpans: [],
    setModifiedText: vi.fn(),
    setAddedErrorSpans: vi.fn(),
    setOverallScore: vi.fn(),
  }),
}));

// We'll override the return value of useAnnotationApp to simulate different Mode tests
import { useAnnotationApp } from '../../context/AnnotationAppContext';
vi.mock('../../context/AnnotationAppContext', () => ({
  useAnnotationApp: vi.fn(),
}));

describe('App - Submit Annotation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      })
    ) as any;
  });

  const setupMockForMode = (mode: string) => {
    (useAnnotationApp as any).mockReturnValue({
      username: 'test_user',
      annotator: 'original_annotator',
      sentenceID: '1234567890abcdef',
      currentDatabase: 'cantonese_dataset',
      currentMode: mode,
      sentenceData: [{ id: '1234567890abcdef', sentence: 'test' }],
      setSentenceData: vi.fn(),
      setForceScroll: vi.fn(),
      setSentenceID: vi.fn(),
      setAnnotator: vi.fn(),
      setTotalPages: vi.fn(),
      setDataset: vi.fn(),
    });
  };

  it('submits correctly in Annotation Mode', async () => {
    setupMockForMode('Annotation Mode');
    
    // We mock child components to avoid deep rendering issues, 
    // or we can let them render if they tolerate the mocked contexts.
    // Let's just render the Submit button part of App.
    // However, App is a complex component containing everything.
    // Let's shallow render or just look for the Submit button.
    render(<App />);

    const submitBtn = screen.getByText('Submit Annotation');
    
    await act(async () => {
      submitBtn.click();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    // Check the payload shape and metrics
    const fetchCall = (global.fetch as any).mock.calls[0];
    const url = fetchCall[0];
    const options = fetchCall[1];
    
    expect(url).toContain('/api/submit_annotation');
    
    const body = JSON.parse(options.body);
    
    expect(body.dataset).toBe('cantonese_dataset');
    expect(body.id).toBe('1234567890abcdef');
    
    // Metrics verification
    expect(body.test_user_annotations.overall_translation_score).toBe(80);
    expect(body.test_user_annotations.corrected_sentence).toBe('Fixed text');
    
    // Spans verification
    expect(body.test_user_annotations.annotatedSpans).toHaveLength(1);
    expect(body.test_user_annotations.annotatedSpans[0]).toMatchObject({
      error_text_segment: 'bad word',
      start_index: 0,
      end_index: 8,
      error_type: 'Grammar',
      error_severity: 'Major',
    });
  });
});
