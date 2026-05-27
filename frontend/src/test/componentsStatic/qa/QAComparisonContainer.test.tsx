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
          _id: '1',
          mt: 'Machine translation sentence here',
          annotations: {
            'personA_qa': {
              annotatedSpans: [
                { error_text_segment: 'translation', start_index: 8, end_index: 19, error_type: 'Grammar', error_severity: 'Minor' }
              ]
            },
            'personB_qa': {
              annotatedSpans: [
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

  it('renders Mandarin QA comparison with Person A/B selectors', () => {
    render(<QAComparisonContainer />);

    // Verify UI has columns/sections for Person A, Shared, and Person B
    expect(screen.getByText('Person A Spans (personA)')).toBeInTheDocument();
    expect(screen.getByText('Person B Spans (personB)')).toBeInTheDocument();
    expect(screen.getByText('Agreed Upon Spans')).toBeInTheDocument();
    
    // Selectors should be Person A/B and no single QA user selector
    expect(screen.getByText('QA Span Person A')).toBeInTheDocument();
    expect(screen.getByText('QA Span Person B')).toBeInTheDocument();
    expect(screen.queryByText('QA user')).not.toBeInTheDocument();
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
