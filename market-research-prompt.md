# Market Research Prompt — TideLearn Viability Analysis

> Copy-paste the prompt below into ChatGPT (Deep Research) or Gemini (Deep Research).

---

## Prompt

I'm building an e-learning course authoring tool called **TideLearn** and I need a thorough market viability analysis. Below is a detailed description of the product, its features, and positioning. Please conduct deep research into the e-learning authoring tool landscape and deliver a comprehensive report.

---

### About TideLearn

TideLearn is a **block-based e-learning course authoring platform** built by an L&D (Learning & Development) professional for L&D professionals. It is a web app (React + Supabase) with an MCP server for AI agent integration. The product philosophy is **"content is king"** — a calm, minimal interface that stays out of the way so course content shines.

**Target users:** Corporate L&D professionals, instructional designers, university/K-12 educators, and subject matter experts who need to build structured online courses.

**Planned hosting:** Cloudflare Pages (frontend), Fly.io (MCP server), Supabase (database + auth + storage). Domain: tidelearn.app.

---

### Core Features

**1. Block-Based Course Editor (29 block types)**
Authors compose lessons by dragging and dropping content blocks. No code required. Block categories:

- **Text & content:** Heading, Rich Text (HTML via Tiptap), Code (syntax-highlighted), Quote, List, Divider, Callout (info/success/warning/danger)
- **Media:** Image, Video (YouTube/Vimeo/MP4), Audio (MPEG/WAV), Document (PDF/DOCX/XLSX/PPTX), Embed (iFrame)
- **Interactive/structural:** Accordion, Tabs, Timeline, Process (step-by-step), Hotspot Image (clickable annotations on images)
- **Knowledge checks:** Quiz (MCQ), True/False, Short Answer, Multiple Response, Fill in the Blank, Matching, Sorting, Flashcard
- **Navigation/special:** Table of Contents, Button/CTA, Branching Scenario (choice-based with outcomes), Chart (bar/line/pie)

**2. Assessment Lessons with Spaced Repetition**
Dedicated assessment lessons (separate from content lessons) support 5 auto-graded question types: MCQ, Multiple Response, Fill in the Blank, Matching, and Sorting. A built-in **Leitner 4-box spaced repetition algorithm** tracks learner performance and surfaces weak areas over time. Assessment config includes passing scores and exam sizing.

**3. SCORM 1.2 Export**
One-click download of a standards-compliant SCORM 1.2 ZIP package. Compatible with Moodle, Canvas, Talent LMS, Brightspace, and any SCORM-compliant LMS. This is critical for corporate L&D where LMS upload is a hard requirement.

**4. Instant Publishing**
One click generates a shareable URL (tidelearn.app/view?id=...). Courses can be embedded on Google Sites or shared directly. No LMS required for lightweight distribution.

**5. Cloud Sync + Offline Capability**
Dual storage: localStorage for instant saves and offline work, Supabase PostgreSQL for persistent cloud sync. Google OAuth authentication. Pick up on any device.

**6. AI Integration via Model Context Protocol (MCP)**
Rather than baking "generate with AI" buttons into the UI, TideLearn exposes a **33-tool MCP server** that any MCP-compatible AI agent (Claude, etc.) can use to create, edit, and manage courses programmatically. Tools cover: course CRUD, lesson management, block operations, assessment management, semantic analysis (gap detection, coverage review, reading time estimation), HTML preview generation, and media uploads. This positions TideLearn as a **structural layer for AI-augmented authoring** — the human (or AI agent) does the thinking; TideLearn does the persisting and rendering.

**7. Guided Instructional Design Workflow**
A 9-step professional workflow (documented, not UI-enforced) guides authors from discovery through publish:
1. Discovery (performance gap analysis, audience, constraints)
2. Learning objectives + knowledge structure (KUD mapping)
3. Content curation + media inventory
4. Lesson planning (backwards design, spaced practice, hinge questions)
5. SME approval gate
6. Content development (explicit instruction sequencing, worked examples)
7. Build in TideLearn (MCP-driven or manual)
8. Quality audit (cognitive load, assessment validity, differentiation)
9. Publish + final SME approval

**8. Design System ("Rockpool")**
Professional dark-themed UI with DM Sans (body) + Lora (display) typography, teal accent (#40c8a0), WCAG AA accessibility throughout, keyboard navigation, skip-to-content links, aria-live regions. Designed to reduce cognitive load.

---

### What TideLearn Is NOT

- Not an AI-first authoring tool (AI integration is protocol-based and structural, not magical one-click generation)
- Not a learning analytics platform (no dashboards or learner tracking beyond spaced repetition)
- Not a marketplace (no course-as-a-service or content library)
- Not a live instruction tool (asynchronous e-learning only)
- Not an enterprise SaaS (currently a personal/indie project)

---

### Research Questions

Please investigate and report on the following:

**1. Market Landscape**
- What is the current state of the e-learning authoring tool market (2024-2026)? Size, growth rate, key trends.
- Who are the major players? (e.g., Articulate Storyline/Rise, Adobe Captivate, iSpring, Lectora, Elucidat, Easygenerator, Dominknow, Chameleon Creator, isEazy, Gomo). For each, summarize their pricing, target market, strengths, and weaknesses.
- What new or emerging competitors have appeared recently, especially AI-native authoring tools? (e.g., Courseau, Mindsmith, Lingio, Disco, SlidesAI, etc.)

**2. Competitive Positioning**
- How does TideLearn's feature set compare to existing tools? Where does it overlap, and where does it differentiate?
- Is "MCP-based AI integration" (protocol-level, not baked-in AI buttons) a meaningful differentiator or a liability? Do buyers want integrated AI or composable AI?
- Is "built by an L&D professional" a credible positioning angle, or is it table stakes?
- How important is SCORM export in 2025-2026? Is xAPI/cmi5 overtaking it? Does SCORM 1.2 (vs 2004) matter?
- Does the spaced repetition angle differentiate TideLearn, or is this feature common in competitors?

**3. Target Market Viability**
- What is the realistic addressable market for an indie/bootstrapped e-learning authoring tool?
- Which user segment is most likely to adopt: corporate L&D, higher ed, K-12, freelance instructional designers, SMEs?
- What are the common buying criteria for authoring tools in corporate L&D? (e.g., SCORM compliance, collaboration, review workflows, branding, analytics, SSO, etc.)
- What are the deal-breakers or table-stakes features that TideLearn currently lacks?

**4. Pricing & Business Model**
- What do comparable tools charge? Map the pricing landscape from free/freemium to enterprise.
- What pricing model would be viable for TideLearn? (Per-seat, per-course, freemium, one-time, usage-based?)
- Is there a viable niche for a low-cost/free tool that competes on simplicity and AI composability?

**5. Threats & Risks**
- What is the risk of LMS platforms (Canvas, Moodle, Google Classroom) building native authoring into their platforms, making standalone tools obsolete?
- What is the risk of AI-native tools (Courseau, Mindsmith, etc.) capturing the market with one-click course generation?
- What is the risk of large incumbents (Articulate, Adobe) adding AI features that neutralize TideLearn's positioning?
- How defensible is the MCP integration angle? Could competitors adopt MCP trivially?

**6. Go-to-Market Considerations**
- What distribution channels work for indie authoring tools? (Product Hunt, L&D communities, LinkedIn, YouTube tutorials, etc.)
- Are there L&D communities, conferences, or influencers that would be relevant?
- What would a realistic launch strategy look like for a solo-developer product?

**7. Strategic Recommendations**
- Based on your research, is TideLearn viable as a product? Under what conditions?
- What features should be prioritized to maximize market fit?
- What features should be explicitly deprioritized or avoided?
- What is the most promising positioning strategy?
- What are the top 3 things the developer should do in the next 6 months?

---

### Output Format

Please structure your report with clear sections matching the research questions above. Include:
- Specific competitor names, pricing, and feature comparisons where possible
- Market size data with sources
- Direct, honest assessment — not cheerleading. If the product isn't viable, say so and explain why.
- Actionable recommendations, not vague advice.

---
