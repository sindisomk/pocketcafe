 import { StrictMode } from "react";
 import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

 // Build version: 2026-02-05-v2 (cache bust)
 createRoot(document.getElementById("root")!).render(
   <StrictMode>
     <App />
   </StrictMode>
 );
