import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Widget registrations (side-effect imports)
import '@/widgets/daily-tasks/config';
import '@/widgets/craving-control/config';
import '@/widgets/voice-recorder/config';

import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
