import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { UiDialogProvider } from "./ui-dialog";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <UiDialogProvider>
      <App />
    </UiDialogProvider>
  </React.StrictMode>,
);
