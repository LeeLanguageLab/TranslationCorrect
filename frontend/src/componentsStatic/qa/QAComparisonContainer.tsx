import React, { useState, useEffect, useCallback } from "react";
import { copySpanArr, adjustMovingSpanIndices, getSharedSpansDisplay, getSpanDiffs, Span } from "../../util/qaComparisonUtils";
import { HighlightedError, colorMappings } from "../../types";
import "../../index.css";
import { useAnnotationApp } from "../../context/AnnotationAppContext";
import { useTextAnnotation } from "../../context/TextAnnotationContext";
import { useSpanEvalContext } from "../SpanEvalProvider";

// Custom HighlightedText component for QA comparison with span selection and tooltip
interface QAHighlightedTextProps {
  text: string;
  highlights: HighlightedError[];
  highlightKey: string;
  onSpanClick: (span: HighlightedError, spanIndex: number, event: React.MouseEvent) => void;
  selectedSpanIndex: number | null;
  onSpanHover?: (span: HighlightedError, spanIndex: number, event: React.MouseEvent) => void;
  onSpanMove?: (event: React.MouseEvent) => void;
  onSpanLeave?: () => void;
}

const QAHighlightedText: React.FC<QAHighlightedTextProps> = ({
  text,
  highlights,
  highlightKey,
  onSpanClick,
  selectedSpanIndex,
  onSpanHover,
  onSpanMove,
  onSpanLeave,
}) => {
  // Build ranges from highlights
  const ranges = highlights.map((highlight, idx) => {
    const startKey = highlightKey.includes("end")
      ? (highlightKey.replace("end", "start") as keyof HighlightedError)
      : (highlightKey as keyof HighlightedError);
    return {
      start: highlight[startKey] as number,
      end: highlight[highlightKey] as number,
      error_type: highlight.error_type,
      highlight,
      index: idx,
    };
  });

  const getHighlightedText = () => {
    if (ranges.length === 0) return text;

    const elements: (string | React.ReactElement)[] = [];
    let lastIndex = 0;

    // Sort ranges by start position
    const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);

    sortedRanges.forEach((range) => {
      // Add text before the highlight
      if (range.start > lastIndex) {
        elements.push(text.substring(lastIndex, range.start));
      }

      // Add the highlighted span
      const highlightedText = text.substring(range.start, range.end);
      const isSelected = selectedSpanIndex === range.index;

      elements.push(
        <span
          key={`highlight-${range.start}-${range.end}`}
          className={`highlight qa-clickable-span ${isSelected ? "qa-span-selected" : ""}`}
          style={{
            backgroundColor: colorMappings[range.error_type],
            cursor: "pointer",
            position: "relative",
          }}
          onClick={(event) => onSpanClick(range.highlight, range.index, event)}
          onMouseEnter={(event) => onSpanHover?.(range.highlight, range.index, event)}
          onMouseMove={onSpanMove}
          onMouseLeave={onSpanLeave}
        >
          {highlightedText}
        </span>
      );

      lastIndex = range.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }

    return elements;
  };

  return (
    <div>
      {getHighlightedText()}
    </div>
  );
};

const QAComparisonContainer: React.FC = () => {
  const {
    sentenceData,
    sentenceID,
    annotator,
    username,
    activeLanguage,
  } = useAnnotationApp();

  const { setAgreedSpans: onAgreedSpansChange } = useTextAnnotation();
  const { translatedText: machineTranslation } = useSpanEvalContext();

  const [annotationSpans, setAnnotationSpans] = useState<Span[]>([]);
  const [qaSpans, setQASpans] = useState<Span[]>([]);
  const [sharedSpans, setSharedSpans] = useState<Span[]>([]);
  const [displaySharedSpans, setDisplaySharedSpans] = useState<Span[]>([]);
  const [hasQAForAnnotator, setHasQAForAnnotator] = useState<boolean>(false);
  const [qaUsers, setQaUsers] = useState<string[]>([]);
  const [selectedQaUser, setSelectedQaUser] = useState<string>(username);
  const [selectedPersonA, setSelectedPersonA] = useState<string>("");
  const [selectedPersonB, setSelectedPersonB] = useState<string>("");
  const [hasPersonA, setHasPersonA] = useState<boolean>(false);
  const [hasPersonB, setHasPersonB] = useState<boolean>(false);
  const [annotatorCorrectedSentence, setAnnotatorCorrectedSentence] = useState<string>(machineTranslation);
  const [qaCorrectedSentence, setQACorrectedSentence] = useState<string>(machineTranslation);
  const [sharedSpansSentence, setSharedSpansSentence] = useState<string>(machineTranslation);

  // Used when moving spans to sharedSpans
  const [originalAnnotationSpans, setOriginalAnnotationSpans] = useState<Span[]>([]);
  const [originalQaSpans, setOriginalQaSpans] = useState<Span[]>([]);

  // State for span selection and move functionality
  const [selectedSpan, setSelectedSpan] = useState<{
    span: Span;
    index: number;
    source: "annotator" | "qa";
  } | null>(null);
  const [moveButtonPosition, setMoveButtonPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // State for tooltip functionality
  const [hoveredHighlight, setHoveredHighlight] = useState<HighlightedError | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Load data when component mounts or when sentence/annotator changes
  const loadComparisonData = useCallback(() => {
    const isMandarinComparison = activeLanguage === "Mandarin";
    const currentSentence = sentenceData.find((item: any) => item._id === sentenceID);
    if (!currentSentence) {
      setAnnotationSpans([]);
      setQASpans([]);
      setSharedSpans([]);
      setDisplaySharedSpans([]);
      setHasQAForAnnotator(false);
      setQaUsers([]);
      setSelectedQaUser(username);
      setSelectedPersonA("");
      setSelectedPersonB("");
      setHasPersonA(false);
      setHasPersonB(false);
      setAnnotatorCorrectedSentence(machineTranslation);
      setQACorrectedSentence(machineTranslation);
      setSharedSpansSentence(machineTranslation);
      setSelectedSpan(null);
      setMoveButtonPosition(null);
      setHoveredHighlight(null);
      setTooltipPosition(null);
      return;
    }

    let nextQaUsers: string[] = [];
    if (isMandarinComparison) {
      nextQaUsers = Object.keys(currentSentence.annotations || {})
        .filter((key) => key.endsWith("_qa"))
        .map((key) => key.replace("_qa", ""));
    } else {
      // Define fixed QA user lists based on language
      let fixedQaUsers: string[] = [];
      if (activeLanguage === "Cantonese") {
        fixedQaUsers = ["Phantom65536", "wingspecialist", "york"];
      }

      // Pull all QA usernames that exist in database annotations for this language dataset.
      const dbQaUsers = Array.from(
        new Set(
          (sentenceData || [])
            .flatMap((sentence: any) => Object.keys(sentence?.annotations || {}))
            .filter((key: string) => key.endsWith("_qa"))
            .map((key: string) => key.replace("_qa", ""))
        )
      );

      nextQaUsers = Array.from(new Set([...fixedQaUsers, ...dbQaUsers]));
    }

    setQaUsers(nextQaUsers);

    if (isMandarinComparison) {
      const resolvedPersonA = nextQaUsers.includes(selectedPersonA)
        ? selectedPersonA
        : nextQaUsers[0] || "";
      const fallbackPersonB = nextQaUsers[1] || nextQaUsers[0] || "";
      const resolvedPersonB = nextQaUsers.includes(selectedPersonB)
        ? selectedPersonB
        : fallbackPersonB;

      if (resolvedPersonA !== selectedPersonA) {
        setSelectedPersonA(resolvedPersonA);
      }
      if (resolvedPersonB !== selectedPersonB) {
        setSelectedPersonB(resolvedPersonB);
      }

      // Person A spans (left box)
      const personAKey = resolvedPersonA ? `${resolvedPersonA}_qa` : "";
      const personAAnnotation = currentSentence.annotations?.[personAKey];
      const personASpans: Span[] = personAAnnotation?.annotatedSpans?.map((span: any) => ({
        start_index: span.start_index,
        end_index: span.end_index,
        error_text_segment: span.error_text_segment,
        error_type: span.error_type,
        error_severity: span.error_severity,
      })) || [];

      const personACorrected = personAAnnotation?.corrected_sentence || machineTranslation;
      setAnnotatorCorrectedSentence(personACorrected);
      setHasPersonA(Boolean(personAAnnotation));
      setOriginalAnnotationSpans(copySpanArr(personASpans));

      // Person B spans (right box)
      const personBKey = resolvedPersonB ? `${resolvedPersonB}_qa` : "";
      const personBAnnotation = currentSentence.annotations?.[personBKey];
      const personBSpans: Span[] = personBAnnotation?.annotatedSpans?.map((span: any) => ({
        start_index: span.start_index,
        end_index: span.end_index,
        error_text_segment: span.error_text_segment,
        error_type: span.error_type,
        error_severity: span.error_severity,
      })) || [];

      const personBCorrected = personBAnnotation?.corrected_sentence || machineTranslation;
      setQACorrectedSentence(personBCorrected);
      setHasPersonB(Boolean(personBAnnotation));
      setOriginalQaSpans(copySpanArr(personBSpans));

      const [annotationRemainder, qaRemainder, shared] = getSpanDiffs(personASpans, personBSpans);
      const sharedDisplay = getSharedSpansDisplay(machineTranslation, shared);
      setSharedSpansSentence(sharedDisplay.sentence);
      setDisplaySharedSpans(sharedDisplay.displaySpans);
      setAnnotationSpans(annotationRemainder);
      setQASpans(qaRemainder);
      setSharedSpans(shared);
    } else {
      const defaultQaUser = nextQaUsers.includes(selectedQaUser)
        ? selectedQaUser
        : nextQaUsers.includes(username)
        ? username
        : nextQaUsers[0] || "";

      if (defaultQaUser !== selectedQaUser) {
        setSelectedQaUser(defaultQaUser);
      }

      // Get annotator spans
      const annotatorKey = `${annotator}_annotations`;
      const annotatorAnnotation = currentSentence.annotations?.[annotatorKey];
      const annotatorSpans: Span[] = annotatorAnnotation?.annotatedSpans?.map((span: any) => ({
        start_index: span.start_index,
        end_index: span.end_index,
        error_text_segment: span.error_text_segment,
        error_type: span.error_type,
        error_severity: span.error_severity,
      })) || [];

      const annotatorCorrected = annotatorAnnotation?.corrected_sentence || machineTranslation;
      setAnnotatorCorrectedSentence(annotatorCorrected);
      setOriginalAnnotationSpans(copySpanArr(annotatorSpans));

      // Get QA user spans
      const qaKey = defaultQaUser ? `${defaultQaUser}_qa` : "";
      const qaAnnotation = currentSentence.annotations?.[qaKey];

      let qaUserSpans: Span[] = [];
      let hasQA = false;
      let qaCorrected = machineTranslation;

      if (qaAnnotation && qaAnnotation.annotator === annotator) {
        qaUserSpans = qaAnnotation.annotatedSpans?.map((span: any) => ({
          start_index: span.start_index,
          end_index: span.end_index,
          error_text_segment: span.error_text_segment,
          error_type: span.error_type,
          error_severity: span.error_severity,
        })) || [];

        qaCorrected = qaAnnotation?.corrected_sentence || machineTranslation;
        hasQA = true;
      }

      setQACorrectedSentence(qaCorrected);
      setHasQAForAnnotator(hasQA);
      setOriginalQaSpans(copySpanArr(qaUserSpans));

      const [annotationRemainder, qaRemainder, shared] = getSpanDiffs(annotatorSpans, qaUserSpans);
      const sharedDisplay = getSharedSpansDisplay(machineTranslation, shared);
      setSharedSpansSentence(sharedDisplay.sentence);
      setDisplaySharedSpans(sharedDisplay.displaySpans);
      setAnnotationSpans(annotationRemainder);
      setQASpans(qaRemainder);
      setSharedSpans(shared);
    }
    
    // Clear selection when data changes
    setSelectedSpan(null);
    setMoveButtonPosition(null);
    setHoveredHighlight(null);
    setTooltipPosition(null);
  }, [sentenceData, sentenceID, annotator, username, machineTranslation, selectedQaUser, selectedPersonA, selectedPersonB, activeLanguage]);

  useEffect(() => {
    loadComparisonData();
  }, [loadComparisonData]);

  const convertSpansToHighlightedErrors = (spans: Span[]) => {
    return spans.map(span => ({
      original_text: span.error_text_segment,
      start_index_translation: span.start_index,
      end_index_translation: span.end_index,
      error_type: span.error_type,
      error_severity: span.error_severity,
    }));
  };

  // Handle span hover for tooltip
  const handleSpanHover = (span: HighlightedError, spanIndex: number, event: React.MouseEvent) => {
    setHoveredHighlight(span);
    
    // Position tooltip under span
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setTooltipPosition({
      top: rect.bottom + 10, // Position below the span
      left: rect.left + rect.width / 2 - 75,
    });
  };

  const handleSpanMove = (event: React.MouseEvent) => {
    // tooltip will stay in same position
  };

  const handleSpanLeave = () => {
    setHoveredHighlight(null);
    setTooltipPosition(null);
  };

  // Handle span click
  const handleSpanClick = (span: HighlightedError, spanIndex: number, source: "annotator" | "qa", event: React.MouseEvent) => {
    
    // Find the actual span object
    const sourceSpans = source === "annotator" ? annotationSpans : qaSpans;
    const actualSpan = sourceSpans[spanIndex];
    
    if (!actualSpan) {
      console.log("No actual span found"); 
      return;
    }

    setSelectedSpan({
      span: actualSpan,
      index: spanIndex,
      source: source,
    });

    // Position the move button
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const buttonPosition = {
      top: rect.top - 45, 
      left: rect.left + rect.width / 2 - 75, // Center the button horizontally relative to the span
    };
    
    setMoveButtonPosition(buttonPosition);
  };

  // Handle moving span to agreed upon spans
  const handleMoveToAgreed = () => {
    if (!selectedSpan) return;

    const { span, index, source } = selectedSpan;
    const sourceSpans = source === "annotator" ? originalAnnotationSpans : originalQaSpans;

    // Span indices need to be modified to fit sharedSpansSentence
    adjustMovingSpanIndices(sourceSpans, sharedSpans, span);

    // Add to sharedSpans
    const newSharedSpans = [...sharedSpans, span];
    setSharedSpans(newSharedSpans);

    const sharedDisplay = getSharedSpansDisplay(machineTranslation, newSharedSpans);
    setSharedSpansSentence(sharedDisplay.sentence);
    setDisplaySharedSpans(sharedDisplay.displaySpans);

    // Notify parent component of the change
    onAgreedSpansChange(newSharedSpans);

    // Remove from source spans
    if (source === "annotator") {
      setAnnotationSpans(prev => prev.filter((_, i) => i !== index));
    } else {
      setQASpans(prev => prev.filter((_, i) => i !== index));
    }

    // Clear selection
    setSelectedSpan(null);
    setMoveButtonPosition(null);
  };

  // Handle clicking outside to clear selection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.qa-clickable-span, .qa-move-button, .error-tooltip')) {
        setSelectedSpan(null);
        setMoveButtonPosition(null);
      }
    };

    const handleScroll = () => {
      setSelectedSpan(null);
      setMoveButtonPosition(null);
      setHoveredHighlight(null);
      setTooltipPosition(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Notify parent when shared spans are loaded initially
  useEffect(() => {
    onAgreedSpansChange(sharedSpans);
  }, [sharedSpans, onAgreedSpansChange]);

  const isMandarinComparison = activeLanguage === "Mandarin";
  const leftUserLabel = isMandarinComparison ? selectedPersonA || "N/A" : annotator || "N/A";
  const rightUserLabel = isMandarinComparison ? selectedPersonB || "N/A" : selectedQaUser || "N/A";
  const hasLeftData = isMandarinComparison ? hasPersonA : true;
  const hasRightData = isMandarinComparison ? hasPersonB : hasQAForAnnotator;
  const hasSharedData = isMandarinComparison ? hasPersonA && hasPersonB : hasQAForAnnotator;

  return (
    <div className="qa-comparison-container">
      {isMandarinComparison ? (
        <div className="qa-user-selector qa-person-selectors">
          <div className="qa-person-selector">
            <label htmlFor="qa_person_a_dropdown">QA Span Person A</label>
            <select
              name="qa-person-a-dropdown"
              id="qa_person_a_dropdown"
              value={selectedPersonA}
              onChange={(e) => setSelectedPersonA(e.target.value)}
              disabled={qaUsers.length === 0}
            >
              {qaUsers.length === 0 ? (
                <option value="">No QA users</option>
              ) : (
                qaUsers.map((qaUser) => (
                  <option key={`person-a-${qaUser}`} value={qaUser}>
                    {qaUser}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="qa-person-selector">
            <label htmlFor="qa_person_b_dropdown">QA Span Person B</label>
            <select
              name="qa-person-b-dropdown"
              id="qa_person_b_dropdown"
              value={selectedPersonB}
              onChange={(e) => setSelectedPersonB(e.target.value)}
              disabled={qaUsers.length === 0}
            >
              {qaUsers.length === 0 ? (
                <option value="">No QA users</option>
              ) : (
                qaUsers.map((qaUser) => (
                  <option key={`person-b-${qaUser}`} value={qaUser}>
                    {qaUser}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      ) : (
        <div className="qa-user-selector">
          <label htmlFor="qa_user_dropdown">QA user</label>
          <select
            name="qa-user-dropdown"
            id="qa_user_dropdown"
            value={selectedQaUser}
            onChange={(e) => setSelectedQaUser(e.target.value)}
            disabled={qaUsers.length === 0}
          >
            {qaUsers.length === 0 ? (
              <option value="">No QA users</option>
            ) : (
              qaUsers.map((qaUser) => (
                <option key={qaUser} value={qaUser}>
                  {qaUser}
                </option>
              ))
            )}
          </select>
        </div>
      )}
      {/* Annotator Spans Box */}
      <div className="qa-comparison-box annotator-spans-box">
        <div className="qa-comparison-header">
          <h3>{isMandarinComparison ? "Person A Spans" : "Annotator Spans"} ({leftUserLabel})</h3>
          <span className="span-count">{annotationSpans.length} spans</span>
        </div>
        <div className="qa-comparison-content">
          <div className="qa-comparison-text">
            {hasLeftData ? (
              <QAHighlightedText
                text={annotatorCorrectedSentence}
                highlights={convertSpansToHighlightedErrors(annotationSpans)}
                highlightKey="end_index_translation"
                onSpanClick={(span, spanIndex, event) => 
                  handleSpanClick(span, spanIndex, "annotator", event)
                }
                selectedSpanIndex={
                  selectedSpan?.source === "annotator" ? selectedSpan.index : null
                }
                onSpanHover={handleSpanHover}
                onSpanMove={handleSpanMove}
                onSpanLeave={handleSpanLeave}
              />
            ) : (
              <p className="no-qa-message">
                {leftUserLabel} has no QA spans for this sentence.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* QA Spans Box */}
      <div className="qa-comparison-box qa-spans-box">
        <div className="qa-comparison-header">
          <h3>{isMandarinComparison ? "Person B Spans" : "QA Spans"} ({rightUserLabel})</h3>
          <span className="span-count">{qaSpans.length} spans</span>
        </div>
        <div className="qa-comparison-content">
          <div className="qa-comparison-text">
            {hasRightData ? (
              <QAHighlightedText
                text={qaCorrectedSentence}
                highlights={convertSpansToHighlightedErrors(qaSpans)}
                highlightKey="end_index_translation"
                onSpanClick={(span, spanIndex, event) => 
                  handleSpanClick(span, spanIndex, "qa", event)
                }
                selectedSpanIndex={
                  selectedSpan?.source === "qa" ? selectedSpan.index : null
                }
                onSpanHover={handleSpanHover}
                onSpanMove={handleSpanMove}
                onSpanLeave={handleSpanLeave}
              />
            ) : (
              <p className="no-qa-message">
                {isMandarinComparison
                  ? `${rightUserLabel} has no QA spans for this sentence.`
                  : `${selectedQaUser || "This user"} has not QA'd ${annotator}'s annotations for this sentence.`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Agreed Upon Spans Box */}
      <div className="qa-comparison-box agreed-spans-box">
        <div className="qa-comparison-header">
          <h3>Agreed Upon Spans</h3>
          <span className="span-count">{sharedSpans.length} spans</span>
        </div>
        <div className="qa-comparison-content">
          <div className="qa-comparison-text">
            {hasSharedData ? (
              <QAHighlightedText
                text={sharedSpansSentence}
                highlights={convertSpansToHighlightedErrors(displaySharedSpans)}
                highlightKey="end_index_translation"
                onSpanClick={() => {}} // No click action for agreed spans
                selectedSpanIndex={null}
                onSpanHover={handleSpanHover}
                onSpanMove={handleSpanMove}
                onSpanLeave={handleSpanLeave}
              />
            ) : (
              <p className="no-qa-message">
                {isMandarinComparison
                  ? "No agreed upon spans - select QA spans for Person A and Person B."
                  : `No agreed upon spans - ${selectedQaUser || "this user"} has not QA'd ${annotator}'s annotations.`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredHighlight && tooltipPosition && (
        <div 
          className="error-tooltip" 
          style={{
            position: "fixed",
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            zIndex: 10000,
            maxWidth: "300px",
            whiteSpace: "wrap",
          }}
        >
          <h3 style={{ 
            color: colorMappings[hoveredHighlight.error_type],
            margin: "0 0 4px 0",
            fontSize: "18px",
          }}>
            Error Type: {hoveredHighlight.error_type}
          </h3>
          <div className="error-tooltip-text-display">
            <p
              style={{
                color:
                  hoveredHighlight.error_severity === "Minor"
                    ? "#ffd000"
                    : hoveredHighlight.error_severity === "Major"
                    ? "orange"
                    : "red",
                margin: "2px 0",
                fontSize: "16px"
              }}
            >
              <strong style={{ color: "white" }}>Error Severity:</strong>{" "}
              {hoveredHighlight.error_severity}
            </p>
            <p style={{ margin: "2px 0", fontSize: "16px" }}>
              <strong>Original Text:</strong> {hoveredHighlight.original_text}
            </p>
          </div>
        </div>
      )}

      {/* Move Button */}
      {selectedSpan && moveButtonPosition && (
        <button
          className="qa-move-button"
          style={{
            position: "fixed",
            top: moveButtonPosition.top,
            left: moveButtonPosition.left,
            zIndex: 9999,
            backgroundColor: "#4CAF50",
            color: "white",
            border: "2px solid #fff",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
            transition: "all 0.2s ease",
            minWidth: "150px",
          }}
          onClick={handleMoveToAgreed}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#45a049";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#4CAF50";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Accept
        </button>
      )}
    </div>
  );
};

export default QAComparisonContainer;
