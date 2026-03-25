import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import QAComparisonContainer from '../../../componentsStatic/qa/QAComparisonContainer';

// Mock contexts
vi.mock('../../../componentsStatic/SpanEvalProvider', () => ({
  useSpanEvalContext: vi.fn(),
}));

vi.mock('../../../context/AnnotationAppContext', () => ({
  useAnnotationApp: vi.fn(),
}));

vi.mock('../../../context/TextAnnotationContext', () => ({
  useTextAnnotation: vi.fn(),
}));

import { useAnnotationApp } from '../../../context/AnnotationAppContext';
import { useTextAnnotation } from '../../../context/TextAnnotationContext';
import { useSpanEvalContext } from '../../../componentsStatic/SpanEvalProvider';

describe('QAComparisonContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useSpanEvalContext as any).mockReturnValue({
      translatedText: 'Machine translation sentence here',
    });

    (useAnnotationApp as any).mockReturnValue({
      username: 'admin',
      activeLanguage: 'Mandarin',
      sentenceData: [
        {
          id: '1',
          mt: 'Machine translation sentence here',
          annotations: {
            'annotator1_annotations': {
              annotatedSpans: [
                { error_text_segment: 'translation', start_index: 8, end_index: 19, error_type: 'Grammar', error_severity: 'Minor' }
              ]
            },
            'admin_qa': {
              annotator: 'annotator1',
              annotatedSpans: [
                { error_text_segment: 'translation', start_index: 8, end_index: 19, error_type: 'Grammar', error_severity: 'Minor' },
                { error_text_segment: 'here', start_index: 20, end_index: 24, error_type: 'Spelling', error_severity: 'Major' }
              ]
            }
          }
        }
      ],
      annotator: 'annotator1',
      sentenceID: '1',
    });

    (useTextAnnotation as any).mockReturnValue({
      setAddedErrorSpans: vi.fn(),
      setModifiedText: vi.fn(),
      setAgreedSpans: vi.fn(),
    });
  });

  it('renders and compares spans correctly', () => {
    render(<QAComparisonContainer />);

    // In our mock, there is one shared span, one QA span, and no unique Annotator spans.
    // Let's verify text in the UI (like QA User Name, shared spans count, etc based on component's rendering)

    // Verify UI has columns/sections for Annotation, Shared, and QA
    expect(screen.getByText('Annotator Spans (annotator1)')).toBeInTheDocument();
    expect(screen.getByText('QA Spans (admin)')).toBeInTheDocument();
    expect(screen.getByText('Agreed Upon Spans')).toBeInTheDocument();
    
    // Select the correct User
    expect(screen.getByText('QA user')).toBeInTheDocument();
  });

  it('includes database QA users alongside fixed QA users in dropdown', () => {
    (useAnnotationApp as any).mockReturnValue({
      username: 'admin',
      activeLanguage: 'Cantonese',
      sentenceData: [
        {
          _id: '1',
          mt: 'Machine translation sentence here',
          annotations: {
            'annotator1_annotations': {
              corrected_sentence: 'Machine translation sentence here',
              annotatedSpans: [],
            },
            'newQaUser_qa': {
              annotator: 'annotator1',
              corrected_sentence: 'Machine translation sentence here',
              annotatedSpans: [],
            },
          },
        },
      ],
      annotator: 'annotator1',
      sentenceID: '1',
    });

    render(<QAComparisonContainer />);

    expect(screen.getByRole('option', { name: 'Phantom65536' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'newQaUser' })).toBeInTheDocument();
  });
});
