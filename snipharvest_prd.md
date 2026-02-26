# Product Requirements Document: SnipHarvest

**Version:** 1.0  
**Date:** February 25, 2026  
**Status:** Draft  
**Document Owner:** Product Team

---

## 1. Executive Summary

### 1.1 Product Overview
SnipHarvest is a Chrome extension that enables users to capture, organize, and manage text snippets from web pages. Users can highlight text on any webpage, save it with full context preservation, and access their collection through an intuitive interface that maintains links to original sources.

### 1.2 Vision
To become the essential tool for knowledge workers, researchers, students, and content creators who need to harvest valuable information from the web while maintaining context and source attribution.

### 1.3 Success Metrics
- 10,000 active users within 6 months of launch
- Average of 15 snippets saved per active user per week
- 4.5+ star rating on Chrome Web Store
- 70% user retention rate after 30 days

---

## 2. Product Goals & Objectives

### 2.1 Primary Goals
1. Enable effortless text capture from any webpage with one click
2. Preserve context and source information for every snippet
3. Provide fast, intuitive search and organization of saved snippets
4. Ensure data privacy and user control over their content

### 2.2 Success Criteria
- Users can save a snippet in under 3 seconds
- 95% of snippets retain accurate context and source information
- Search returns relevant results in under 1 second
- Zero data breaches or privacy incidents

---

## 3. User Personas

### 3.1 Primary Persona: Research Rachel
- **Role:** Graduate student / Academic researcher
- **Age:** 24-35
- **Behavior:** Reads 20+ articles per week, takes extensive notes, writes research papers
- **Pain Points:** Losing track of sources, manual copy-paste workflow, difficulty organizing research
- **Goals:** Efficiently collect research material, maintain proper citations, quick retrieval of information

### 3.2 Secondary Persona: Content Creator Chris
- **Role:** Writer / Blogger / Journalist
- **Age:** 28-45
- **Behavior:** Consumes diverse content daily, curates inspiration, creates original content
- **Pain Points:** Information overload, scattered bookmarks, losing interesting quotes
- **Goals:** Build a personal knowledge base, find inspiration quickly, attribute sources properly

### 3.3 Tertiary Persona: Professional Pete
- **Role:** Knowledge worker / Consultant
- **Age:** 30-50
- **Behavior:** Monitors industry trends, prepares reports and presentations
- **Pain Points:** Difficulty tracking competitive intelligence, inefficient information gathering
- **Goals:** Stay informed, share insights with team, create compelling presentations

---

## 4. Functional Requirements

### 4.1 Text Selection & Capture (P0 - Critical)

#### FR-1.1: Text Selection Detection
- **Description:** System must detect when user selects text on any webpage
- **Acceptance Criteria:**
  - Selection works on all standard HTML text elements
  - Minimum 3 characters required for selection
  - Works on dynamically loaded content (SPAs)
- **Priority:** P0

#### FR-1.2: Capture Action Trigger
- **Description:** Display capture interface when text is selected
- **Acceptance Criteria:**
  - Floating button appears within 0.3 seconds of selection
  - Button positioned near selected text without obscuring content
  - Alternative: Right-click context menu option "Save to SnipHarvest"
- **Priority:** P0

#### FR-1.3: Snippet Capture
- **Description:** Save selected text with metadata on user action
- **Acceptance Criteria:**
  - Capture exact selected text (up to 5,000 characters)
  - Record page URL, page title, timestamp
  - Extract surrounding context (500 characters before/after)
  - Generate unique snippet ID
  - Store successfully within 1 second
- **Priority:** P0

#### FR-1.4: Capture Confirmation
- **Description:** Provide immediate feedback on successful save
- **Acceptance Criteria:**
  - Toast notification appears for 2 seconds
  - Notification includes snippet preview and "View" link
  - Option to undo within 5 seconds
- **Priority:** P0

### 4.2 Storage & Data Management (P0 - Critical)

#### FR-2.1: Local Storage
- **Description:** Store snippets in browser's local storage
- **Acceptance Criteria:**
  - Use Chrome Storage API (chrome.storage.local)
  - Support up to 10,000 snippets
  - Data persists across browser sessions
  - Storage optimized for quick retrieval (<100ms)
- **Priority:** P0

#### FR-2.2: Data Structure
- **Description:** Standardized schema for snippet storage
- **Required Fields:**
  - `id` (string, UUID)
  - `text` (string, max 5,000 chars)
  - `url` (string)
  - `pageTitle` (string)
  - `context` (string, max 1,000 chars)
  - `timestamp` (ISO 8601 datetime)
  - `createdDate` (ISO 8601 date)
- **Optional Fields:**
  - `tags` (array of strings)
  - `notes` (string, max 2,000 chars)
  - `color` (string, hex code)
  - `isFavorite` (boolean)
  - `folderId` (string)
- **Priority:** P0

#### FR-2.3: Data Persistence
- **Description:** Ensure data integrity and prevent data loss
- **Acceptance Criteria:**
  - Automatic save on capture
  - No data loss during browser crashes
  - Graceful handling of storage quota exceeded
- **Priority:** P0

### 4.3 Popup Interface (P0 - Critical)

#### FR-3.1: Snippet List View
- **Description:** Display all saved snippets in main popup
- **Acceptance Criteria:**
  - List view with card layout
  - Show snippet preview (first 150 characters)
  - Display source (favicon + truncated page title)
  - Show capture date (relative time: "2 days ago")
  - Pagination or infinite scroll (20 snippets per page)
  - Empty state for new users
- **Priority:** P0

#### FR-3.2: Snippet Detail View
- **Description:** Show full snippet information
- **Acceptance Criteria:**
  - Display complete selected text
  - Show full context (expandable/collapsible)
  - Clickable link to original page URL
  - Display full page title and timestamp
  - "Copy" button for snippet text
  - Edit and delete actions
- **Priority:** P0

#### FR-3.3: Search Functionality
- **Description:** Enable users to search through snippets
- **Acceptance Criteria:**
  - Search bar at top of popup
  - Real-time search as user types
  - Search through snippet text, page titles, URLs, and tags
  - Highlight matching terms in results
  - "No results" message when applicable
- **Priority:** P0

#### FR-3.4: Basic Actions
- **Description:** Enable CRUD operations on snippets
- **Acceptance Criteria:**
  - Delete snippet with confirmation dialog
  - Edit snippet text (preserve original in history)
  - Copy snippet to clipboard
  - Open original URL in new tab
  - All actions complete within 1 second
- **Priority:** P0

### 4.4 Organization Features (P1 - High)

#### FR-4.1: Tags System
- **Description:** Allow users to tag snippets for organization
- **Acceptance Criteria:**
  - Add multiple tags per snippet
  - Autocomplete from existing tags
  - Filter by tag from sidebar or dropdown
  - Tag management (rename, delete, merge)
  - Visual tag indicators on snippet cards
- **Priority:** P1

#### FR-4.2: Favorites/Starred
- **Description:** Mark important snippets
- **Acceptance Criteria:**
  - Star/unstar toggle on snippet cards
  - Filter view to show only favorites
  - Star icon visible in list view
- **Priority:** P1

#### FR-4.3: Sorting Options
- **Description:** Allow users to sort snippet list
- **Acceptance Criteria:**
  - Sort by: Date (newest/oldest), Page title (A-Z), Relevance
  - Persist sort preference
  - Dropdown selector in header
- **Priority:** P1

#### FR-4.4: Folders/Collections
- **Description:** Organize snippets into folders
- **Acceptance Criteria:**
  - Create, rename, delete folders
  - Move snippets between folders
  - Sidebar navigation for folders
  - One snippet can belong to one folder
  - "Uncategorized" default folder
- **Priority:** P1

### 4.5 Context Preservation (P1 - High)

#### FR-5.1: Context Extraction
- **Description:** Capture surrounding text for context
- **Acceptance Criteria:**
  - Extract 500 characters before and after selection
  - Respect paragraph boundaries when possible
  - Handle edge cases (snippet at page start/end)
  - Strip HTML tags but preserve line breaks
- **Priority:** P1

#### FR-5.2: Context Display
- **Description:** Show context in detail view
- **Acceptance Criteria:**
  - Highlight the actual snippet within context
  - Truncate with "..." if context is very long
  - Expandable/collapsible context section
  - Clean, readable formatting
- **Priority:** P1

### 4.6 Export & Backup (P1 - High)

#### FR-6.1: Export All Snippets
- **Description:** Allow users to export their entire collection
- **Acceptance Criteria:**
  - Export as JSON format
  - Export as Markdown format
  - Export as CSV format
  - Include all metadata in export
  - Downloadable file with timestamp in filename
- **Priority:** P1

#### FR-6.2: Import Snippets
- **Description:** Allow users to import previously exported data
- **Acceptance Criteria:**
  - Support JSON format import
  - Validate file structure before import
  - Handle duplicate snippets (skip or merge)
  - Show import progress and results
- **Priority:** P1

### 4.7 Settings & Preferences (P2 - Medium)

#### FR-7.1: Options Page
- **Description:** Provide settings configuration
- **Acceptance Criteria:**
  - Default highlight color selection
  - Keyboard shortcut customization
  - Context length preference (100-1000 chars)
  - Auto-tag suggestions toggle
  - Export/import access
- **Priority:** P2

#### FR-7.2: Appearance Settings
- **Description:** Customize UI appearance
- **Acceptance Criteria:**
  - Light/dark theme toggle
  - Font size adjustment
  - Compact/comfortable view density
- **Priority:** P2

### 4.8 Advanced Features (P3 - Nice to Have)

#### FR-8.1: Cross-Device Sync
- **Description:** Sync snippets across Chrome browsers
- **Acceptance Criteria:**
  - Use chrome.storage.sync API
  - Automatic sync when online
  - Sync status indicator
  - Handle sync conflicts (last write wins)
- **Priority:** P3

#### FR-8.2: Share Snippets
- **Description:** Share individual snippets with others
- **Acceptance Criteria:**
  - Generate shareable link
  - Copy snippet with attribution to clipboard
  - Email snippet option
- **Priority:** P3

#### FR-8.3: Bulk Actions
- **Description:** Perform actions on multiple snippets
- **Acceptance Criteria:**
  - Select multiple snippets (checkbox)
  - Bulk delete, tag, move to folder
  - Select all/deselect all options
- **Priority:** P3

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **NFR-1:** Snippet capture must complete within 1 second
- **NFR-2:** Popup must load within 500ms
- **NFR-3:** Search results must appear within 1 second
- **NFR-4:** Support up to 10,000 stored snippets without performance degradation

### 5.2 Usability
- **NFR-5:** Interface must be intuitive for first-time users (no tutorial required)
- **NFR-6:** All primary actions accessible within 2 clicks
- **NFR-7:** Keyboard navigation support for power users
- **NFR-8:** Responsive design for different popup window sizes

### 5.3 Compatibility
- **NFR-9:** Support Chrome version 90+
- **NFR-10:** Work on all standard webpages (HTML, not PDFs initially)
- **NFR-11:** Compatible with major websites (Google, Wikipedia, Medium, etc.)
- **NFR-12:** Handle Single Page Applications (React, Vue, Angular sites)

### 5.4 Security & Privacy
- **NFR-13:** All data stored locally on user's device
- **NFR-14:** No data transmitted to external servers
- **NFR-15:** Comply with Chrome Web Store privacy policies
- **NFR-16:** Clear privacy policy stating data practices
- **NFR-17:** Request minimal necessary permissions

### 5.5 Reliability
- **NFR-18:** 99.5% uptime (extension must not crash)
- **NFR-19:** Graceful error handling with user-friendly messages
- **NFR-20:** Data backup/export available to prevent data loss

### 5.6 Maintainability
- **NFR-21:** Modular code architecture for easy updates
- **NFR-22:** Comprehensive error logging for debugging
- **NFR-23:** Automated testing coverage >70%

---

## 6. User Interface Requirements

### 6.1 Capture Interface
- **Design:** Floating circular button with save icon
- **Colors:** Primary brand color with subtle drop shadow
- **Size:** 48x48px, doesn't overlap with page content
- **Animation:** Fade in (200ms), pulse on hover

### 6.2 Popup Window
- **Dimensions:** Default 400px width x 600px height
- **Layout:** Header (search + actions), main content area, footer (settings)
- **Responsive:** Adapts to window resize
- **Theme:** Light mode default, dark mode optional

### 6.3 Snippet Cards
- **Layout:** Title (page), preview text, metadata footer
- **Actions:** Hover reveals quick actions (copy, delete, favorite)
- **Spacing:** 16px padding, 8px margin between cards
- **Typography:** 14px body text, 12px metadata

### 6.4 Detail Modal
- **Overlay:** Semi-transparent backdrop
- **Content:** Full snippet text, context section, metadata, actions
- **Width:** 80% of popup width, max 600px
- **Close:** X button top-right, ESC key, click outside

---

## 7. Technical Architecture

### 7.1 Component Structure
```
snipharvest/
├── manifest.json
├── background/
│   └── service-worker.js
├── content/
│   ├── content-script.js
│   └── content-styles.css
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html
│   ├── options.js
│   └── options.css
├── utils/
│   ├── storage.js
│   ├── context-extractor.js
│   └── helpers.js
└── assets/
    ├── icons/
    └── images/
```

### 7.2 Key Technologies
- **Language:** JavaScript (ES6+)
- **APIs:** Chrome Extension APIs (storage, tabs, scripting, contextMenus)
- **Storage:** chrome.storage.local for primary storage
- **Build Tool:** Webpack or Vite for bundling
- **Testing:** Jest for unit tests, Puppeteer for E2E tests

### 7.3 Data Flow
1. User selects text → Content script detects selection
2. User clicks capture button → Content script sends message to background
3. Background script extracts metadata and context
4. Background script saves to chrome.storage.local
5. Confirmation sent back to content script
6. User opens popup → Popup loads data from storage
7. User searches/filters → Popup queries storage and updates view

---

## 8. Constraints & Assumptions

### 8.1 Constraints
- Chrome Web Store policies and guidelines must be followed
- Storage limited by chrome.storage.local quota (approximately 10MB)
- Cannot access content on restricted pages (chrome://, chrome-extension://)
- Cannot inject scripts on Chrome Web Store pages
- Must request appropriate permissions in manifest

### 8.2 Assumptions
- Users have Chrome browser version 90+
- Users have basic understanding of browser extensions
- Users want to save text content (not images/video initially)
- Users value privacy and prefer local storage over cloud sync (initially)
- Most users will save 10-100 snippets (not thousands)

---

## 9. Risks & Mitigation

### 9.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Dynamic content not captured properly | High | Medium | Implement MutationObserver, extensive testing on SPAs |
| Storage quota exceeded | Medium | Low | Implement storage monitoring, offer export/cleanup tools |
| Performance degradation with many snippets | Medium | Medium | Implement pagination, lazy loading, indexed search |
| Conflicts with other extensions | Low | Medium | Use unique CSS classes, namespaced functions |

### 9.2 Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low user adoption | High | Medium | Marketing campaign, demo videos, free tier with premium features |
| Negative reviews from bugs | High | Low | Thorough testing, beta program, quick response to issues |
| Feature bloat reducing usability | Medium | Medium | Strict prioritization, user testing, progressive disclosure |
| Competition from similar tools | Medium | High | Differentiate on UX, context preservation, speed |

---

## 10. Success Metrics & KPIs

### 10.1 Adoption Metrics
- **Installs:** 10,000 in first 6 months
- **Active Users (DAU):** 30% of installs
- **Retention:** 70% after 30 days, 50% after 90 days

### 10.2 Engagement Metrics
- **Snippets per User:** Average 15/week for active users
- **Feature Usage:** 80% use search, 60% use tags, 40% use export
- **Session Duration:** Average 3 minutes in popup per session

### 10.3 Quality Metrics
- **Rating:** Maintain 4.5+ stars on Chrome Web Store
- **Crash Rate:** <0.1% of sessions
- **Support Tickets:** <5% of users contact support
- **Bug Resolution Time:** 95% resolved within 1 week

### 10.4 Performance Metrics
- **Capture Time:** 95% complete within 1 second
- **Search Speed:** 95% return results within 1 second
- **Popup Load Time:** 95% load within 500ms

---

## 11. Release Plan

### 11.1 Phase 1 - MVP (Weeks 1-6)
**Features:**
- Text selection and capture (FR-1.x)
- Basic storage (FR-2.x)
- Simple popup list view (FR-3.1, FR-3.2)
- Search functionality (FR-3.3)
- Basic CRUD operations (FR-3.4)

**Goal:** Validate core concept with early adopters

### 11.2 Phase 2 - Organization (Weeks 7-10)
**Features:**
- Tags system (FR-4.1)
- Favorites (FR-4.2)
- Sorting (FR-4.3)
- Enhanced context display (FR-5.x)

**Goal:** Improve organization and usability

### 11.3 Phase 3 - Power Features (Weeks 11-14)
**Features:**
- Folders/collections (FR-4.4)
- Export/Import (FR-6.x)
- Settings page (FR-7.x)
- Keyboard shortcuts

**Goal:** Support power users and data portability

### 11.4 Phase 4 - Polish & Scale (Weeks 15-18)
**Features:**
- Performance optimization
- Advanced search filters
- Bulk actions (FR-8.3)
- Cross-device sync (FR-8.1) - optional

**Goal:** Scale to larger user base

---

## 12. Open Questions

1. Should we support collaborative features (sharing, teams) in future versions?
2. What's the optimal context length - 500 chars or user-configurable?
3. Should we support snippet annotations/highlights within the snippet text?
4. Do we need integration with note-taking apps (Notion, Evernote) in v1?
5. Should export include formatting options (PDF, Word)?
6. Is there demand for mobile companion app or just focus on desktop?
7. Should we implement AI features (summarization, tagging suggestions)?

---

## 13. Appendices

### 13.1 Glossary
- **Snippet:** A saved portion of text captured from a webpage
- **Context:** The surrounding text before and after a snippet
- **Metadata:** Information about a snippet (URL, date, tags, etc.)
- **Content Script:** JavaScript that runs in the context of web pages
- **Service Worker:** Background script that handles extension logic

### 13.2 References
- Chrome Extension Documentation: https://developer.chrome.com/docs/extensions/
- Chrome Storage API: https://developer.chrome.com/docs/extensions/reference/storage/
- Web Store Policies: https://developer.chrome.com/docs/webstore/program-policies/

### 13.3 Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Feb 25, 2026 | Product Team | Initial draft |

---

**Document Status:** Ready for Review  
**Next Steps:** Technical feasibility assessment, design mockups, sprint planning