import { describe, it, expect } from 'vitest';
import { getSpanDiffs, adjustMovingSpanIndices, getSharedSpansDisplay } from '../../util/qaComparisonUtils';
import { Span } from '../../util/qaComparisonUtils';

describe('qaComparisonUtils', () => {
  describe('getSpanDiffs', () => {
    it('correctly categorizes identical spans', () => {
      const annotatorSpans: Span[] = [
        { start_index: 0, end_index: 5, error_text_segment: 'hello', error_type: 'Mistranslation', error_severity: 'Major' }
      ];
      const qaSpans: Span[] = [
        { start_index: 0, end_index: 5, error_text_segment: 'hello', error_type: 'Mistranslation', error_severity: 'Major' }
      ];

      const [annotatorDiff, qaDiff, shared] = getSpanDiffs(annotatorSpans, qaSpans);

      expect(annotatorDiff).toEqual([]);
      expect(qaDiff).toEqual([]);
      expect(shared).toHaveLength(1);
      expect(shared[0]).toMatchObject(annotatorSpans[0]);
    });

    it('correctly identifies distinct spans', () => {
      const annotatorSpans: Span[] = [
        { start_index: 0, end_index: 5, error_text_segment: 'hello', error_type: 'Mistranslation', error_severity: 'Major' }
      ];
      const qaSpans: Span[] = [
        { start_index: 6, end_index: 10, error_text_segment: 'world', error_type: 'Grammar', error_severity: 'Minor' }
      ];

      const [annotatorDiff, qaDiff, shared] = getSpanDiffs(annotatorSpans, qaSpans);

      expect(shared).toEqual([]);
      expect(annotatorDiff).toHaveLength(1);
      expect(annotatorDiff[0]).toMatchObject(annotatorSpans[0]);
      expect(qaDiff).toHaveLength(1);
      expect(qaDiff[0]).toMatchObject(qaSpans[0]);
    });

    it('correctly categorizes overlapping but structurally different spans as distinct', () => {
      const annotatorSpans: Span[] = [
        { start_index: 0, end_index: 5, error_text_segment: 'hello', error_type: 'Mistranslation', error_severity: 'Major' }
      ];
      // Same index, diff type
      const qaSpans: Span[] = [
        { start_index: 0, end_index: 5, error_text_segment: 'hello', error_type: 'Untranslated', error_severity: 'Major' }
      ];

      const [annotatorDiff, qaDiff, shared] = getSpanDiffs(annotatorSpans, qaSpans);

      expect(shared).toEqual([]);
      expect(annotatorDiff).toHaveLength(1);
      expect(qaDiff).toHaveLength(1);
    });
  });

  describe('adjustMovingSpanIndices', () => {
    it('adjusts span indices forward when shared spans contain omissions', () => {
      const sourceSpans: Span[] = [];
      const sharedSpans: Span[] = [
        // Omission at index 2 of length 4
        { start_index: 2, end_index: 6, error_text_segment: 'word', error_type: 'Omission', error_severity: 'Major' }
      ];
      
      const spanToMove: Span = { start_index: 5, end_index: 10, error_text_segment: 'rest', error_type: 'Grammar', error_severity: 'Minor' };
      
      adjustMovingSpanIndices(sourceSpans, sharedSpans, spanToMove);
      
      // Because there's a 4-length omission before this span, it should shift entirely right by 4
      expect(spanToMove.start_index).toBe(9); // 5 + 4
      expect(spanToMove.end_index).toBe(14); // 10 + 4
    });

    it('adjusts span indices backward when source spans contain omissions', () => {
      const sourceSpans: Span[] = [
        // Omission at index 2 of length 4
        { start_index: 2, end_index: 6, error_text_segment: 'word', error_type: 'Omission', error_severity: 'Major' } 
      ];
      const sharedSpans: Span[] = [];
      
      const spanToMove: Span = { start_index: 9, end_index: 14, error_text_segment: 'rest', error_type: 'Grammar', error_severity: 'Minor' };
      
      // We expect the original length was 4. The indices should go backward by 4.
      adjustMovingSpanIndices(sourceSpans, sharedSpans, spanToMove);

      expect(spanToMove.start_index).toBe(5); // 9 - 4
      expect(spanToMove.end_index).toBe(10); // 14 - 4
    });
  });

  describe('getSharedSpansDisplay', () => {
    it('inserts when the MT slice differs from the span text', () => {
      const mt = 'abcdef';
      const sharedSpans: Span[] = [
        { start_index: 5, end_index: 6, error_text_segment: 'Q', error_type: 'Grammar', error_severity: 'Minor' },
        { start_index: 1, end_index: 1, error_text_segment: 'X', error_type: 'Omission', error_severity: 'Major' },
        { start_index: 3, end_index: 5, error_text_segment: 'YYZ', error_type: 'Grammar', error_severity: 'Major' },
      ];

      const { sentence, displaySpans } = getSharedSpansDisplay(mt, sharedSpans);

      expect(sentence).toBe('aXbcYYZdeQf');
      expect(displaySpans).toHaveLength(3);
      expect(displaySpans).toEqual([
        { start_index: 1, end_index: 2, error_text_segment: 'X', error_type: 'Omission', error_severity: 'Major' },
        { start_index: 4, end_index: 7, error_text_segment: 'YYZ', error_type: 'Grammar', error_severity: 'Major' },
        { start_index: 9, end_index: 10, error_text_segment: 'Q', error_type: 'Grammar', error_severity: 'Minor' },
      ]);
    });

    it('inserts when the replacement differs from MT even if shorter', () => {
      const mt = 'abcdef';
      const sharedSpans: Span[] = [
        { start_index: 2, end_index: 5, error_text_segment: 'Z', error_type: 'Mistranslation', error_severity: 'Minor' },
      ];

      const { sentence, displaySpans } = getSharedSpansDisplay(mt, sharedSpans);

      expect(sentence).toBe('abZcdef');
      expect(displaySpans).toEqual([
        { start_index: 2, end_index: 3, error_text_segment: 'Z', error_type: 'Mistranslation', error_severity: 'Minor' },
      ]);
    });

    it('returns the MT sentence when no shared spans exist', () => {
      const mt = 'abcdef';
      const { sentence, displaySpans } = getSharedSpansDisplay(mt, []);

      expect(sentence).toBe('abcdef');
      expect(displaySpans).toEqual([]);
    });
  });
});
