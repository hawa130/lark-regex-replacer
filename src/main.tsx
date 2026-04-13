import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { RegexReplacer } from "./components/regex-replacer"

import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RegexReplacer />
  </StrictMode>,
)
