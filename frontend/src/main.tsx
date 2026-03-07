import React from "react";
import ReactDOM from "react-dom/client";
// To switch to previous version, update the line below to 'import App from "./components/App.tsx";'
import App from "./componentsStatic/App.tsx";
import "./index.css";
import { SpanEvalProvider } from "./componentsStatic/SpanEvalProvider.tsx";
import { AnnotationAppProvider } from "./context/AnnotationAppContext.tsx";
import { TextAnnotationProvider } from "./context/TextAnnotationContext.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AnnotationAppProvider>
      <SpanEvalProvider>
        <TextAnnotationProvider>
          <App />
        </TextAnnotationProvider>
      </SpanEvalProvider>
    </AnnotationAppProvider>
  </React.StrictMode>
);
