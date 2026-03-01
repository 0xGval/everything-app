import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Widget registrations (side-effect imports)
import '@/widgets/test-widget/config';

import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
