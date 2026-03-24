import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SpanEvalProvider, useSpanEvalContext } from '../../componentsStatic/SpanEvalProvider';
import { TextAnnotationProvider } from '../../context/TextAnnotationContext';

const TestComponent = () => {
  const { 
    errorSpans, 
    addNewErrorSpan, 
    updateSpanErrorType, 
    updateSpanSeverity, 
    deleteErrorSpan 
  } = useSpanEvalContext();

  return (
    <div>
      <div data-testid="span-count">{errorSpans?.length || 0}</div>
      <button 
        data-testid="add-span"
        onClick={() => addNewErrorSpan('bad text', 0, 8, 'Grammar', 'Minor')}
      >
        Add Span
      </button>
      <button 
        data-testid="update-type"
        onClick={() => updateSpanErrorType(0, 'Spelling')}
      >
        Update Type
      </button>
      <button 
        data-testid="update-severity"
        onClick={() => updateSpanSeverity(0, 'Major')}
      >
        Update Severity
      </button>
      <button 
        data-testid="delete-span"
        onClick={() => deleteErrorSpan(0)}
      >
        Delete Span
      </button>
      
      {/* Display spans as JSON to assert values */}
      <div data-testid="spans-data">{JSON.stringify(errorSpans)}</div>
    </div>
  );
};

describe('SpanEvalProvider', () => {
  const renderProvider = () => {
    render(
      <TextAnnotationProvider>
        <SpanEvalProvider>
          <TestComponent />
        </SpanEvalProvider>
      </TextAnnotationProvider>
    );
  };

  it('adds a new error span correctly', () => {
    renderProvider();
    const addButton = screen.getByTestId('add-span');
    
    act(() => {
      addButton.click();
    });

    expect(screen.getByTestId('span-count')).toHaveTextContent('1');
    const spansData = JSON.parse(screen.getByTestId('spans-data').textContent || '[]');
    expect(spansData[0]).toMatchObject({
      original_text: 'bad text',
      start_index_translation: 0,
      end_index_translation: 8,
      error_type: 'Grammar',
      error_severity: 'Minor'
    });
  });

  it('updates span error type correctly', () => {
    renderProvider();
    
    act(() => {
      screen.getByTestId('add-span').click();
    });
    
    act(() => {
      screen.getByTestId('update-type').click();
    });

    const spansData = JSON.parse(screen.getByTestId('spans-data').textContent || '[]');
    expect(spansData[0].error_type).toBe('Spelling');
    // Severity should remain unchanged
    expect(spansData[0].error_severity).toBe('Minor');
  });

  it('updates span severity correctly', () => {
    renderProvider();
    
    act(() => {
      screen.getByTestId('add-span').click();
    });
    
    act(() => {
      screen.getByTestId('update-severity').click();
    });

    const spansData = JSON.parse(screen.getByTestId('spans-data').textContent || '[]');
    expect(spansData[0].error_severity).toBe('Major');
    // Type should remain unchanged
    expect(spansData[0].error_type).toBe('Grammar');
  });

  it('deletes span correctly', () => {
    renderProvider();
    
    act(() => {
      screen.getByTestId('add-span').click();
    });
    
    expect(screen.getByTestId('span-count')).toHaveTextContent('1');
    
    act(() => {
      screen.getByTestId('delete-span').click();
    });

    expect(screen.getByTestId('span-count')).toHaveTextContent('0');
  });
});
