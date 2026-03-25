import React from "react";
import "../index.css";
import HighlightedText from "./postEdit/HighlightedText";
import { PostEditContainer } from "./postEdit/PostEditContainer";
import { DatabaseSentenceView } from "./scoring/DatabaseSentenceView";
import { useSpanEvalContext } from "./SpanEvalProvider";
import { LoginForm } from "./scoring/LoginForm";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AnnotatorSelectorDropdown } from "./scoring/AnnotatorSelector";
import QAComparisonContainer from "./qa/QAComparisonContainer";
import logo from "../assets/logo.svg";
import { useAnnotationApp } from "../context/AnnotationAppContext";
import { useTextAnnotation } from "../context/TextAnnotationContext";

const App: React.FC = () => {
  const {
    origText: referenceTranslation,
    setOrigText,
    translatedText: machineTranslation,
    setTranslatedText,
    originalSpans: originalHighlightedError,
    errorSpans: highlightedError,
    setErrorSpans,
    diffContent,
    setDiffContent,
    setSpanSeverity,
  } = useSpanEvalContext();

  // Application-level state from context
  const {
    username, setUsername,
    annotator, setAnnotator,
    sentenceID, setSentenceID,
    currentDatabase,
    currentMode,
    forceScroll, setForceScroll,
    sentenceData, setSentenceData,
  } = useAnnotationApp();

  // Text/annotation state from context
  const {
    modifiedText, setModifiedText,
    setAddedErrorSpans,
    overallScore, setOverallScore,
    agreedSpans,
  } = useTextAnnotation();

  const normalizeSpanForSubmission = (span: any) => {
    const error_text_segment = span.error_text_segment ?? span.original_text ?? "";
    const start_index = span.start_index ?? span.start_index_translation;
    const end_index = span.end_index ?? span.end_index_translation;
    const error_type = span.error_type ?? span.errorType ?? "Addition";
    const error_severity = span.error_severity ?? span.errorSeverity ?? "Minor";

    return {
      error_text_segment,
      start_index,
      end_index,
      error_type,
      error_severity,
    };
  };

  // console.log(curEntryIdx);

  // const [diffContent, setDiffContent] =
  //   useState<React.ReactNode>(machineTranslation);

  const handleGoToLastAnnotation = () => {
    // Use different annotation keys based on mode
    let annotationKey;
    let modeText;
    
    if (currentMode === "QA Comparison") {
      annotationKey = "finalized_annotations";
      modeText = "finalized";
    } else if (currentMode === "QA Mode") {
      annotationKey = `${username}_qa`;
      modeText = "QA-ed";
    } else {
      annotationKey = `${username}_annotations`;
      modeText = "annotated";
    }
    
    const lastCompletedIndex = sentenceData
      .map((item, index) => {
        if (!item.annotations || !item.annotations[annotationKey]) {
          return { index, completed: false };
        }
        
        let isCompleted = false;
        if (currentMode === "QA Comparison") {
          isCompleted = item.annotations[annotationKey].qa === username;
        } else if (currentMode === "QA Mode") {
          isCompleted = item.annotations[annotationKey].annotator === annotator;
        } else {
          // Annotation Mode - just needs to exist
          isCompleted = true;
        }
        
        return { index, completed: isCompleted };
      })
      .reverse()
      .find((item) => item.completed);

    if (lastCompletedIndex) {
      const lastUnannotatedSentence =
        sentenceData[lastCompletedIndex.index + 1];
      
      // Check if the next sentence exists
      if (!lastUnannotatedSentence) {
        toast.info(`You've reached the end of the dataset! No more un${modeText} sentences found.`);
        return;
      }
      
      setOrigText(lastUnannotatedSentence.src);
      setTranslatedText(lastUnannotatedSentence.mt);
      setDiffContent(lastUnannotatedSentence.mt);
      setSentenceID(lastUnannotatedSentence._id);
      setModifiedText(lastUnannotatedSentence.mt);

      const which_annotator = currentMode === "QA Comparison" ? annotator : username;
      if (
        which_annotator &&
        lastUnannotatedSentence.annotations &&
        lastUnannotatedSentence.annotations[`${which_annotator}_annotations`]
      ) {
        const prev_annotation = lastUnannotatedSentence.annotations[`${which_annotator}_annotations`];
        const modified_spans = prev_annotation.annotatedSpans.map(span => ({
          ...span,
          original_text: span.error_text_segment,
          start_index_translation: span.start_index,
          end_index_translation: span.end_index,
        }));
        setErrorSpans(modified_spans);
        setAddedErrorSpans(modified_spans);
        setDiffContent(prev_annotation.corrected_sentence);
        setModifiedText(prev_annotation.corrected_sentence);
      } else {
        // Clear if no existing annotations
        setErrorSpans([]);
        setAddedErrorSpans([]);
      }

      // Remove active class from all rows first
      document.querySelectorAll('[class^="db-row-"]').forEach((row) => {
        row.classList.remove("active-db-row");
      });

      // Find the row element that was clicked on
      const rowElement = document.querySelector(
        `.db-row-${lastUnannotatedSentence.id}`
      );

      // Apply highlight to the clicked row
      if (rowElement) {
        rowElement.classList.add("active-db-row");
      }

      // Force scroll to the current sentence
      setForceScroll(true);
      
      // Show success toast 
      toast.success(`Navigated to the next un${modeText} sentence`);
    } else {
      // Show info toast if no more unannotated sentences
      toast.info(`No more un${modeText} sentences found`);
    }
  };

  const handleSubmitAnnotation = () => {
    // Create the annotation object

    // // Scroll to the database viewer
    // const dbViewerElement = document.querySelector(".db-sentence-view");
    // if (dbViewerElement) {
    //   dbViewerElement.scrollIntoView({
    //     behavior: "smooth",
    //     block: "start",
    //   });
    // }

    const selectElement = document.querySelector(".span-score-section select");
    if (selectElement) {
      (selectElement as HTMLElement).style.backgroundColor = "#222222";
      (selectElement as HTMLElement).style.color = "#ffffff";
      (selectElement as HTMLSelectElement).value = "Minor";
    }

    console.log(username);

    let packageHighlightedErrors;

    if (currentMode === "QA Comparison") {
      // Use agreed spans for QA Comparison mode
      packageHighlightedErrors = {
        annotatedSpans: agreedSpans.map(span => ({
          error_text_segment: span.error_text_segment,
          start_index: span.start_index,
          end_index: span.end_index,
          error_type: span.error_type,
          error_severity: span.error_severity,
        })),
        overall_translation_score: overallScore,
        corrected_sentence: modifiedText,
        annotator: annotator,
        qa: username,
      };
    } else {
      // Use highlightedError for other modes
      packageHighlightedErrors = {
        annotatedSpans: highlightedError.map((span) => normalizeSpanForSubmission(span)),
        overall_translation_score: overallScore,
        corrected_sentence: modifiedText,
      };
    }

    console.log(packageHighlightedErrors);

    let annotationKey = `${username}_annotations`;

    if (currentMode === "QA Mode") {
      annotationKey = `${username}_qa`;
      packageHighlightedErrors['annotator'] = annotator;
    } else if (currentMode === "QA Comparison") {
      annotationKey = `finalized_annotations`;
      // annotator and qa are already set above for QA Comparison
    }
    
    const requestBody = {
      dataset: currentDatabase,
      id: sentenceID,
      [annotationKey]: packageHighlightedErrors, // Dynamic key placement
    };

    console.log("requestBody", requestBody);

    // Submit the annotation object
    // Show loading toast
    const toastId = toast.loading("Submitting annotation...");

    fetch(
      "https://translation-correct-annotation-task-dutd.vercel.app/api/submit_annotation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Success:", data);
        // Update the loading toast to a success toast
        toast.update(toastId, {
          render: "Annotation submitted successfully!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
          closeButton: true,
        });

        // After successful submission, find the next unannotated sentence
        const currentIndex = sentenceData.findIndex(
          (item) => item._id === sentenceID
        );
        
        // Use different annotation keys based on mode for finding next sentence
        let nextAnnotationKey;
        if (currentMode === "QA Comparison") {
          nextAnnotationKey = "finalized_annotations";
        } else if (currentMode === "QA Mode") {
          nextAnnotationKey = `${username}_qa`;
        } else {
          nextAnnotationKey = `${username}_annotations`;
        }
        
        const nextSentence = sentenceData
          .slice(currentIndex + 1)
          .find(
            (item) =>
              !item.annotations || !item.annotations[nextAnnotationKey] ||
              (currentMode === "QA Comparison" && 
               item.annotations[nextAnnotationKey].qa !== username)
          );

        if (nextSentence) {
          // Automatically select the next unannotated sentence
          setOrigText(nextSentence.src);
          setTranslatedText(nextSentence.mt);
          setDiffContent(nextSentence.mt);
          setSentenceID(nextSentence._id);
          setModifiedText(nextSentence.mt);
          
          // Check if there are existing annotations for this sentence and annotator
          if ((currentMode === "QA Mode" || currentMode === "QA Comparison") && annotator && nextSentence.annotations && nextSentence.annotations[`${annotator}_annotations`]) {
            // Load existing annotation spans
            const prev_annotation = nextSentence.annotations[`${annotator}_annotations`];
            const modified_spans = prev_annotation.annotatedSpans.map(span => ({
              ...span,
              original_text: span.error_text_segment,
              start_index_translation: span.start_index,
              end_index_translation: span.end_index,
            }));
            setErrorSpans(modified_spans);
            setAddedErrorSpans(modified_spans);
            setDiffContent(prev_annotation.corrected_sentence);
            setModifiedText(prev_annotation.corrected_sentence);
          } else {
            // Clear if no existing annotations
            setErrorSpans([]);
            setAddedErrorSpans([]);
          }
        }

        // Remove active class from all rows first
        document.querySelectorAll('[class^="db-row-"]').forEach((row) => {
          row.classList.remove("active-db-row");
        });

        // Find the row element that was clicked on
        const rowElement = document.querySelector(`.db-row-${nextSentence.id}`);
        // Apply highlight to the clicked row
        if (rowElement) {
          rowElement.classList.add("active-db-row");
        }

        // Reset States
        setOverallScore(50);
        // setSpanSeverity("Minor");
        setSpanSeverity("");
        // setTranslatedText(machineTranslation);

        // Update sentenceData row for live staus update
        console.log("AH", packageHighlightedErrors);
        setSentenceData((prevData) => {
        return prevData.map((row) =>
          row._id === sentenceID
            ? {
                ...row,
                annotations: {
                  ...row.annotations,
                  [annotationKey]: packageHighlightedErrors,
                },
              }
            : row
        );
      });
      })
      .catch((error) => {
        console.error("Error:", error);
        // Update the loading toast to an error toast
        toast.update(toastId, {
          render: `Error submitting annotation: ${error.message}`,
          type: "error",
          isLoading: false,
          autoClose: 5000,
          closeButton: true,
        });
      });
  };
  // **JSX**
  return (
    <div className="body">
      <div className="logo-nav-container">
        <img className="logo_1" src={logo} alt="" />
      </div>
      {/* DB Viewer */}
      <div className="divider"></div>

      <div className="annotate-container">
        {username ? (
          <div className="annotate-container-annotate">
            <DatabaseSentenceView />
            <div className='annotator-selector'>
              {(currentMode === "QA Mode" || currentMode === "QA Comparison") && (
                <AnnotatorSelectorDropdown />
              )}
            </div>
            <div className="go-to-last-annotated-button-container">
              <button
                className="go-to-last-annotated-button"
                onClick={handleGoToLastAnnotation}
              >
                {currentMode === "QA Comparison" ? "Go To Last Finalized" : 
                 (currentMode === "QA Mode") ? "Go To Last QA-ed" : "Go To Last Annotated"}
              </button>
            </div>
            <div className="divider"></div>
            <div className="source-mt-sentence-display">
              <div className="source-sentence-display-text">
                <h3>Source</h3>
                <HighlightedText
                  text={referenceTranslation}
                  // text={machineTranslation}
                  highlights={originalHighlightedError!}
                  highlightKey="end_index_orig"
                  disableEdit={true}
                />
              </div>
              <div className="machine-translation-display-text">
                <h3>Machine Translation</h3>
                <div className="machine-translation-output">
                  {diffContent && (
                    <HighlightedText
                      text={diffContent}
                      // text={machineTranslation}
                      highlights={originalHighlightedError!}
                      highlightKey="end_index_translation"
                      disableEdit={true}
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="divider"></div>
            {/* Scoring Section */}
            {/* <ScoringContainer
              overallScore={overallScore}
              setOverallScore={setOverallScore}
            /> */}

            {/* Post Edit Section - hide if QA Comparison mode */}
            {currentMode !== "QA Comparison" && (
              <PostEditContainer />
            )}

            {/* QA Comparison Section - only show in QA Comparison mode */}
            {currentMode === "QA Comparison" && (
              <QAComparisonContainer />
            )}

            {/* Translation Submission Section */}
            <div className="accept-translation-section">
              {/* <button onClick={() => setEntryIdx(curEntryIdx + 1)}> */}
              <button onClick={() => handleSubmitAnnotation()}>
                {(currentMode === "QA Mode" || currentMode === "QA Comparison") ? "Submit QA" : "Submit Annotation"}
              </button>
            </div>
          </div>
        ) : (
          <div className="annotate-container-login">
            <LoginForm />
          </div>
        )}

        <div className="footer">
          <div className="divider"></div>
          <div>
            {/* <button className="reset-entry-button" onClick={() => setEntryIdx(0)}>
          Restart to entry #0
          </button> */}
          </div>
          <div className="send-feedback">
            <a>Send Feedback</a>
          </div>
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
};

export default App;
